import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, LogOut, Save } from 'lucide-react';
import { api } from '../api';
import type { BankCardConfig, BookingRecord, PublicUser } from '../types';
import { PaymentModal } from './PaymentModal';

interface UserDashboardProps {
  user: PublicUser;
  bankCard: BankCardConfig;
  onUserUpdated: (user: PublicUser) => void;
  onLogout: () => void;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function StatusLabel({ status }: { status: BookingRecord['status'] }) {
  const map: Record<BookingRecord['status'], { text: string; cls: string }> = {
    pending_pricing: { text: 'Pending Admin Quote', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    awaiting_payment: { text: 'Awaiting Payment', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    paid_confirmed: { text: 'Paid & Confirmed', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    completed: { text: 'Completed', cls: 'text-slate-700 bg-slate-100 border-slate-200' },
    cancelled: { text: 'Cancelled', cls: 'text-red-700 bg-red-50 border-red-200' },
  };
  const cfg = map[status];
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md border ${cfg.cls}`}>
      {cfg.text}
    </span>
  );
}

export function UserDashboard({
  user,
  bankCard,
  onUserUpdated,
  onLogout,
}: UserDashboardProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBooking, setPayingBooking] = useState<BookingRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');

  // Provider profile editor state
  const pp = user.providerProfile;
  const [bio, setBio] = useState(pp?.bio || '');
  const [categories, setCategories] = useState(pp?.categories.join(', ') || '');
  const [skills, setSkills] = useState(pp?.skills.join(', ') || '');
  const [hourlyRate, setHourlyRate] = useState(pp?.hourlyRate || 45);
  const [workingDays, setWorkingDays] = useState<string[]>(pp?.workingDays || []);
  const [workingHours, setWorkingHours] = useState(pp?.workingHours || '08:30 - 17:30');
  const [sortCode, setSortCode] = useState(pp?.sortCode || '');
  const [accountNumber, setAccountNumber] = useState(pp?.accountNumber || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getMe();
      setBookings(res.bookings);
      onUserUpdated(res.user);
    } catch (err) {
      if (err instanceof Error && /auth|session|401/i.test(err.message)) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkCompleted = async (bookingId: string) => {
    const res = await api.completeBooking(bookingId);
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? res.booking : b)));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const res = await api.updateProviderProfile({
        bio,
        categories: categories.split(',').map((s) => s.trim()).filter(Boolean),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        hourlyRate: Number(hourlyRate),
        workingDays,
        workingHours,
        sortCode,
        accountNumber,
      });
      onUserUpdated(res.user);
      setProfileNotice('Services, availability, and payout details saved.');
    } catch (err) {
      setProfileNotice(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Financial summaries
  const completedEarnings = bookings
    .filter((b) => b.status === 'completed')
    .reduce((sum, b) => sum + (b.providerPayout || 0), 0);

  const pendingPayouts = bookings
    .filter((b) => b.status === 'paid_confirmed')
    .reduce((sum, b) => sum + (b.providerPayout || 0), 0);

  const awaitingPaymentTotal = bookings
    .filter((b) => b.status === 'awaiting_payment')
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            {user.role === 'provider' ? 'Service Provider Workspace' : 'Customer Workspace'}
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 mt-1">
            {user.fullName}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user.city}, UK · {user.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'provider' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jobs & Payouts
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Services & Availability
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Provider Approval Banner */}
      {user.role === 'provider' && pp?.approvalStatus !== 'approved' && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            pp?.approvalStatus === 'pending'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <p className="font-semibold">
            {pp?.approvalStatus === 'pending'
              ? 'Verification Pending Admin Review'
              : 'Application Not Approved'}
          </p>
          <p className="text-xs mt-1 opacity-90">
            {pp?.approvalStatus === 'pending'
              ? 'Your UK ID, skills, and bank details are in our admin review queue. Your profile will appear in public search listings once approved.'
              : 'Please contact support or update your credentials.'}
          </p>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Bookings</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {bookings.length}
          </p>
        </div>
        {user.role === 'provider' ? (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Completed Earnings</p>
              <p className="font-mono text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                £{completedEarnings.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Pending Payouts</p>
              <p className="font-mono text-2xl font-bold text-blue-700 tabular-nums mt-1">
                £{pendingPayouts.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Standard Hourly Rate</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                £{pp?.hourlyRate || 0}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Awaiting Payment</p>
              <p className="font-mono text-2xl font-bold text-blue-700 tabular-nums mt-1">
                £{awaitingPaymentTotal.toFixed(2)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Active / Paid Jobs</p>
              <p className="font-mono text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                {bookings.filter((b) => b.status === 'paid_confirmed').length}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-medium text-slate-500">Completed Jobs</p>
              <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
                {bookings.filter((b) => b.status === 'completed').length}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Main Content Tab */}
      {activeTab === 'orders' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900">
              {user.role === 'provider' ? 'Assigned Service Orders' : 'Your Service Requests & Quotes'}
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading orders...</div>
          ) : bookings.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No bookings yet. Browse verified UK professionals on the marketplace to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Ref</th>
                    <th className="py-3 px-4">Service & Scope</th>
                    <th className="py-3 px-4">
                      {user.role === 'provider' ? 'Customer' : 'Professional'}
                    </th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4 text-right">
                      {user.role === 'provider' ? 'Your Payout' : 'Total Price'}
                    </th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                        {b.referenceCode}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-900">{b.serviceCategory}</p>
                        <p className="text-xs text-slate-500 max-w-xs truncate">{b.description}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-900">
                          {user.role === 'provider' ? b.customerName : b.providerName}
                        </p>
                        <p className="text-xs text-slate-500">{b.postcode}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums">
                        {b.scheduledDate}
                        <span className="block text-slate-500">{b.scheduledSlot}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {user.role === 'provider'
                          ? b.providerPayout !== null
                            ? `£${b.providerPayout.toFixed(2)}`
                            : 'Pending'
                          : b.totalPrice !== null
                            ? `£${b.totalPrice.toFixed(2)}`
                            : 'Pending'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusLabel status={b.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {user.role === 'customer' && b.status === 'awaiting_payment' && (
                          <button
                            type="button"
                            onClick={() => setPayingBooking(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay Now
                          </button>
                        )}
                        {user.role === 'provider' && b.status === 'paid_confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleMarkCompleted(b.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 max-w-3xl"
        >
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Manage Offered Services, Availability & Payout Bank
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Updates to your categories and skills dynamically update marketplace discovery.
            </p>
          </div>

          {profileNotice && (
            <div className="px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
              {profileNotice}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Categories (comma-separated)
              </label>
              <input
                type="text"
                required
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hourly Rate (£ GBP)
              </label>
              <input
                type="number"
                min={15}
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              required
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Professional Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Working Days
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      workingDays.includes(day)
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Working Hours
              </label>
              <input
                type="text"
                required
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payout Sort Code
              </label>
              <input
                type="text"
                required
                value={sortCode}
                onChange={(e) => setSortCode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Payout Account Number
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      <PaymentModal
        booking={payingBooking}
        bankCard={bankCard}
        onClose={() => setPayingBooking(null)}
        onPaid={(updated) => {
          setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        }}
      />
    </div>
  );
}
