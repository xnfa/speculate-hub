import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';

/**
 * 使用 LMSR (Logarithmic Market Scoring Rule) 算法
 *
 * 这是预测市场最常用的自动做市商算法，由 Robin Hanson 提出。
 *
 * Cost Function: C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
 *
 * 其中：
 * - q_yes: 已售出的 YES 份额总数
 * - q_no: 已售出的 NO 份额总数
 * - b: 流动性参数（控制价格敏感度）
 *
 * 价格计算：
 * - P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 * - P(NO) = e^(q_no/b) / (e^(q_yes/b) + e^(q_no/b))
 *
 * 特点：
 * - 价格总是在 0 到 1 之间
 * - P(YES) + P(NO) = 1
 * - 当 q_yes = q_no 时，价格为 0.5
 */

export interface AMMState {
  yesShares: number;  // 已售出的 YES 份额
  noShares: number;   // 已售出的 NO 份额
}

export interface TradeResult {
  sharesReceived: number;
  cost: number;
  avgPrice: number;
  newYesShares: number;
  newNoShares: number;
  priceImpact: number;
}

export interface SellResult {
  amountReceived: number;
  avgPrice: number;
  newYesShares: number;
  newNoShares: number;
  priceImpact: number;
}

@Injectable()
export class AMMService {
  // 交易费率 (2%)
  private readonly FEE_RATE = 0.02;

  // 默认流动性参数 b
  // 较大的 b 意味着更多流动性，价格变化更平缓
  private readonly DEFAULT_LIQUIDITY = 100;

  /**
   * LMSR 成本函数
   * C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
   */
  private cost(qYes: Decimal, qNo: Decimal, b: Decimal): Decimal {
    const expYes = qYes.div(b).exp();
    const expNo = qNo.div(b).exp();
    return b.mul(expYes.plus(expNo).ln());
  }

  /**
   * 获取当前价格
   * P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
   */
  getCurrentPrices(state: AMMState, liquidity?: number): { yesPrice: number; noPrice: number } {
    const b = new Decimal(liquidity || this.DEFAULT_LIQUIDITY);
    const qYes = new Decimal(state.yesShares);
    const qNo = new Decimal(state.noShares);

    const expYes = qYes.div(b).exp();
    const expNo = qNo.div(b).exp();
    const sum = expYes.plus(expNo);

    const yesPrice = expYes.div(sum);
    const noPrice = expNo.div(sum);

    return {
      yesPrice: Number(yesPrice.toFixed(6)),
      noPrice: Number(noPrice.toFixed(6)),
    };
  }

  /**
   * 计算买入成本
   * 成本 = C(q_yes + shares, q_no) - C(q_yes, q_no) （对于 YES）
   */
  calculateBuyCost(
    state: AMMState,
    side: 'yes' | 'no',
    shares: number,
    liquidity?: number,
  ): TradeResult {
    const b = new Decimal(liquidity || this.DEFAULT_LIQUIDITY);
    const qYes = new Decimal(state.yesShares);
    const qNo = new Decimal(state.noShares);
    const deltaShares = new Decimal(shares);

    // 当前成本
    const currentCost = this.cost(qYes, qNo, b);

    // 新的份额状态
    let newQYes: Decimal;
    let newQNo: Decimal;

    if (side === 'yes') {
      newQYes = qYes.plus(deltaShares);
      newQNo = qNo;
    } else {
      newQYes = qYes;
      newQNo = qNo.plus(deltaShares);
    }

    // 新成本
    const newCost = this.cost(newQYes, newQNo, b);

    // 买入成本 = 新成本 - 旧成本
    const rawCost = newCost.minus(currentCost);

    // 加上手续费
    const fee = rawCost.mul(this.FEE_RATE);
    const totalCost = rawCost.plus(fee);

    // 平均价格
    const avgPrice = totalCost.div(deltaShares);

    // 价格影响
    const oldPrices = this.getCurrentPrices(state, liquidity);
    const newState = {
      yesShares: newQYes.toNumber(),
      noShares: newQNo.toNumber(),
    };
    const newPrices = this.getCurrentPrices(newState, liquidity);

    const priceImpact = side === 'yes'
      ? (newPrices.yesPrice - oldPrices.yesPrice) / oldPrices.yesPrice
      : (newPrices.noPrice - oldPrices.noPrice) / oldPrices.noPrice;

    return {
      sharesReceived: shares,
      cost: Number(totalCost.toFixed(6)),
      avgPrice: Number(avgPrice.toFixed(6)),
      newYesShares: newQYes.toNumber(),
      newNoShares: newQNo.toNumber(),
      priceImpact: Math.abs(priceImpact),
    };
  }

  /**
   * 计算卖出收益
   * 收益 = C(q_yes, q_no) - C(q_yes - shares, q_no) （对于 YES）
   */
  calculateSellReturn(
    state: AMMState,
    side: 'yes' | 'no',
    shares: number,
    liquidity?: number,
  ): SellResult {
    const b = new Decimal(liquidity || this.DEFAULT_LIQUIDITY);
    const qYes = new Decimal(state.yesShares);
    const qNo = new Decimal(state.noShares);
    const deltaShares = new Decimal(shares);

    // 检查是否有足够的份额可以卖出
    if (side === 'yes' && deltaShares.gt(qYes)) {
      throw new Error('市场中没有足够的 YES 份额');
    }
    if (side === 'no' && deltaShares.gt(qNo)) {
      throw new Error('市场中没有足够的 NO 份额');
    }

    // 当前成本
    const currentCost = this.cost(qYes, qNo, b);

    // 新的份额状态
    let newQYes: Decimal;
    let newQNo: Decimal;

    if (side === 'yes') {
      newQYes = qYes.minus(deltaShares);
      newQNo = qNo;
    } else {
      newQYes = qYes;
      newQNo = qNo.minus(deltaShares);
    }

    // 确保份额不会变成负数
    if (newQYes.lt(0)) newQYes = new Decimal(0);
    if (newQNo.lt(0)) newQNo = new Decimal(0);

    // 新成本
    const newCost = this.cost(newQYes, newQNo, b);

    // 卖出收益 = 旧成本 - 新成本
    const rawReturn = currentCost.minus(newCost);

    if (rawReturn.lte(0)) {
      throw new Error('卖出金额无效');
    }

    // 扣除手续费
    const fee = rawReturn.mul(this.FEE_RATE);
    const amountReceived = rawReturn.minus(fee);

    // 平均价格
    const avgPrice = amountReceived.div(deltaShares);

    // 价格影响
    const oldPrices = this.getCurrentPrices(state, liquidity);
    const newState = {
      yesShares: newQYes.toNumber(),
      noShares: newQNo.toNumber(),
    };
    const newPrices = this.getCurrentPrices(newState, liquidity);

    const priceImpact = side === 'yes'
      ? (oldPrices.yesPrice - newPrices.yesPrice) / oldPrices.yesPrice
      : (oldPrices.noPrice - newPrices.noPrice) / oldPrices.noPrice;

    return {
      amountReceived: Number(amountReceived.toFixed(6)),
      avgPrice: Number(avgPrice.toFixed(6)),
      newYesShares: newQYes.toNumber(),
      newNoShares: newQNo.toNumber(),
      priceImpact: Math.abs(priceImpact),
    };
  }

  /**
   * 根据金额计算可购买的份额
   * 使用二分查找来找到正确的份额数量
   */
  calculateSharesForAmount(
    state: AMMState,
    side: 'yes' | 'no',
    amount: number,
    liquidity?: number,
  ): { shares: number; avgPrice: number } {
    const targetCost = new Decimal(amount).div(1 + this.FEE_RATE);

    // 二分查找
    let low = new Decimal(0);
    let high = new Decimal(amount * 10); // 设置一个较大的上限
    const tolerance = new Decimal(0.0001);

    for (let i = 0; i < 100; i++) {
      const mid = low.plus(high).div(2);

      try {
        const result = this.calculateBuyCost(state, side, mid.toNumber(), liquidity);
        const costWithoutFee = new Decimal(result.cost).div(1 + this.FEE_RATE);

        if (costWithoutFee.minus(targetCost).abs().lt(tolerance)) {
          return {
            shares: Number(mid.toFixed(6)),
            avgPrice: Number(new Decimal(amount).div(mid).toFixed(6)),
          };
        }

        if (costWithoutFee.lt(targetCost)) {
          low = mid;
        } else {
          high = mid;
        }
      } catch {
        high = mid;
      }
    }

    // 返回最接近的值
    const finalShares = low.plus(high).div(2);
    return {
      shares: Number(finalShares.toFixed(6)),
      avgPrice: Number(new Decimal(amount).div(finalShares).toFixed(6)),
    };
  }

  /**
   * 初始化市场流动性
   * 初始状态：yesShares = noShares = 0
   * 这样初始价格为 0.5
   */
  initializeLiquidity(liquidity: number): AMMState {
    // 在 LMSR 中，当 qYes = qNo 时，价格为 0.5
    // 初始设为 0，价格就是 50/50
    return {
      yesShares: 0,
      noShares: 0,
    };
  }

  /**
   * 获取流动性参数
   */
  getLiquidity(state: AMMState): number {
    return this.DEFAULT_LIQUIDITY;
  }

  /**
   * 设置流动性参数（用于不同的市场）
   *
   * 流动性参数 b 影响价格敏感度：
   * - 较大的 b = 更大的流动性 = 需要更多交易才能移动价格
   * - 较大的 b 也意味着买入时获得的份额更接近 amount/price
   *
   * 例如：当 b=1000, 价格=0.5 时，买入 1 元约得到 1.96 份
   */
  getLiquidityForMarket(marketLiquidity: number): number {
    // 使用 marketLiquidity 作为 b 参数
    // 这样 liquidity=1000 的市场，买入 1 元能得到约 1.96 份（接近理论值 2 份）
    return marketLiquidity;
  }
}
