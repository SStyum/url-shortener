import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('links')
export class Link {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', name: 'original_url' })
  originalUrl!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 16, name: 'short_code' })
  shortCode!: string;

  @Column({ type: 'int', default: 0 })
  clicks!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
