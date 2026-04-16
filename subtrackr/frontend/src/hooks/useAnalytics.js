import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export function useAnalytics() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn:  async () => {
      const res = await apiFetch('/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    }
  });
}
