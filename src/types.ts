export type UserRole = 'customer' | 'provider' | 'admin';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type BookingStatus =
  | 'pending_pricing'
  | 'awaiting_payment'
  | 'paid_confirmed'
  | 'completed'
  | 'cancelled';

export interface BankCardConfig {
  accountHolder: string;
  bankName: string;
  sortCode: string;
  accountNumber: string;
  iban: string;
  referencePrefix: string;
  updatedAt: string;
}

export interface PlatformSettings {
  brandName: string;
  tagline: string;
  defaultCommissionRate: number;
  bankCard: BankCardConfig;
}

export interface ProviderProfile {
  bio: string;
  categories: string[];
  skills: string[];
  hourlyRate: number;
  workingDays: string[];
  workingHours: string;
  idType: string;
  idNumber: string;
  sortCode: string;
  accountNumber: string;
  iban?: string;
  approvalStatus: ApprovalStatus;
  rating: number;
  completedJobs: number;
  avatarUrl?: string;
}

export interface UserRecord {
  id: string;
  username?: string;
  fullName: string;
  email: string;
  recoveryEmail?: string;
  passwordHash: string;
  phone: string;
  city: string;
  role: UserRole;
  createdAt: string;
  providerProfile?: ProviderProfile;
}

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

export interface PublicProvider {
  id: string;
  fullName: string;
  city: string;
  phone: string;
  email: string;
  providerProfile: ProviderProfile;
}

export interface CategorySummary {
  name: string;
  providerCount: number;
  avgRate: number;
  topSkills: string[];
}

export interface BookingRecord {
  id: string;
  referenceCode: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerCity: string;
  providerId: string;
  providerName: string;
  providerCity: string;
  serviceCategory: string;
  description: string;
  serviceAddress: string;
  postcode: string;
  scheduledDate: string;
  scheduledSlot: string;
  status: BookingStatus;
  totalPrice: number | null;
  commissionRate: number;
  platformCommission: number | null;
  providerPayout: number | null;
  paymentReference?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}

export interface AdminOverviewResponse {
  settings: PlatformSettings;
  users: PublicUser[];
  bookings: BookingRecord[];
  ledger: {
    totalOrderVolume: number;
    paidVolume: number;
    platformRevenue: number;
    totalProviderPayouts: number;
    pendingPayoutObligations: number;
    completedOrdersCount: number;
    pendingPricingCount: number;
    pendingProvidersCount: number;
  };
}
