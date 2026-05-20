import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LinksService } from './links.service';

@Controller()
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':code([A-Za-z0-9_-]{8})')
  async redirect(@Param('code') code: string, @Req() req: Request, @Res() res: Response) {
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    const link = await this.linksService.registerClickAndRedirect(code, ip);
    return res.redirect(302, link.originalUrl);
  }
}
