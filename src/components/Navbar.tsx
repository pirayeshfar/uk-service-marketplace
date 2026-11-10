import type { PublicUser } from '../types';

interface NavbarProps {
  brandName: string;
  user: PublicUser | null;
  activeView: 'home' | 'dashboard' | 'admin';
  onNavigate: (view: 'home' | 'dashboard' | 'admin', sectionId?: string) => void;
  onOpenAuth: (initialMode?: 'provider' | 'customer') => void;
}

export function Navbar({
  brandName,
  user,
  activeView,
  onNavigate,
  onOpenAuth,
}: NavbarProps) {
  const handlePrimaryAction = () => {
    if (!user) {
      onOpenAuth();
    } else if (user.role === 'admin') {
      onNavigate(activeView === 'admin' ? 'home' : 'admin');
    } else {
      onNavigate(activeView === 'dashboard' ? 'home' : 'dashboard');
    }
  };

  const primaryLabel = !user
    ? 'Sign In / Register'
    : activeView === 'home'
      ? user.role === 'admin'
        ? 'Admin Console'
        : 'My Dashboard'
      : 'Marketplace';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-blue-700 transition-colors cursor-pointer"
        >
          {brandName}
        </button>

        {/* Zone 2: 4 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigate('home', 'services-section')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Find Services
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home', 'categories-section')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home', 'how-it-works')}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => (user ? handlePrimaryAction() : onOpenAuth('provider'))}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Become a Pro
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </header>
  );
}
