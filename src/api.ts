import type {
  AdminOverviewResponse,
  AuthResponse,
  BankCardConfig,
  BookingRecord,
  CategorySummary,
  PlatformSettings,
  PublicProvider,
  PublicUser,
} from './types';

const TOKEN_KEY = 'britserve_auth_token';
let memoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    memoryToken = localStorage.getItem(TOKEN_KEY);
    return memoryToken;
  } catch {
    return memoryToken;
  }
}

export function setAuthToken(token: string | null): void {
  memoryToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted iframe contexts
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getConfig: () =>
    request<{ settings: PlatformSettings; ukCities: string[] }>('/api/config'),

  getMarketplace: (params: { q?: string; category?: string; city?: string }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.category) qs.set('category', params.category);
    if (params.city) qs.set('city', params.city);
    return request<{
      providers: PublicProvider[];
      categories: CategorySummary[];
      totalApproved: number;
    }>(`/api/marketplace?${qs.toString()}`);
  },

  checkEmail: (email: string) =>
    request<{ exists: boolean; fullName?: string; role?: string }>('/api/auth/check-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  forgotPassword: (payload: {
    identifier?: string;
    recoveryEmail: string;
    newPassword: string;
  }) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: Record<string, unknown>) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () =>
    request<{ user: PublicUser; bookings: BookingRecord[] }>('/api/me'),

  updateProviderProfile: (payload: Record<string, unknown>) =>
    request<{ user: PublicUser }>('/api/provider/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  createBooking: (payload: Record<string, unknown>) =>
    request<{ booking: BookingRecord }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  payBooking: (bookingId: string) =>
    request<{ booking: BookingRecord }>(`/api/bookings/${bookingId}/pay`, {
      method: 'POST',
    }),

  completeBooking: (bookingId: string) =>
    request<{ booking: BookingRecord }>(`/api/bookings/${bookingId}/complete`, {
      method: 'POST',
    }),

  getAdminOverview: () => request<AdminOverviewResponse>('/api/admin/overview'),

  reviewProvider: (providerId: string, decision: 'approved' | 'rejected') =>
    request<{ user: PublicUser }>(`/api/admin/providers/${providerId}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),

  priceBooking: (bookingId: string, totalPrice: number, commissionRate: number) =>
    request<{ booking: BookingRecord }>(`/api/admin/bookings/${bookingId}/price`, {
      method: 'POST',
      body: JSON.stringify({ totalPrice, commissionRate }),
    }),

  updateBrandSettings: (payload: {
    brandName: string;
    tagline?: string;
    defaultCommissionRate?: number;
  }) =>
    request<{ settings: PlatformSettings }>('/api/admin/settings/brand', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  updateBankCardSettings: (payload: Omit<BankCardConfig, 'updatedAt'>) =>
    request<{ settings: PlatformSettings }>('/api/admin/settings/bank-card', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminCreateUser: (payload: {
    fullName: string;
    email: string;
    username?: string;
    password: string;
    phone?: string;
    city: string;
    role: 'customer' | 'provider' | 'admin';
  }) =>
    request<{ user: PublicUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminChangePassword: (userId: string, newPassword: string) =>
    request<{ message: string }>(`/api/admin/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),
};
