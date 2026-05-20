import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Link } from './entities/link.entity';
import { CreateLinkDto } from './dto/create-link.dto';

const SHORT_CODE_LENGTH = 8;
const MAX_GENERATION_ATTEMPTS = 5;

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly links: Repository<Link>,
  ) {}

  async create(dto: CreateLinkDto): Promise<Link> {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
      const shortCode = this.generateShortCode();
      const exists = await this.links.exists({ where: { shortCode } });
      if (exists) continue;

      const link = this.links.create({ originalUrl: dto.originalUrl, shortCode });
      return this.links.save(link);
    }
    throw new Error('Could not generate a unique short code after multiple attempts');
  }

  findAll(): Promise<Link[]> {
    return this.links.find({ order: { createdAt: 'DESC' } });
  }

  async findByCodeAndIncrement(shortCode: string): Promise<Link> {
    const link = await this.links.findOne({ where: { shortCode } });
    if (!link) throw new NotFoundException(`No link found for code "${shortCode}"`);

    await this.links.increment({ id: link.id }, 'clicks', 1);
    return link;
  }

  private generateShortCode(): string {
    return randomBytes(SHORT_CODE_LENGTH)
      .toString('base64url')
      .slice(0, SHORT_CODE_LENGTH);
  }
}
