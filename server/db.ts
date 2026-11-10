import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  BookingRecord,
  PlatformSettings,
  PublicProvider,
  PublicUser,
  UserRecord,
} from '../src/types.ts';

export const UK_CITIES = [
  'London',
  'Manchester',
  'Birmingham',
  'Edinburgh',
  'Bristol',
  'Leeds',
  'Glasgow',
  'Liverpool',
  'Sheffield',
  'Oxford',
  'Cambridge',
  'Cardiff',
  'Belfast',
];

export interface DatabaseSchema {
  settings: PlatformSettings;
  users: UserRecord[];
  bookings: BookingRecord[];
}

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'marketplace.json');

let supabaseClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (url && key) {
    supabaseClient = createClient(url, key);
    return supabaseClient;
  }
  return null;
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createSeedDatabase(): DatabaseSchema {
  const now = new Date().toISOString();

  const users: UserRecord[] = [
    {
      id: 'usr_admin_1',
      username: 'pirayeshfar',
      fullName: 'Site Administrator',
      email: 'pirayeshfar@gmail.com',
      recoveryEmail: 'pirayeshfar@gmail.com',
      passwordHash: hashPassword('AmirSaman81'),
      phone: '+44 20 7946 0101',
      city: 'London',
      role: 'admin',
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'usr_cust_1',
      fullName: 'Oliver Bennett',
      email: 'oliver.bennett@example.co.uk',
      passwordHash: hashPassword('customer123'),
      phone: '+44 7700 900412',
      city: 'London',
      role: 'customer',
      createdAt: '2026-02-14T11:30:00.000Z',
    },
    {
      id: 'usr_prov_1',
      fullName: 'George Dawson',
      email: 'george.dawson@example.co.uk',
      passwordHash: hashPassword('provider123'),
      phone: '+44 7700 900215',
      city: 'London',
      role: 'provider',
      createdAt: '2026-01-18T10:15:00.000Z',
      providerProfile: {
        bio: 'Gas Safe registered master plumber and central heating engineer with 14 years of residential and commercial experience across Greater London.',
        categories: ['Plumbing & Heating', 'Boiler & Gas'],
        skills: ['Emergency Leak Repair', 'Boiler Servicing', 'Radiator Installation', 'Bathroom Fitting'],
        hourlyRate: 58,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        workingHours: '08:00 - 18:00',
        idType: 'UK Passport',
        idNumber: 'UK-538291044',
        sortCode: '20-32-53',
        accountNumber: '48291034',
        iban: 'GB12BARC20325348291034',
        approvalStatus: 'approved',
        rating: 4.9,
        completedJobs: 64,
        avatarUrl: '/src/assets/images/avatar_provider_2_1794294739796.jpg',
      },
    },
    {
      id: 'usr_prov_2',
      fullName: 'Sarah Jenkins',
      email: 'sarah.jenkins@example.co.uk',
      passwordHash: hashPassword('provider123'),
      phone: '+44 7700 900389',
      city: 'Manchester',
      role: 'provider',
      createdAt: '2026-01-22T14:20:00.000Z',
      providerProfile: {
        bio: 'DBS-checked residential and commercial cleaning specialist. Eco-certified end-of-tenancy, office sanitation, and deep-clean packages.',
        categories: ['House Cleaning', 'Commercial Cleaning'],
        skills: ['End of Tenancy Clean', 'Deep Kitchen & Oven', 'Office Maintenance', 'Carpet Steam Clean'],
        hourlyRate: 38,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHours: '07:30 - 17:30',
        idType: 'UK Driving Licence',
        idNumber: 'JENKI880412SJ9AB',
        sortCode: '04-00-04',
        accountNumber: '91827364',
        iban: 'GB44MONZ04000491827364',
        approvalStatus: 'approved',
        rating: 4.95,
        completedJobs: 112,
        avatarUrl: '/src/assets/images/avatar_provider_1_1794294739995.jpg',
      },
    },
    {
      id: 'usr_prov_3',
      fullName: 'Charlotte Reid',
      email: 'charlotte.reid@example.co.uk',
      passwordHash: hashPassword('provider123'),
      phone: '+44 7700 900574',
      city: 'Birmingham',
      role: 'provider',
      createdAt: '2026-02-02T09:45:00.000Z',
      providerProfile: {
        bio: 'NICEIC-certified electrical engineer specialising in EICR safety certificates, EV home charger installations, and commercial rewiring.',
        categories: ['Electrical & Smart Home', 'EV Charging'],
        skills: ['EICR Safety Inspection', 'EV Charger Install', 'Consumer Unit Upgrade', 'Smart Lighting'],
        hourlyRate: 65,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHours: '08:30 - 18:30',
        idType: 'UK Passport',
        idNumber: 'UK-749102833',
        sortCode: '40-11-60',
        accountNumber: '62019485',
        iban: 'GB88HBUK40116062019485',
        approvalStatus: 'approved',
        rating: 4.88,
        completedJobs: 49,
        avatarUrl: '/src/assets/images/avatar_provider_3_1794294740765.jpg',
      },
    },
    {
      id: 'usr_prov_4',
      fullName: 'Liam MacLeod',
      email: 'liam.macleod@example.co.uk',
      passwordHash: hashPassword('provider123'),
      phone: '+44 7700 900698',
      city: 'Edinburgh',
      role: 'provider',
      createdAt: '2026-02-11T16:00:00.000Z',
      providerProfile: {
        bio: 'Architectural joiner and bespoke carpenter crafting fitted wardrobes, sash window restorations, and commercial oak shelving.',
        categories: ['Carpentry & Joinery', 'Property Maintenance'],
        skills: ['Sash Window Repair', 'Fitted Wardrobes', 'Hardwood Flooring', 'Door Hanging'],
        hourlyRate: 52,
        workingDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        workingHours: '08:00 - 17:00',
        idType: 'UK Driving Licence',
        idNumber: 'MACLE791103LM2CD',
        sortCode: '80-22-60',
        accountNumber: '39104827',
        iban: 'GB19BOFS80226039104827',
        approvalStatus: 'approved',
        rating: 4.85,
        completedJobs: 37,
      },
    },
    {
      id: 'usr_prov_5',
      fullName: 'Tariq Mahmood',
      email: 'tariq.mahmood@example.co.uk',
      passwordHash: hashPassword('provider123'),
      phone: '+44 7700 900831',
      city: 'Leeds',
      role: 'provider',
      createdAt: '2026-03-01T12:10:00.000Z',
      providerProfile: {
        bio: 'F-Gas certified HVAC technician for air-source heat pumps, commercial ventilation, and domestic air conditioning.',
        categories: ['HVAC & Climate', 'Boiler & Gas'],
        skills: ['Heat Pump Servicing', 'AC Installation', 'Commercial Ventilation', 'Thermostat Calibration'],
        hourlyRate: 60,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHours: '08:00 - 18:00',
        idType: 'UK Passport',
        idNumber: 'UK-901248712',
        sortCode: '11-00-01',
        accountNumber: '55192043',
        iban: 'GB33LOYD11000155192043',
        approvalStatus: 'pending',
        rating: 5.0,
        completedJobs: 0,
      },
    },
  ];

  const bookings: BookingRecord[] = [
    {
      id: 'ord_1001',
      referenceCode: 'BSV-4821',
      customerId: 'usr_cust_1',
      customerName: 'Oliver Bennett',
      customerEmail: 'oliver.bennett@example.co.uk',
      customerCity: 'London',
      providerId: 'usr_prov_1',
      providerName: 'George Dawson',
      providerCity: 'London',
      serviceCategory: 'Plumbing & Heating',
      description: 'Annual combi boiler service and pressure valve inspection in 3-bed terrace.',
      serviceAddress: '42 Kensington Park Road, London',
      postcode: 'W11 3BU',
      scheduledDate: '2026-11-12',
      scheduledSlot: '09:00 - 11:00',
      status: 'awaiting_payment',
      totalPrice: 145,
      commissionRate: 15,
      platformCommission: 21.75,
      providerPayout: 123.25,
      createdAt: '2026-11-08T14:20:00.000Z',
    },
    {
      id: 'ord_1002',
      referenceCode: 'BSV-4790',
      customerId: 'usr_cust_1',
      customerName: 'Oliver Bennett',
      customerEmail: 'oliver.bennett@example.co.uk',
      customerCity: 'London',
      providerId: 'usr_prov_2',
      providerName: 'Sarah Jenkins',
      providerCity: 'Manchester',
      serviceCategory: 'House Cleaning',
      description: 'Full end-of-tenancy deep clean for 2-bedroom apartment including oven.',
      serviceAddress: '18 Deansgate Square, Manchester',
      postcode: 'M15 4EE',
      scheduledDate: '2026-11-04',
      scheduledSlot: '10:00 - 14:00',
      status: 'completed',
      totalPrice: 220,
      commissionRate: 15,
      platformCommission: 33,
      providerPayout: 187,
      paymentReference: 'TXN-BSV-4790',
      paidAt: '2026-11-03T16:10:00.000Z',
      completedAt: '2026-11-04T14:30:00.000Z',
      createdAt: '2026-11-02T10:05:00.000Z',
    },
    {
      id: 'ord_1003',
      referenceCode: 'BSV-4835',
      customerId: 'usr_cust_1',
      customerName: 'Oliver Bennett',
      customerEmail: 'oliver.bennett@example.co.uk',
      customerCity: 'London',
      providerId: 'usr_prov_3',
      providerName: 'Charlotte Reid',
      providerCity: 'Birmingham',
      serviceCategory: 'Electrical & Smart Home',
      description: 'EICR landlord electrical safety certificate and 2 double socket replacements.',
      serviceAddress: '9 Colmore Row, Birmingham',
      postcode: 'B3 2BJ',
      scheduledDate: '2026-11-16',
      scheduledSlot: '13:00 - 15:00',
      status: 'pending_pricing',
      totalPrice: null,
      commissionRate: 15,
      platformCommission: null,
      providerPayout: null,
      createdAt: '2026-11-09T09:40:00.000Z',
    },
  ];

  return {
    settings: {
      brandName: 'BritServe',
      tagline:
        'Vetted UK tradespeople and commercial specialists, booked with transparent admin-verified pricing.',
      defaultCommissionRate: 15,
      bankCard: {
        accountHolder: 'BRITSERVE MARKETPLACE LTD',
        bankName: 'Barclays Business UK',
        sortCode: '20-45-88',
        accountNumber: '73920418',
        iban: 'GB29BARC20458873920418',
        referencePrefix: 'BSV',
        updatedAt: now,
      },
    },
    users,
    bookings,
  };
}

function migrateLegacyAdmin(db: DatabaseSchema): boolean {
  const legacyAdmin = db.users.find(
    (u) => u.id === 'usr_admin_1' && u.email === 'admin@britserve.co.uk'
  );
  if (legacyAdmin) {
    legacyAdmin.username = 'pirayeshfar';
    legacyAdmin.fullName = 'Site Administrator';
    legacyAdmin.email = 'pirayeshfar@gmail.com';
    legacyAdmin.recoveryEmail = 'pirayeshfar@gmail.com';
    legacyAdmin.passwordHash = hashPassword('AmirSaman81');
    return true;
  }
  return false;
}

export async function readDb(): Promise<DatabaseSchema> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('marketplace_store')
      .select('data')
      .eq('id', 'main')
      .maybeSingle();

    if (!error && data?.data) {
      const db = data.data as DatabaseSchema;
      if (migrateLegacyAdmin(db)) {
        await writeDb(db);
      }
      return db;
    }

    const seeded = createSeedDatabase();
    await supabase.from('marketplace_store').upsert({
      id: 'main',
      data: seeded,
      updated_at: new Date().toISOString(),
    });
    return seeded;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seeded = createSeedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
    return seeded;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(raw) as DatabaseSchema;
  if (migrateLegacyAdmin(db)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  }
  return db;
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('marketplace_store').upsert({
      id: 'main',
      data,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      throw new Error(`Supabase write failed: ${error.message}`);
    }
    return;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function sanitizeUser(user: UserRecord): PublicUser {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export function toPublicProvider(user: UserRecord): PublicProvider | null {
  if (user.role !== 'provider' || !user.providerProfile) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    city: user.city,
    phone: user.phone,
    email: user.email,
    providerProfile: user.providerProfile,
  };
}
