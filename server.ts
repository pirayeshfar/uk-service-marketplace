import crypto from 'node:crypto';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  hashPassword,
  readDb,
  sanitizeUser,
  toPublicProvider,
  UK_CITIES,
  writeDb,
} from './server/db.ts';
import type {
  BookingRecord,
  CategorySummary,
  PublicProvider,
  UserRecord,
} from './src/types.ts';

const PORT = 3000;

// Simple signed HMAC token for session authentication
const TOKEN_SECRET = process.env.SESSION_SECRET || 'britserve-uk-marketplace-secret-key';

function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    return typeof parsed.userId === 'string' ? parsed.userId : null;
  } catch {
    return null;
  }
}

interface AuthRequest extends Request {
  currentUser?: UserRecord;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  req.currentUser = user;
  next();
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.currentUser?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

function computeDynamicCategories(providers: PublicProvider[]): CategorySummary[] {
  const map = new Map<string, { count: number; totalRate: number; skills: Set<string> }>();

  for (const p of providers) {
    for (const cat of p.providerProfile.categories) {
      const clean = cat.trim();
      if (!clean) continue;
      const existing = map.get(clean) || { count: 0, totalRate: 0, skills: new Set<string>() };
      existing.count += 1;
      existing.totalRate += p.providerProfile.hourlyRate;
      for (const s of p.providerProfile.skills.slice(0, 4)) {
        existing.skills.add(s);
      }
      map.set(clean, existing);
    }
  }

  return Array.from(map.entries())
    .map(([name, info]) => ({
      name,
      providerCount: info.count,
      avgRate: Math.round(info.totalRate / info.count),
      topSkills: Array.from(info.skills).slice(0, 3),
    }))
    .sort((a, b) => b.providerCount - a.providerCount || a.name.localeCompare(b.name));
}

export function createApiApp() {
  const app = express();
  app.use(express.json());

  // 1. Public Config (Brand Name, Tagline, Bank Card for payment simulation, UK Cities)
  app.get('/api/config', (_req, res) => {
    const db = readDb();
    res.json({
      settings: db.settings,
      ukCities: UK_CITIES,
    });
  });

  // 2. Public Marketplace Discovery (Approved Providers + Dynamic Categories)
  app.get('/api/marketplace', (req, res) => {
    const db = readDb();
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();
    const city = String(req.query.city || '').trim().toLowerCase();

    const approvedProviders = db.users
      .filter((u) => u.role === 'provider' && u.providerProfile?.approvalStatus === 'approved')
      .map(toPublicProvider)
      .filter((p): p is PublicProvider => p !== null);

    const categories = computeDynamicCategories(approvedProviders);

    const filtered = approvedProviders.filter((p) => {
      if (city && city !== 'all' && p.city.toLowerCase() !== city) {
        return false;
      }
      if (
        category &&
        category !== 'all' &&
        !p.providerProfile.categories.some((c) => c.toLowerCase() === category)
      ) {
        return false;
      }
      if (q) {
        const haystack = [
          p.fullName,
          p.city,
          p.providerProfile.bio,
          ...p.providerProfile.categories,
          ...p.providerProfile.skills,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    res.json({
      providers: filtered,
      categories,
      totalApproved: approvedProviders.length,
    });
  });

  // 3. Smart Auth Check (supports Email or Username)
  app.post('/api/auth/check-email', (req, res) => {
    const identifier = String(req.body?.email || '').trim().toLowerCase();
    if (!identifier) {
      res.status(400).json({ error: 'Please enter your email address or username.' });
      return;
    }
    const db = readDb();
    const existing = db.users.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        (u.username && u.username.toLowerCase() === identifier)
    );
    if (!existing && !identifier.includes('@')) {
      res.status(400).json({ error: 'New registrations require a valid email address.' });
      return;
    }
    res.json({
      exists: Boolean(existing),
      fullName: existing
        ? existing.role === 'admin'
          ? 'Administrator'
          : existing.fullName
        : undefined,
      role: existing ? existing.role : undefined,
    });
  });

  // 4. Login (supports Email or Username)
  app.post('/api/auth/login', (req, res) => {
    const identifier = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const db = readDb();
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === identifier ||
        (u.username && u.username.toLowerCase() === identifier)
    );
    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    res.json({
      token: createToken(user.id),
      user: sanitizeUser(user),
    });
  });

  // 4b. Password Recovery using verified Recovery Email
  app.post('/api/auth/forgot-password', (req, res) => {
    const identifier = String(req.body?.identifier || '').trim().toLowerCase();
    const recoveryEmail = String(req.body?.recoveryEmail || '').trim().toLowerCase();
    const newPassword = String(req.body?.newPassword || '');

    if (!recoveryEmail || !recoveryEmail.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid recovery email address.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const db = readDb();
    const user = db.users.find((u) => {
      const matchesIdentifier =
        !identifier ||
        u.email.toLowerCase() === identifier ||
        (u.username && u.username.toLowerCase() === identifier);
      const matchesRecovery =
        (u.recoveryEmail && u.recoveryEmail.toLowerCase() === recoveryEmail) ||
        u.email.toLowerCase() === recoveryEmail;
      return matchesIdentifier && matchesRecovery;
    });

    if (!user) {
      res.status(400).json({
        error: 'Recovery email does not match our records for this account.',
      });
      return;
    }

    user.passwordHash = hashPassword(newPassword);
    writeDb(db);
    res.json({ message: 'Password has been reset successfully. You may now sign in.' });
  });

  // 5. Register (Customer or Service Provider with UK onboarding)
  app.post('/api/auth/register', (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '').trim();
    const city = String(body.city || '').trim();
    const role = body.role === 'provider' ? 'provider' : 'customer';

    if (!email || !password || !fullName || !city) {
      res.status(400).json({ error: 'Full name, email, password, and UK city are required.' });
      return;
    }

    const db = readDb();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const newUser: UserRecord = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      fullName,
      email,
      passwordHash: hashPassword(password),
      phone: phone || '+44 7700 900000',
      city,
      role,
      createdAt: new Date().toISOString(),
    };

    if (role === 'provider') {
      const p = body.providerProfile || {};
      const categories = Array.isArray(p.categories)
        ? p.categories.map((s: string) => String(s).trim()).filter(Boolean)
        : String(p.categories || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      const skills = Array.isArray(p.skills)
        ? p.skills.map((s: string) => String(s).trim()).filter(Boolean)
        : String(p.skills || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

      if (!p.idNumber || !p.sortCode || !p.accountNumber || categories.length === 0) {
        res.status(400).json({
          error:
            'Providers must submit UK ID verification, service categories, Sort Code, and Account Number.',
        });
        return;
      }

      newUser.providerProfile = {
        bio: String(p.bio || 'Verified UK local service specialist.'),
        categories,
        skills: skills.length > 0 ? skills : categories,
        hourlyRate: Math.max(15, Number(p.hourlyRate) || 45),
        workingDays:
          Array.isArray(p.workingDays) && p.workingDays.length > 0
            ? p.workingDays
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHours: String(p.workingHours || '08:30 - 17:30'),
        idType: String(p.idType || 'UK Passport'),
        idNumber: String(p.idNumber).trim(),
        sortCode: String(p.sortCode).trim(),
        accountNumber: String(p.accountNumber).trim(),
        iban: p.iban ? String(p.iban).trim() : undefined,
        approvalStatus: 'pending', // Must be approved by Admin before appearing publicly
        rating: 5.0,
        completedJobs: 0,
      };
    }

    db.users.push(newUser);
    writeDb(db);

    res.status(201).json({
      token: createToken(newUser.id),
      user: sanitizeUser(newUser),
    });
  });

  // 6. Current User + Dashboard Data
  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    const db = readDb();
    const user = req.currentUser!;
    const bookings = db.bookings
      .filter((b) =>
        user.role === 'provider'
          ? b.providerId === user.id
          : user.role === 'customer'
            ? b.customerId === user.id
            : true
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({
      user: sanitizeUser(user),
      bookings,
    });
  });

  // 7. Provider Updates Services & Availability
  app.put('/api/provider/profile', requireAuth, (req: AuthRequest, res) => {
    const user = req.currentUser!;
    if (user.role !== 'provider' || !user.providerProfile) {
      res.status(403).json({ error: 'Only service providers can update provider profiles.' });
      return;
    }

    const db = readDb();
    const target = db.users.find((u) => u.id === user.id);
    if (!target || !target.providerProfile) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }

    const p = req.body || {};
    if (typeof p.bio === 'string') target.providerProfile.bio = p.bio.trim();
    if (typeof p.hourlyRate === 'number' && p.hourlyRate >= 15) {
      target.providerProfile.hourlyRate = p.hourlyRate;
    }
    if (Array.isArray(p.categories) && p.categories.length > 0) {
      target.providerProfile.categories = p.categories.map((c: string) => c.trim()).filter(Boolean);
    }
    if (Array.isArray(p.skills) && p.skills.length > 0) {
      target.providerProfile.skills = p.skills.map((s: string) => s.trim()).filter(Boolean);
    }
    if (Array.isArray(p.workingDays) && p.workingDays.length > 0) {
      target.providerProfile.workingDays = p.workingDays;
    }
    if (typeof p.workingHours === 'string' && p.workingHours.trim()) {
      target.providerProfile.workingHours = p.workingHours.trim();
    }
    if (typeof p.sortCode === 'string' && p.sortCode.trim()) {
      target.providerProfile.sortCode = p.sortCode.trim();
    }
    if (typeof p.accountNumber === 'string' && p.accountNumber.trim()) {
      target.providerProfile.accountNumber = p.accountNumber.trim();
    }

    writeDb(db);
    res.json({ user: sanitizeUser(target) });
  });

  // 8. Customer Creates Booking Request (Enters pending_pricing for Admin)
  app.post('/api/bookings', requireAuth, (req: AuthRequest, res) => {
    const customer = req.currentUser!;
    const {
      providerId,
      serviceCategory,
      description,
      serviceAddress,
      postcode,
      scheduledDate,
      scheduledSlot,
    } = req.body || {};

    if (!providerId || !scheduledDate || !scheduledSlot || !serviceAddress || !postcode) {
      res.status(400).json({
        error: 'Provider, date, time slot, UK address, and postcode are required.',
      });
      return;
    }

    const db = readDb();
    const provider = db.users.find(
      (u) =>
        u.id === providerId &&
        u.role === 'provider' &&
        u.providerProfile?.approvalStatus === 'approved'
    );
    if (!provider || !provider.providerProfile) {
      res.status(404).json({ error: 'Selected verified provider not found.' });
      return;
    }

    const refNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = db.settings.bankCard.referencePrefix || 'BSV';

    const booking: BookingRecord = {
      id: `ord_${crypto.randomUUID().slice(0, 8)}`,
      referenceCode: `${prefix}-${refNum}`,
      customerId: customer.id,
      customerName: customer.fullName,
      customerEmail: customer.email,
      customerCity: customer.city,
      providerId: provider.id,
      providerName: provider.fullName,
      providerCity: provider.city,
      serviceCategory: serviceCategory || provider.providerProfile.categories[0] || 'General Service',
      description: String(description || 'Standard service callout').trim(),
      serviceAddress: String(serviceAddress).trim(),
      postcode: String(postcode).trim().toUpperCase(),
      scheduledDate: String(scheduledDate),
      scheduledSlot: String(scheduledSlot),
      status: 'pending_pricing',
      totalPrice: null,
      commissionRate: db.settings.defaultCommissionRate,
      platformCommission: null,
      providerPayout: null,
      createdAt: new Date().toISOString(),
    };

    db.bookings.unshift(booking);
    writeDb(db);

    res.status(201).json({ booking });
  });

  // 9. Customer Simulates Bank Transfer Payment
  app.post('/api/bookings/:id/pay', requireAuth, (req: AuthRequest, res) => {
    const db = readDb();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    if (booking.customerId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorised to pay for this booking.' });
      return;
    }
    if (booking.status !== 'awaiting_payment' || !booking.totalPrice) {
      res.status(400).json({ error: 'This booking is not awaiting payment.' });
      return;
    }

    booking.status = 'paid_confirmed';
    booking.paidAt = new Date().toISOString();
    booking.paymentReference = `TXN-${booking.referenceCode}`;

    writeDb(db);
    res.json({ booking });
  });

  // 10. Provider or Admin Marks Paid Order Completed
  app.post('/api/bookings/:id/complete', requireAuth, (req: AuthRequest, res) => {
    const db = readDb();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    if (booking.providerId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorised to complete this booking.' });
      return;
    }
    if (booking.status !== 'paid_confirmed') {
      res.status(400).json({ error: 'Only paid bookings can be marked as completed.' });
      return;
    }

    booking.status = 'completed';
    booking.completedAt = new Date().toISOString();

    const provider = db.users.find((u) => u.id === booking.providerId);
    if (provider?.providerProfile) {
      provider.providerProfile.completedJobs += 1;
    }

    writeDb(db);
    res.json({ booking });
  });

  // 11. Admin Overview & Financial Ledger
  app.get('/api/admin/overview', requireAdmin, (_req, res) => {
    const db = readDb();
    const bookings = [...db.bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    let totalOrderVolume = 0;
    let paidVolume = 0;
    let platformRevenue = 0;
    let totalProviderPayouts = 0;
    let pendingPayoutObligations = 0;
    let completedOrdersCount = 0;
    let pendingPricingCount = 0;

    for (const b of bookings) {
      if (b.status === 'pending_pricing') pendingPricingCount += 1;
      if (b.totalPrice) {
        totalOrderVolume += b.totalPrice;
      }
      if (b.status === 'paid_confirmed' || b.status === 'completed') {
        paidVolume += b.totalPrice || 0;
        platformRevenue += b.platformCommission || 0;
        totalProviderPayouts += b.providerPayout || 0;
        if (b.status === 'paid_confirmed') {
          pendingPayoutObligations += b.providerPayout || 0;
        }
      }
      if (b.status === 'completed') {
        completedOrdersCount += 1;
      }
    }

    const pendingProvidersCount = db.users.filter(
      (u) => u.role === 'provider' && u.providerProfile?.approvalStatus === 'pending'
    ).length;

    res.json({
      settings: db.settings,
      users: db.users.map(sanitizeUser),
      bookings,
      ledger: {
        totalOrderVolume: Number(totalOrderVolume.toFixed(2)),
        paidVolume: Number(paidVolume.toFixed(2)),
        platformRevenue: Number(platformRevenue.toFixed(2)),
        totalProviderPayouts: Number(totalProviderPayouts.toFixed(2)),
        pendingPayoutObligations: Number(pendingPayoutObligations.toFixed(2)),
        completedOrdersCount,
        pendingPricingCount,
        pendingProvidersCount,
      },
    });
  });

  // 11b. Admin Creates a New User (Customer, Provider, or Admin)
  app.post('/api/admin/users', requireAdmin, (req, res) => {
    const body = req.body || {};
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const username = body.username ? String(body.username).trim().toLowerCase() : undefined;
    const password = String(body.password || '');
    const phone = String(body.phone || '+44 7700 900000').trim();
    const city = String(body.city || 'London').trim();
    const role =
      body.role === 'admin' || body.role === 'provider' ? body.role : 'customer';

    if (!fullName || !email || !password || password.length < 6) {
      res.status(400).json({
        error: 'Full name, valid email, and password (min. 6 characters) are required.',
      });
      return;
    }

    const db = readDb();
    if (
      db.users.some(
        (u) =>
          u.email.toLowerCase() === email ||
          (username && u.username && u.username.toLowerCase() === username)
      )
    ) {
      res.status(409).json({ error: 'A user with this email or username already exists.' });
      return;
    }

    const newUser: UserRecord = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      username,
      fullName,
      email,
      recoveryEmail: email,
      passwordHash: hashPassword(password),
      phone,
      city,
      role,
      createdAt: new Date().toISOString(),
    };

    if (role === 'provider') {
      newUser.providerProfile = {
        bio: String(body.bio || `Verified UK specialist in ${city}.`),
        categories: Array.isArray(body.categories) && body.categories.length > 0
          ? body.categories
          : ['General Maintenance'],
        skills: Array.isArray(body.skills) && body.skills.length > 0
          ? body.skills
          : ['General Repairs'],
        hourlyRate: Number(body.hourlyRate) || 45,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHours: '08:30 - 17:30',
        idType: 'Admin Verified',
        idNumber: 'ADMIN-CREATED',
        sortCode: String(body.sortCode || '00-00-00'),
        accountNumber: String(body.accountNumber || '00000000'),
        approvalStatus: 'approved',
        rating: 5.0,
        completedJobs: 0,
      };
    }

    db.users.push(newUser);
    writeDb(db);
    res.status(201).json({ user: sanitizeUser(newUser) });
  });

  // 11c. Admin Changes Password for Any User (Including Admin Self-Account)
  app.put('/api/admin/users/:id/password', requireAdmin, (req, res) => {
    const newPassword = String(req.body?.newPassword || '');
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const db = readDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    target.passwordHash = hashPassword(newPassword);
    writeDb(db);
    res.json({ message: `Password updated for ${target.username || target.fullName}.` });
  });

  // 12. Admin Review Provider (Approve / Reject)
  app.post('/api/admin/providers/:id/review', requireAdmin, (req, res) => {
    const decision = req.body?.decision;
    if (decision !== 'approved' && decision !== 'rejected') {
      res.status(400).json({ error: 'Decision must be approved or rejected.' });
      return;
    }
    const db = readDb();
    const user = db.users.find((u) => u.id === req.params.id && u.role === 'provider');
    if (!user || !user.providerProfile) {
      res.status(404).json({ error: 'Provider not found.' });
      return;
    }
    user.providerProfile.approvalStatus = decision;
    writeDb(db);
    res.json({ user: sanitizeUser(user) });
  });

  // 13. Admin Sets Order Price & Commission Split
  app.post('/api/admin/bookings/:id/price', requireAdmin, (req, res) => {
    const totalPrice = Number(req.body?.totalPrice);
    const commissionRate = Number(req.body?.commissionRate ?? 15);

    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      res.status(400).json({ error: 'Please enter a valid positive total price in GBP.' });
      return;
    }
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 90) {
      res.status(400).json({ error: 'Commission rate must be between 0% and 90%.' });
      return;
    }

    const db = readDb();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const platformCommission = Number(((totalPrice * commissionRate) / 100).toFixed(2));
    const providerPayout = Number((totalPrice - platformCommission).toFixed(2));

    booking.totalPrice = Number(totalPrice.toFixed(2));
    booking.commissionRate = commissionRate;
    booking.platformCommission = platformCommission;
    booking.providerPayout = providerPayout;
    booking.status = 'awaiting_payment';

    writeDb(db);
    res.json({ booking });
  });

  // 14. Admin Updates Brand Name & Tagline
  app.put('/api/admin/settings/brand', requireAdmin, (req, res) => {
    const brandName = String(req.body?.brandName || '').trim();
    const tagline = String(req.body?.tagline || '').trim();
    const defaultCommissionRate = Number(req.body?.defaultCommissionRate);

    if (!brandName) {
      res.status(400).json({ error: 'Brand name cannot be empty.' });
      return;
    }

    const db = readDb();
    db.settings.brandName = brandName;
    if (tagline) db.settings.tagline = tagline;
    if (Number.isFinite(defaultCommissionRate) && defaultCommissionRate >= 0 && defaultCommissionRate <= 90) {
      db.settings.defaultCommissionRate = defaultCommissionRate;
    }
    writeDb(db);
    res.json({ settings: db.settings });
  });

  // 15. Admin Updates Bank Card Details
  app.put('/api/admin/settings/bank-card', requireAdmin, (req, res) => {
    const body = req.body || {};
    const accountHolder = String(body.accountHolder || '').trim();
    const bankName = String(body.bankName || '').trim();
    const sortCode = String(body.sortCode || '').trim();
    const accountNumber = String(body.accountNumber || '').trim();
    const iban = String(body.iban || '').trim();
    const referencePrefix = String(body.referencePrefix || 'BSV').trim().toUpperCase();

    if (!accountHolder || !bankName || !sortCode || !accountNumber) {
      res.status(400).json({
        error: 'Account holder, bank name, sort code, and account number are required.',
      });
      return;
    }

    const db = readDb();
    db.settings.bankCard = {
      accountHolder,
      bankName,
      sortCode,
      accountNumber,
      iban: iban || db.settings.bankCard.iban,
      referencePrefix,
      updatedAt: new Date().toISOString(),
    };
    writeDb(db);
    res.json({ settings: db.settings });
  });

  return app;
}

async function startServer() {
  const app = createApiApp();

  // Vite middleware for development or static dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
