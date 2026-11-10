import { useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { api, getAuthToken, setAuthToken } from './api';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { BookingModal } from './components/BookingModal';
import { Navbar } from './components/Navbar';
import { ProviderCard } from './components/ProviderCard';
import { UserDashboard } from './components/UserDashboard';
import type {
  CategorySummary,
  PlatformSettings,
  PublicProvider,
  PublicUser,
} from './types';

const HERO_IMAGE = '/src/assets/images/hero_uk_tradesperson_1794294740624.jpg';

export default function App() {
  const [settings, setSettings] = useState<PlatformSettings>({
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
      updatedAt: '',
    },
  });
  const [ukCities, setUkCities] = useState<string[]>([
    'London',
    'Manchester',
    'Birmingham',
    'Edinburgh',
    'Bristol',
    'Leeds',
  ]);

  const [user, setUser] = useState<PublicUser | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'dashboard' | 'admin'>('home');

  // Marketplace discovery state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(true);

  // Modals
  const [authOpen, setAuthOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState<'customer' | 'provider'>('customer');
  const [bookingProvider, setBookingProvider] = useState<PublicProvider | null>(null);
  const [pendingBookProvider, setPendingBookProvider] = useState<PublicProvider | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load initial config & restore session
  useEffect(() => {
    api.getConfig().then((res) => {
      setSettings(res.settings);
      setUkCities(res.ukCities);
      document.title = `${res.settings.brandName} UK — Trusted Local & Commercial Services Marketplace`;
    });

    if (getAuthToken()) {
      api
        .getMe()
        .then((res) => setUser(res.user))
        .catch(() => setAuthToken(null));
    }
  }, []);

  // Load marketplace providers & dynamic categories
  const fetchMarketplace = async (q = searchQuery, cat = selectedCategory, city = selectedCity) => {
    setLoadingMarket(true);
    try {
      const res = await api.getMarketplace({
        q: q.trim() || undefined,
        category: cat !== 'all' ? cat : undefined,
        city: city !== 'all' ? city : undefined,
      });
      setProviders(res.providers);
      setCategories(res.categories);
    } finally {
      setLoadingMarket(false);
    }
  };

  useEffect(() => {
    fetchMarketplace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedCity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMarketplace(searchQuery, selectedCategory, selectedCity);
    const el = document.getElementById('services-section');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNavigate = (view: 'home' | 'dashboard' | 'admin', sectionId?: string) => {
    setActiveView(view);
    if (view === 'home' && sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBookClick = (provider: PublicProvider) => {
    if (!user) {
      setPendingBookProvider(provider);
      setAuthInitialRole('customer');
      setAuthOpen(true);
      return;
    }
    setBookingProvider(provider);
  };

  const handleAuthSuccess = (loggedInUser: PublicUser) => {
    setUser(loggedInUser);
    if (pendingBookProvider) {
      setBookingProvider(pendingBookProvider);
      setPendingBookProvider(null);
      return;
    }
    if (loggedInUser.role === 'admin') {
      setActiveView('admin');
    } else if (loggedInUser.role === 'provider') {
      setActiveView('dashboard');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setActiveView('home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        brandName={settings.brandName}
        user={user}
        activeView={activeView}
        onNavigate={handleNavigate}
        onOpenAuth={(role) => {
          setAuthInitialRole(role || 'customer');
          setAuthOpen(true);
        }}
      />

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-700">
          {toastMessage}
        </div>
      )}

      {activeView === 'admin' && user?.role === 'admin' ? (
        <div className="flex-1 bg-slate-50/60">
          <AdminDashboard
            onSettingsUpdated={(updated) => {
              setSettings(updated);
              document.title = `${updated.brandName} UK — Trusted Local & Commercial Services Marketplace`;
            }}
            onLogout={handleLogout}
          />
        </div>
      ) : activeView === 'dashboard' && user ? (
        <div className="flex-1 bg-slate-50/60">
          <UserDashboard
            user={user}
            bankCard={settings.bankCard}
            onUserUpdated={setUser}
            onLogout={handleLogout}
          />
        </div>
      ) : (
        <main className="flex-1">
          {/* Hero Section */}
          <section className="border-b border-slate-200 bg-slate-50/50">
            <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              {/* Left Copy + Global Search */}
              <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-blue-700 tracking-wide uppercase">
                    United Kingdom B2C & B2B Services Marketplace
                  </p>
                  <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1] [text-wrap:balance]">
                    {settings.brandName}: Vetted UK Specialists, Booked With Certainty.
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                    {settings.tagline}
                  </p>
                </div>

                {/* Global Search Bar */}
                <form
                  onSubmit={handleSearchSubmit}
                  className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <div className="flex-1 flex items-center gap-2.5 px-3 py-2">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="What service do you need? (e.g. Plumbing, House Cleaning, Electrician)"
                      className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>

                  <div className="sm:border-l border-slate-200 flex items-center gap-2 px-3 py-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      aria-label="Filter by UK City"
                      className="text-sm font-medium text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="all">All UK Cities</option>
                      {ukCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Search Pros
                  </button>
                </form>

                {/* Trust Markers */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600 pt-1">
                  <span>UK ID & Right-to-Work Checked</span>
                  <span aria-hidden="true">·</span>
                  <span>Admin-Verified Fixed Quotes in GBP</span>
                  <span aria-hidden="true">·</span>
                  <span>Direct UK Faster Payments</span>
                </div>
              </div>

              {/* Right Hero Image */}
              <div className="lg:col-span-5 min-h-[280px] lg:min-h-[380px]">
                {!heroImgError ? (
                  <img
                    src={HERO_IMAGE}
                    alt="Verified UK tradesperson inspecting a modern London home"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-8 text-center">
                    <p className="font-display text-lg font-bold text-slate-700">
                      {settings.brandName} Verified UK Trades & Commercial Services
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Smart Dynamic Categorization */}
          <section id="categories-section" className="max-w-7xl mx-auto px-6 py-12 border-b border-slate-200">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Live Service Categories
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Dynamically generated from our verified UK professionals currently accepting bookings.
                </p>
              </div>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                >
                  Clear category filter
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                All Categories
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(selectedCategory === cat.name ? 'all' : cat.name)
                  }
                  className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.name
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`ml-2 font-mono text-xs tabular-nums ${
                      selectedCategory === cat.name ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    ({cat.providerCount} · avg £{cat.avgRate}/hr)
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Verified Service Providers Grid */}
          <section id="services-section" className="max-w-7xl mx-auto px-6 py-12 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Verified UK Service Professionals
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Showing {providers.length} approved specialist{providers.length === 1 ? '' : 's'}
                  {selectedCity !== 'all' ? ` in ${selectedCity}` : ' across the United Kingdom'}
                </p>
              </div>
            </div>

            {loadingMarket ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-64 rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
                  />
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center space-y-3">
                <p className="font-display text-base font-bold text-slate-900">
                  No matching verified professionals found
                </p>
                <p className="text-sm text-slate-600">
                  Try clearing your search filter or selecting a different UK city.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedCity('all');
                    fetchMarketplace('', 'all', 'all');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    onBook={handleBookClick}
                  />
                ))}
              </div>
            )}
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-14">
            <div className="max-w-2xl mb-10">
              <h2 className="font-display text-2xl font-bold text-slate-900">
                How {settings.brandName} Works
              </h2>
              <p className="text-sm text-slate-600 mt-1.5">
                Structured B2C and B2B booking with admin-verified pricing and protected UK bank payouts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  num: '01.',
                  title: 'Search Verified Pros',
                  desc: 'Filter UK tradespeople and specialists by skill, category, and city.',
                },
                {
                  num: '02.',
                  title: 'Schedule Date & Slot',
                  desc: 'Pick your preferred date, time window, and UK property postcode.',
                },
                {
                  num: '03.',
                  title: 'Admin-Verified Quote',
                  desc: 'Our operations team reviews the scope and sets a fixed GBP price.',
                },
                {
                  num: '04.',
                  title: 'UK Faster Payments',
                  desc: 'Transfer securely via the designated UK bank card and track completion.',
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2"
                >
                  <p className="font-mono text-sm font-bold text-blue-700">{step.num}</p>
                  <h3 className="font-display text-base font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            <span className="font-display font-bold text-slate-900">{settings.brandName}</span> ·
            United Kingdom Service Marketplace
          </p>
          <p>London · Manchester · Birmingham · Edinburgh · Bristol · Leeds</p>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authOpen}
        ukCities={ukCities}
        initialRole={authInitialRole}
        onClose={() => {
          setAuthOpen(false);
          setPendingBookProvider(null);
        }}
        onSuccess={handleAuthSuccess}
      />

      <BookingModal
        provider={bookingProvider}
        onClose={() => setBookingProvider(null)}
        onBooked={(booking) => {
          showToast(
            `Booking ${booking.referenceCode} submitted for Admin pricing review.`
          );
          setActiveView('dashboard');
        }}
      />
    </div>
  );
}
