import { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  CreditCard,
  FileSpreadsheet,
  KeyRound,
  Landmark,
  LogOut,
  Save,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { api } from '../api';
import type { AdminOverviewResponse, BankCardConfig, BookingRecord, PlatformSettings } from '../types';
import { BankCardWidget } from './BankCardWidget';

interface AdminDashboardProps {
  onSettingsUpdated: (settings: PlatformSettings) => void;
  onLogout: () => void;
}

type AdminTab = 'ledger' | 'orders' | 'providers' | 'brand' | 'bank' | 'security';

export function AdminDashboard({ onSettingsUpdated, onLogout }: AdminDashboardProps) {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>('orders');
  const [notice, setNotice] = useState<string | null>(null);

  // Pricing input state per booking ID
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [commInputs, setCommInputs] = useState<Record<string, string>>({});

  // Brand settings state
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [defaultCommission, setDefaultCommission] = useState(15);

  // Bank card settings state
  const [bankForm, setBankForm] = useState<Omit<BankCardConfig, 'updatedAt'>>({
    accountHolder: '',
    bankName: '',
    sortCode: '',
    accountNumber: '',
    iban: '',
    referencePrefix: 'BSV',
  });

  // Security & User Creation state
  const [newUserForm, setNewUserForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    phone: '+44 ',
    city: 'London',
    role: 'customer' as 'customer' | 'provider' | 'admin',
  });
  const [passwordTargetId, setPasswordTargetId] = useState('usr_admin_1');
  const [newAccountPassword, setNewAccountPassword] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminOverview();
      setData(res);
      setBrandName(res.settings.brandName);
      setTagline(res.settings.tagline);
      setDefaultCommission(res.settings.defaultCommissionRate);
      setBankForm({
        accountHolder: res.settings.bankCard.accountHolder,
        bankName: res.settings.bankCard.bankName,
        sortCode: res.settings.bankCard.sortCode,
        accountNumber: res.settings.bankCard.accountNumber,
        iban: res.settings.bankCard.iban,
        referencePrefix: res.settings.bankCard.referencePrefix,
      });

      const pMap: Record<string, string> = {};
      const cMap: Record<string, string> = {};
      for (const b of res.bookings) {
        pMap[b.id] = b.totalPrice ? String(b.totalPrice) : '';
        cMap[b.id] = String(b.commissionRate ?? res.settings.defaultCommissionRate);
      }
      setPriceInputs(pMap);
      setCommInputs(cMap);
    } catch (err) {
      if (err instanceof Error && /auth|session|401|admin/i.test(err.message)) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleReviewProvider = async (providerId: string, decision: 'approved' | 'rejected') => {
    await api.reviewProvider(providerId, decision);
    showNotice(`Provider application ${decision}.`);
    await loadOverview();
  };

  const handleSetPrice = async (booking: BookingRecord) => {
    const price = Number(priceInputs[booking.id]);
    const comm = Number(commInputs[booking.id] ?? defaultCommission);
    if (!Number.isFinite(price) || price <= 0) {
      showNotice('Please enter a valid positive GBP price.');
      return;
    }
    await api.priceBooking(booking.id, price, comm);
    showNotice(`Quote £${price.toFixed(2)} sent for order ${booking.referenceCode}.`);
    await loadOverview();
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.updateBrandSettings({
      brandName,
      tagline,
      defaultCommissionRate: Number(defaultCommission),
    });
    onSettingsUpdated(res.settings);
    showNotice('Brand identity updated across homepage and header.');
    await loadOverview();
  };

  const handleSaveBankCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.updateBankCardSettings(bankForm);
    onSettingsUpdated(res.settings);
    showNotice('Deposit bank card details updated for all customer payment screens.');
    await loadOverview();
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-sm text-slate-500">
        Loading Admin Console...
      </div>
    );
  }

  const providers = data.users.filter((u) => u.role === 'provider');
  const pendingProviders = providers.filter((p) => p.providerProfile?.approvalStatus === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 shrink-0 space-y-2">
          <div className="pb-4 mb-2 border-b border-slate-200">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Operations Console
            </p>
            <h1 className="font-display text-lg font-bold text-slate-900 mt-0.5">
              {data.settings.brandName} Admin
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'orders'
                ? 'bg-blue-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="inline-flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4" />
              Orders & Pricing
            </span>
            {data.ledger.pendingPricingCount > 0 && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                {data.ledger.pendingPricingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('providers')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'providers'
                ? 'bg-blue-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="inline-flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              Provider Approvals
            </span>
            {pendingProviders.length > 0 && (
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-bold">
                {pendingProviders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('ledger')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'ledger'
                ? 'bg-blue-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-4 h-4" />
            Financial Ledger
          </button>

          <button
            type="button"
            onClick={() => setTab('brand')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'brand'
                ? 'bg-blue-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Brand & Content
          </button>

          <button
            type="button"
            onClick={() => setTab('bank')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'bank'
                ? 'bg-blue-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Bank Card Management
          </button>

          <button
            type="button"
            onClick={() => setTab('security')}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === 'security'
                ? 'bg-blue-700 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Security & Users
          </button>

          <div className="pt-4 mt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 space-y-6">
          {notice && (
            <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
              {notice}
            </div>
          )}

          {/* Top KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Paid Order Volume</p>
              <p className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
                £{data.ledger.paidVolume.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Platform Commission</p>
              <p className="font-mono text-xl font-bold text-blue-700 tabular-nums mt-1">
                £{data.ledger.platformRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Pending Payouts</p>
              <p className="font-mono text-xl font-bold text-amber-700 tabular-nums mt-1">
                £{data.ledger.pendingPayoutObligations.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500">Verified Professionals</p>
              <p className="font-mono text-xl font-bold text-slate-900 tabular-nums mt-1">
                {providers.filter((p) => p.providerProfile?.approvalStatus === 'approved').length}
              </p>
            </div>
          </div>

          {/* TAB 1: ORDERS & DYNAMIC PRICING */}
          {tab === 'orders' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Service Requests & Dynamic Pricing Control
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign fixed GBP totals and commission percentages to incoming customer bookings.
                </p>
              </div>
              <div className="divide-y divide-slate-200">
                {data.bookings.map((b) => {
                  const previewTotal = Number(priceInputs[b.id] || 0);
                  const previewComm = Number(commInputs[b.id] ?? defaultCommission);
                  const previewShare = (previewTotal * previewComm) / 100;
                  const previewPayout = previewTotal - previewShare;

                  return (
                    <div key={b.id} className="p-6 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-semibold text-slate-800">
                              {b.referenceCode}
                            </span>
                            <span>·</span>
                            <span>{b.serviceCategory}</span>
                            <span>·</span>
                            <span className="font-mono">{b.scheduledDate} ({b.scheduledSlot})</span>
                          </div>
                          <p className="font-semibold text-slate-900 mt-1">
                            {b.customerName} → {b.providerName}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">{b.description}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Location: {b.serviceAddress}, {b.postcode}
                          </p>
                        </div>

                        <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {b.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {b.status === 'pending_pricing' ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-wrap items-end gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Total Order Price (£ GBP)
                            </label>
                            <input
                              type="number"
                              min={1}
                              step="0.01"
                              value={priceInputs[b.id] || ''}
                              onChange={(e) =>
                                setPriceInputs((prev) => ({ ...prev, [b.id]: e.target.value }))
                              }
                              placeholder="e.g. 165.00"
                              className="w-36 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                              Commission (%)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={90}
                              value={commInputs[b.id] ?? defaultCommission}
                              onChange={(e) =>
                                setCommInputs((prev) => ({ ...prev, [b.id]: e.target.value }))
                              }
                              className="w-24 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>
                          {previewTotal > 0 && (
                            <div className="text-xs text-slate-600 font-mono tabular-nums pb-2">
                              Platform: £{previewShare.toFixed(2)} · Provider Payout: £
                              {previewPayout.toFixed(2)}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSetPrice(b)}
                            className="ml-auto px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                          >
                            Set Price & Request Payment
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-slate-700 tabular-nums pt-2 border-t border-slate-100">
                          <span>Total: £{b.totalPrice?.toFixed(2)}</span>
                          <span>
                            Commission ({b.commissionRate}%): £{b.platformCommission?.toFixed(2)}
                          </span>
                          <span className="font-semibold text-emerald-700">
                            Provider Payout: £{b.providerPayout?.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PROVIDER APPROVALS & CRM */}
          {tab === 'providers' && (
            <div className="space-y-6">
              {pendingProviders.length > 0 && (
                <div className="bg-white border border-amber-300 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <h2 className="font-display text-base font-bold text-amber-950">
                      Pending Provider Verification Queue ({pendingProviders.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {pendingProviders.map((p) => (
                      <div key={p.id} className="p-6 flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <h3 className="font-display text-base font-bold text-slate-900">
                            {p.fullName} · {p.city}
                          </h3>
                          <p className="text-xs text-slate-600">
                            {p.email} · {p.phone}
                          </p>
                          <p className="text-xs text-blue-700 font-semibold">
                            {p.providerProfile?.categories.join(', ')} (£{p.providerProfile?.hourlyRate}/hr)
                          </p>
                          <p className="text-xs font-mono text-slate-600">
                            ID: {p.providerProfile?.idType} ({p.providerProfile?.idNumber}) · Bank:{' '}
                            {p.providerProfile?.sortCode} / {p.providerProfile?.accountNumber}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewProvider(p.id, 'approved')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewProvider(p.id, 'rejected')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    UK Provider & Customer CRM Directory
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">UK City</th>
                        <th className="py-3 px-4">Categories / ID</th>
                        <th className="py-3 px-4">Payout Bank</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {data.users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900">{u.fullName}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium capitalize text-slate-700">
                            {u.role}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">{u.city}</td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {u.providerProfile ? (
                              <>
                                <span className="font-medium text-slate-800">
                                  {u.providerProfile.categories.join(', ')}
                                </span>
                                <span className="block font-mono text-slate-500">
                                  {u.providerProfile.idType}: {u.providerProfile.idNumber}
                                </span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                            {u.providerProfile
                              ? `${u.providerProfile.sortCode} · ${u.providerProfile.accountNumber}`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold capitalize">
                            {u.providerProfile ? (
                              <span
                                className={
                                  u.providerProfile.approvalStatus === 'approved'
                                    ? 'text-emerald-700'
                                    : u.providerProfile.approvalStatus === 'pending'
                                      ? 'text-amber-700'
                                      : 'text-red-700'
                                }
                              >
                                {u.providerProfile.approvalStatus}
                              </span>
                            ) : (
                              <span className="text-slate-500">Active</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCIAL LEDGER */}
          {tab === 'ledger' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Platform Financial Ledger & Payout Obligations
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Order Ref</th>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Gross (£)</th>
                      <th className="py-3 px-4 text-right">Commission (£)</th>
                      <th className="py-3 px-4 text-right">Provider Payout (£)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm tabular-nums">
                    {data.bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="py-3 px-4 font-mono text-xs font-semibold">{b.referenceCode}</td>
                        <td className="py-3 px-4">{b.providerName}</td>
                        <td className="py-3 px-4 text-xs capitalize text-slate-600">
                          {b.status.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          {b.totalPrice ? `£${b.totalPrice.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-700">
                          {b.platformCommission ? `£${b.platformCommission.toFixed(2)}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                          {b.providerPayout ? `£${b.providerPayout.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BRAND & CONTENT SETTINGS */}
          {tab === 'brand' && (
            <form
              onSubmit={handleSaveBrand}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-2xl"
            >
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900">
                  Brand & Platform Configuration
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Changes to the Brand Name reflect immediately in the homepage header and hero.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Website Brand Name
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hero Value Proposition
                </label>
                <textarea
                  rows={2}
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Default Platform Commission (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(Number(e.target.value))}
                  className="w-32 px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Brand Settings
              </button>
            </form>
          )}

          {/* TAB 5: BANK CARD MANAGEMENT */}
          {tab === 'bank' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <form
                onSubmit={handleSaveBankCard}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    Deposit Bank Card Management
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Updates here immediately update the animated payment card shown to customers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountHolder}
                    onChange={(e) =>
                      setBankForm((prev) => ({ ...prev, accountHolder: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    UK Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankName}
                    onChange={(e) =>
                      setBankForm((prev) => ({ ...prev, bankName: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Sort Code
                    </label>
                    <input
                      type="text"
                      required
                      value={bankForm.sortCode}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, sortCode: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      required
                      value={bankForm.accountNumber}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={bankForm.iban}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, iban: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Ref Prefix
                    </label>
                    <input
                      type="text"
                      value={bankForm.referencePrefix}
                      onChange={(e) =>
                        setBankForm((prev) => ({ ...prev, referencePrefix: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Update Deposit Card
                </button>
              </form>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Live Customer Payment Card Preview
                </p>
                <BankCardWidget
                  bankCard={{ ...bankForm, updatedAt: new Date().toISOString() }}
                  referenceCode={`${bankForm.referencePrefix || 'BSV'}-4821`}
                  amountGbp={145}
                />
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & USER MANAGEMENT */}
          {tab === 'security' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Create User Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSecurityError(null);
                  try {
                    await api.adminCreateUser({
                      ...newUserForm,
                      username: newUserForm.username || undefined,
                    });
                    setNewUserForm({
                      fullName: '',
                      email: '',
                      username: '',
                      password: '',
                      phone: '+44 ',
                      city: 'London',
                      role: 'customer',
                    });
                    showNotice('New user account created successfully.');
                    await loadOverview();
                  } catch (err) {
                    setSecurityError(
                      err instanceof Error ? err.message : 'Unable to create user.'
                    );
                  }
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-700" />
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Create New User Account
                    </h2>
                    <p className="text-xs text-slate-500">
                      Provision customer, verified provider, or administrator accounts.
                    </p>
                  </div>
                </div>

                {securityError && (
                  <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                    {securityError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserForm.fullName}
                      onChange={(e) =>
                        setNewUserForm((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="e.g. Hannah Abbott"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Account Role
                    </label>
                    <select
                      value={newUserForm.role}
                      onChange={(e) =>
                        setNewUserForm((prev) => ({
                          ...prev,
                          role: e.target.value as 'customer' | 'provider' | 'admin',
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="customer">Customer</option>
                      <option value="provider">Verified Service Provider</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={newUserForm.email}
                      onChange={(e) =>
                        setNewUserForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="user@company.co.uk"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Username (Optional)
                    </label>
                    <input
                      type="text"
                      value={newUserForm.username}
                      onChange={(e) =>
                        setNewUserForm((prev) => ({ ...prev, username: e.target.value }))
                      }
                      placeholder="e.g. habbott"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      UK City
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserForm.city}
                      onChange={(e) =>
                        setNewUserForm((prev) => ({ ...prev, city: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newUserForm.password}
                      onChange={(e) =>
                        setNewUserForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Min. 6 characters"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Create User
                </button>
              </form>

              {/* Change Password Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSecurityError(null);
                  try {
                    const res = await api.adminChangePassword(
                      passwordTargetId,
                      newAccountPassword
                    );
                    setNewAccountPassword('');
                    showNotice(res.message);
                  } catch (err) {
                    setSecurityError(
                      err instanceof Error ? err.message : 'Unable to update password.'
                    );
                  }
                }}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-blue-700" />
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Change Account Password
                    </h2>
                    <p className="text-xs text-slate-500">
                      Update your administrator password or reset any user&apos;s password.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Select Account
                  </label>
                  <select
                    value={passwordTargetId}
                    onChange={(e) => setPasswordTargetId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {data.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.role === 'admin'
                          ? `${u.username || u.fullName} (Administrator)`
                          : `${u.fullName} (${u.role} · ${u.email})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newAccountPassword}
                    onChange={(e) => setNewAccountPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Update Password
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
