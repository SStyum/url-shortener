import { IsUrl } from 'class-validator';

export class CreateLinkDto {
  @IsUrl({ require_protocol: true }, { message: 'originalUrl must be a valid URL with protocol' })
  originalUrl!: string;
}
