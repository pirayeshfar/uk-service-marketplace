import { Calendar, CheckCircle2, MapPin, Star } from 'lucide-react';
import type { PublicProvider } from '../types';
import { AvatarVector } from './AvatarVector';

interface ProviderCardProps {
  provider: PublicProvider;
  onBook: (provider: PublicProvider) => void;
}

export function ProviderCard({ provider, onBook }: ProviderCardProps) {
  const { providerProfile } = provider;

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5 hover:border-blue-300 transition-colors">
      <div className="space-y-4">
        {/* Top Row: Vector Avatar + Name + Verified */}
        <div className="flex items-start gap-4">
          <AvatarVector gender={providerProfile.gender} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-base font-bold text-slate-900 truncate">
                {provider.fullName}
              </h3>
              <CheckCircle2
                className="w-4 h-4 text-blue-700 shrink-0"
                aria-label="Admin Verified Professional"
              />
            </div>

            {/* Unboxed metadata with typographic separators */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 mt-1">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {provider.city}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-medium text-slate-800 tabular-nums">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                {providerProfile.rating.toFixed(1)} ({providerProfile.completedJobs} jobs)
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="font-mono text-lg font-bold text-slate-900 tabular-nums">
              £{providerProfile.hourlyRate}
            </p>
            <p className="text-[11px] text-slate-500">per hour</p>
          </div>
        </div>

        {/* Categories & Bio */}
        <div>
          <p className="text-xs font-semibold text-blue-700">
            {providerProfile.categories.join(' · ')}
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mt-1.5 line-clamp-2">
            {providerProfile.bio}
          </p>
        </div>

        {/* Skills (clean unboxed list) */}
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">Specialties: </span>
            {providerProfile.skills.slice(0, 4).join(' · ')}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {providerProfile.workingDays.join(', ')} · {providerProfile.workingHours}
            </span>
          </p>
        </div>
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={() => onBook(provider)}
        className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        Book Now
      </button>
    </article>
  );
}
