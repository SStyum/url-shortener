import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { Link } from './entities/link.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateLinkDto) {
    const link = await this.linksService.create(dto);
    return this.toResponse(link);
  }

  @Get()
  async findAll() {
    const links = await this.linksService.findAll();
    return links.map((link) => this.toResponse(link));
  }

  private toResponse(link: Link) {
    const baseUrl = this.config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:3000';
    return {
      id: link.id,
      originalUrl: link.originalUrl,
      shortCode: link.shortCode,
      shortUrl: `${baseUrl}/${link.shortCode}`,
      clicks: link.clicks,
      createdAt: link.createdAt,
    };
  }
}
