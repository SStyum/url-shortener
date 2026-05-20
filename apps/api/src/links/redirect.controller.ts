import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { LinksService } from './links.service';

@Controller()
export class RedirectController {
  constructor(private readonly linksService: LinksService) {}

  @Get(':code([A-Za-z0-9_-]{8})')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const link = await this.linksService.findByCodeAndIncrement(code);
    return res.redirect(302, link.originalUrl);
  }
}
