import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './entities/link.entity';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { RedirectController } from './redirect.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Link])],
  controllers: [LinksController, RedirectController],
  providers: [LinksService],
})
export class LinksModule {}
