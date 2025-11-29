import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException("邮箱已被注册");
    }

    const existingUsername = await this.usersService.findByUsername(
      dto.username
    );
    if (existingUsername) {
      throw new ConflictException("用户名已被使用");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      username: dto.username,
      password_hash: passwordHash,
    });

    // Generate token
    const token = this.generateToken(user.id, user.role ?? "user");

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("邮箱或密码错误");
    }

    if (!user.is_active) {
      throw new UnauthorizedException("账户已被禁用");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException("邮箱或密码错误");
    }

    const token = this.generateToken(user.id, user.role ?? "user");

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      token,
    };
  }

  private generateToken(userId: string, role: string): string {
    return this.jwtService.sign({ sub: userId, role });
  }
}
