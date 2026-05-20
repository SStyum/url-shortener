import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(email: string, password: string): Promise<User> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email: normalized } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = this.users.create({ email: normalized, passwordHash });
    return this.users.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
