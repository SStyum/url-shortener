import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export type JwtPayload = { sub: string; email: string };
export type TokenPair = { accessToken: string; refreshToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair & { user: PublicUser }> {
    const user = await this.usersService.create(dto.email, dto.password);
    const tokens = await this.issueTokens(user);
    return { ...tokens, user: toPublicUser(user) };
  }

  async login(dto: LoginDto): Promise<TokenPair & { user: PublicUser }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.usersService.verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: toPublicUser(user) };
  }

  async refresh(refreshToken: string | undefined): Promise<TokenPair> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User no longer exists');

    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

export type PublicUser = { id: string; email: string; createdAt: Date };

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}
