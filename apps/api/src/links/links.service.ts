import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { Link } from './entities/link.entity';
import { Click } from './entities/click.entity';
import { CreateLinkDto } from './dto/create-link.dto';

const SHORT_CODE_LENGTH = 8;
const MAX_GENERATION_ATTEMPTS = 5;
const STATS_DAYS = 7;

export type DailyClicks = { date: string; clicks: number };
export type LinkStats = { linkId: string; days: DailyClicks[]; total: number };

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private readonly links: Repository<Link>,
    @InjectRepository(Click)
    private readonly clicks: Repository<Click>,
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

  findById(id: string): Promise<Link | null> {
    return this.links.findOne({ where: { id } });
  }

  async registerClickAndRedirect(shortCode: string, ip: string): Promise<Link> {
    const link = await this.links.findOne({ where: { shortCode } });
    if (!link) throw new NotFoundException(`No link found for code "${shortCode}"`);

    await Promise.all([
      this.links.increment({ id: link.id }, 'clicks', 1),
      this.clicks.save(this.clicks.create({ linkId: link.id, ipHash: hashIp(ip) })),
    ]);

    return link;
  }

  async getStats(linkId: string): Promise<LinkStats> {
    const link = await this.links.findOne({ where: { id: linkId } });
    if (!link) throw new NotFoundException(`No link found with id "${linkId}"`);

    const rows = await this.clicks
      .createQueryBuilder('c')
      .select("to_char(c.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)::int', 'clicks')
      .where('c.link_id = :linkId', { linkId })
      .andWhere(`c.created_at >= NOW() - INTERVAL '${STATS_DAYS} days'`)
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<DailyClicks>();

    const days = fillMissingDays(rows, STATS_DAYS);
    const total = days.reduce((sum, d) => sum + d.clicks, 0);
    return { linkId, days, total };
  }

  private generateShortCode(): string {
    return randomBytes(SHORT_CODE_LENGTH)
      .toString('base64url')
      .slice(0, SHORT_CODE_LENGTH);
  }
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip ?? '').digest('hex');
}

function fillMissingDays(rows: DailyClicks[], windowDays: number): DailyClicks[] {
  const byDate = new Map(rows.map((r) => [r.date, Number(r.clicks)]));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const result: DailyClicks[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    result.push({ date: iso, clicks: byDate.get(iso) ?? 0 });
  }
  return result;
}
