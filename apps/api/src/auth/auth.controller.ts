import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, this.cookieBaseOptions());
  }

  private setRefreshCookie(res: Response, token: TokenPair['refreshToken']) {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.cookieBaseOptions(),
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }

  private cookieBaseOptions() {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/auth',
    };
  }
}
