interface AvatarVectorProps {
  gender?: 'male' | 'female';
  className?: string;
}

export function AvatarVector({ gender = 'male', className = 'w-14 h-14' }: AvatarVectorProps) {
  if (gender === 'female') {
    return (
      <div
        className={`${className} rounded-lg bg-blue-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <rect width="64" height="64" fill="#EFF6FF" />
          {/* Hair back */}
          <path
            d="M18 28C18 17.5 24.3 11 32 11C39.7 11 46 17.5 46 28V40C46 42 44 43 42 43H22C20 43 18 42 18 40V28Z"
            fill="#1E293B"
          />
          {/* Shoulders / Corporate blazer */}
          <path
            d="M12 64C12 51.8 20.9 45 32 45C43.1 45 52 51.8 52 64H12Z"
            fill="#1D4ED8"
          />
          {/* Collar */}
          <path d="M26 45L32 53L38 45H26Z" fill="#FFFFFF" />
          {/* Neck */}
          <rect x="28" y="38" width="8" height="9" rx="3" fill="#FDBA74" />
          {/* Face */}
          <circle cx="32" cy="28" r="10.5" fill="#FED7AA" />
          {/* Hair front */}
          <path
            d="M21.5 26C22 18.5 26.5 14 32 14C37.5 14 42 18.5 42.5 26C39 22 35.5 20.5 32 20.5C28.5 20.5 25 22 21.5 26Z"
            fill="#1E293B"
          />
          {/* Eyes & Smile */}
          <circle cx="28.5" cy="28.5" r="1.2" fill="#0F172A" />
          <circle cx="35.5" cy="28.5" r="1.2" fill="#0F172A" />
          <path
            d="M29 33C30.2 34.4 33.8 34.4 35 33"
            stroke="#9A3412"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${className} rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <rect width="64" height="64" fill="#F1F5F9" />
        {/* Shoulders / Corporate polo */}
        <path
          d="M12 64C12 51.8 20.9 45 32 45C43.1 45 52 51.8 52 64H12Z"
          fill="#0F172A"
        />
        {/* Collar */}
        <path d="M27 45L32 52L37 45H27Z" fill="#3B82F6" />
        {/* Neck */}
        <rect x="28" y="38" width="8" height="9" rx="3" fill="#FDBA74" />
        {/* Face */}
        <circle cx="32" cy="28" r="10.5" fill="#FED7AA" />
        {/* Hair */}
        <path
          d="M21.5 25C21.5 17.5 26 13 32 13C38 13 42.5 17.5 42.5 25C40.5 21 37 19.5 32 19.5C27 19.5 23.5 21 21.5 25Z"
          fill="#334155"
        />
        {/* Eyes & Smile */}
        <circle cx="28.5" cy="28.5" r="1.2" fill="#0F172A" />
        <circle cx="35.5" cy="28.5" r="1.2" fill="#0F172A" />
        <path
          d="M29 33C30.2 34.4 33.8 34.4 35 33"
          stroke="#9A3412"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
