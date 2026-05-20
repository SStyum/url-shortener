import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, truncateAll } from './setup';

describe('URL shortener API (e2e)', () => {
  let app: INestApplication;
  let httpServer: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createTestApp();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('Auth', () => {
    it('registra um usuário e retorna access token + refresh cookie', async () => {
      const res = await request(httpServer)
        .post('/auth/register')
        .send({ email: 'alice@test.com', password: 'secret123' })
        .expect(201);

      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: 'alice@test.com' });

      const cookies = (res.headers['set-cookie'] ?? []) as unknown as string[];
      expect(cookies.find((c) => c.startsWith('refreshToken='))).toBeDefined();
    });

    it('rejeita registro duplicado com 409', async () => {
      await request(httpServer)
        .post('/auth/register')
        .send({ email: 'dup@test.com', password: 'secret123' })
        .expect(201);

      await request(httpServer)
        .post('/auth/register')
        .send({ email: 'dup@test.com', password: 'secret123' })
        .expect(409);
    });

    it('login com senha errada retorna 401', async () => {
      await request(httpServer)
        .post('/auth/register')
        .send({ email: 'bob@test.com', password: 'secret123' })
        .expect(201);

      await request(httpServer)
        .post('/auth/login')
        .send({ email: 'bob@test.com', password: 'wrong-password' })
        .expect(401);
    });

    it('refresh sem cookie retorna 401', async () => {
      await request(httpServer).post('/auth/refresh').expect(401);
    });

    it('refresh com cookie válido troca por novo access token', async () => {
      const reg = await request(httpServer)
        .post('/auth/register')
        .send({ email: 'carol@test.com', password: 'secret123' })
        .expect(201);

      const cookies = (reg.headers['set-cookie'] ?? []) as unknown as string[];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken=')) ?? '';

      const res = await request(httpServer)
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);

      expect(res.body.accessToken).toEqual(expect.any(String));
    });
  });

  describe('Links', () => {
    let token: string;

    beforeEach(async () => {
      const res = await request(httpServer)
        .post('/auth/register')
        .send({ email: 'dave@test.com', password: 'secret123' });
      token = res.body.accessToken;
    });

    it('GET /links sem token retorna 401', async () => {
      await request(httpServer).get('/links').expect(401);
    });

    it('POST /links com URL inválida retorna 400', async () => {
      await request(httpServer)
        .post('/links')
        .set('Authorization', `Bearer ${token}`)
        .send({ originalUrl: 'not-a-url' })
        .expect(400);
    });

    it('POST /links cria com shortCode de 8 chars e clicks=0', async () => {
      const res = await request(httpServer)
        .post('/links')
        .set('Authorization', `Bearer ${token}`)
        .send({ originalUrl: 'https://example.com/foo' })
        .expect(201);

      expect(res.body).toMatchObject({
        originalUrl: 'https://example.com/foo',
        clicks: 0,
      });
      expect(res.body.shortCode).toMatch(/^[A-Za-z0-9_-]{8}$/);
      expect(res.body.shortUrl).toContain(res.body.shortCode);
    });

    it('GET /links lista os links do usuário', async () => {
      await request(httpServer)
        .post('/links')
        .set('Authorization', `Bearer ${token}`)
        .send({ originalUrl: 'https://example.com/a' });

      await request(httpServer)
        .post('/links')
        .set('Authorization', `Bearer ${token}`)
        .send({ originalUrl: 'https://example.com/b' });

      const res = await request(httpServer)
        .get('/links')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('Redirect e métricas', () => {
    let token: string;
    let shortCode: string;
    let linkId: string;

    beforeEach(async () => {
      const reg = await request(httpServer)
        .post('/auth/register')
        .send({ email: 'eve@test.com', password: 'secret123' });
      token = reg.body.accessToken;

      const link = await request(httpServer)
        .post('/links')
        .set('Authorization', `Bearer ${token}`)
        .send({ originalUrl: 'https://example.com/redirect-target' });
      shortCode = link.body.shortCode;
      linkId = link.body.id;
    });

    it('GET /:code redireciona 302 e é público', async () => {
      const res = await request(httpServer).get(`/${shortCode}`).expect(302);
      expect(res.headers.location).toBe('https://example.com/redirect-target');
    });

    it('redirect incrementa o contador e registra Click', async () => {
      await request(httpServer).get(`/${shortCode}`);
      await request(httpServer).get(`/${shortCode}`);
      await request(httpServer).get(`/${shortCode}`);

      const list = await request(httpServer)
        .get('/links')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const link = list.body.find((l: { id: string }) => l.id === linkId);
      expect(link.clicks).toBe(3);
    });

    it('GET /:code com código inexistente retorna 404', async () => {
      await request(httpServer).get('/abcd1234').expect(404);
    });

    it('GET /links/:id/stats retorna 7 dias com total agregado', async () => {
      await request(httpServer).get(`/${shortCode}`);
      await request(httpServer).get(`/${shortCode}`);

      const res = await request(httpServer)
        .get(`/links/${linkId}/stats`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.linkId).toBe(linkId);
      expect(res.body.days).toHaveLength(7);
      expect(res.body.total).toBe(2);
      const today = new Date().toISOString().slice(0, 10);
      const todayEntry = res.body.days.find((d: { date: string }) => d.date === today);
      expect(todayEntry?.clicks).toBe(2);
    });

    it('GET /links/:id/stats com UUID inválido retorna 400', async () => {
      await request(httpServer)
        .get('/links/not-a-uuid/stats')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });
});
