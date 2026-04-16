import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export function useSubscriptions({ search = '', category = '', status = 'active', sortBy = 'billing_date', order = 'asc' } = {}) {
  const params = new URLSearchParams({
    ...(search   && { search }),
    ...(category && { category }),
    ...(status   && { status }),
    sortBy,
    order
  });

  return useQuery({
    queryKey: ['subscriptions', search, category, status, sortBy, order],
    queryFn:  async () => {
      const res = await apiFetch(`/subscriptions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch subscriptions');
      return res.json();
    }
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    }
  });
}

export function useSaveSubscription(editData) {
  const qc     = useQueryClient();
  const isEdit = !!editData;

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiFetch(
        isEdit ? `/subscriptions/${editData.id}` : '/subscriptions',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(data) }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Request failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    }
  });
}
