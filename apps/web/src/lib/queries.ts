import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type LinkResponse = {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  clicks: number;
  createdAt: string;
};

export type DailyClicks = { date: string; clicks: number };
export type LinkStats = { linkId: string; days: DailyClicks[]; total: number };

const linksKey = {
  all: ['links'] as const,
  list: () => ['links', 'list'] as const,
  detail: (id: string) => ['links', 'detail', id] as const,
  stats: (id: string) => ['links', 'stats', id] as const,
};

export function useLinks() {
  return useQuery({
    queryKey: linksKey.list(),
    queryFn: async () => {
      const { data } = await api.get<LinkResponse[]>('/links');
      return data;
    },
  });
}

export function useLink(id: string) {
  return useQuery({
    queryKey: linksKey.detail(id),
    queryFn: async () => {
      const { data } = await api.get<LinkResponse[]>('/links');
      const link = data.find((l) => l.id === id);
      if (!link) throw new Error('Link não encontrado');
      return link;
    },
    enabled: !!id,
  });
}

export function useLinkStats(id: string) {
  return useQuery({
    queryKey: linksKey.stats(id),
    queryFn: async () => {
      const { data } = await api.get<LinkStats>(`/links/${id}/stats`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (originalUrl: string) => {
      const { data } = await api.post<LinkResponse>('/links', { originalUrl });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linksKey.all });
    },
  });
}
