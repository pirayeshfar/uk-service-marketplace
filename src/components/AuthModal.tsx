import { useState } from 'react';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { api, setAuthToken } from '../api';
import type { PublicUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  ukCities: string[];
  initialRole?: 'customer' | 'provider';
  onClose: () => void;
  onSuccess: (user: PublicUser) => void;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function AuthModal({
  isOpen,
  ukCities,
  initialRole = 'customer',
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [step, setStep] = useState<'email' | 'login' | 'register' | 'forgot'>('email');
  const [email, setEmail] = useState('');
  const [existingName, setExistingName] = useState<string | undefined>();
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration fields
  const [role, setRole] = useState<'customer' | 'provider'>(initialRole);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+44 ');
  const [city, setCity] = useState(ukCities[0] || 'London');

  // Provider-specific UK onboarding fields
  const [idType, setIdType] = useState('UK Passport');
  const [idNumber, setIdNumber] = useState('');
  const [categoriesInput, setCategoriesInput] = useState('Plumbing & Heating');
  const [skillsInput, setSkillsInput] = useState('Boiler Servicing, Leak Repair');
  const [hourlyRate, setHourlyRate] = useState(50);
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [workingHours, setWorkingHours] = useState('08:30 - 17:30');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setStep('email');
    setError(null);
    setSuccessMsg(null);
    setPassword('');
    setRecoveryEmail('');
    setNewPassword('');
    onClose();
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.checkEmail(email);
      if (res.exists) {
        setExistingName(res.fullName);
        setStep('login');
      } else {
        setRole(initialRole);
        setStep('register');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify email.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setAuthToken(res.token);
      onSuccess(res.user);
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword({
        identifier: email,
        recoveryEmail,
        newPassword,
      });
      setSuccessMsg(res.message);
      setPassword('');
      setStep('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(demoEmail, demoPass);
      setAuthToken(res.token);
      onSuccess(res.user);
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        email,
        password,
        fullName,
        phone,
        city,
        role,
      };

      if (role === 'provider') {
        payload.providerProfile = {
          bio: bio || `Verified ${categoriesInput} specialist serving ${city}.`,
          categories: categoriesInput.split(',').map((s) => s.trim()).filter(Boolean),
          skills: skillsInput.split(',').map((s) => s.trim()).filter(Boolean),
          hourlyRate: Number(hourlyRate),
          workingDays,
          workingHours,
          idType,
          idNumber,
          sortCode,
          accountNumber,
        };
      }

      const res = await api.register(payload);
      setAuthToken(res.token);
      onSuccess(res.user);
      resetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Account Sign In or Registration"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl my-8 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== 'email' && (
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError(null);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Back to email"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-display text-lg font-bold text-slate-900">
              {step === 'email' && 'Sign In or Create Account'}
              {step === 'login' && `Welcome back${existingName ? `, ${existingName}` : ''}`}
              {step === 'forgot' && 'Reset Account Password'}
              {step === 'register' && 'Complete Your UK Registration'}
            </h2>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              {successMsg}
            </div>
          )}

          {step === 'email' && (
            <div className="space-y-6">
              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email Address or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.co.uk or username"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Checking...' : 'Continue'}
                </button>
              </form>

              <div className="pt-5 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-500 mb-3">
                  Quick Demo Access (Customer & Provider)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => quickDemoLogin('oliver.bennett@example.co.uk', 'customer123')}
                    className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    Customer Demo
                    <span className="block font-normal text-slate-500 mt-0.5">
                      Oliver Bennett
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => quickDemoLogin('george.dawson@example.co.uk', 'provider123')}
                    className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    Verified Pro
                    <span className="block font-normal text-slate-500 mt-0.5">
                      George Dawson
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-sm text-slate-600">
                Signing in as <span className="font-semibold text-slate-900">{email}</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setStep('forgot');
                    }}
                    className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          )}

          {step === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Verify your registered recovery email address to set a new password for{' '}
                <span className="font-semibold text-slate-900">{email || 'your account'}</span>.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Recovery Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="Enter your recovery email"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep('login');
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Role Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRole('customer')}
                    className={`py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                      role === 'customer'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Customer / Business
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('provider')}
                    className={`py-2 px-3 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                      role === 'provider'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Service Provider
                  </button>
                </div>
              </div>

              {/* Core Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. James Thornton"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    UK Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    UK City / Region
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {ukCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Provider Onboarding Fields */}
              {role === 'provider' && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <span>
                      UK Provider Verification: Your profile will enter our Admin Review Queue and go
                      live in public listings once your UK ID and payout details are approved.
                    </span>
                  </div>

                  {/* 1. UK Official ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Official UK ID Type
                      </label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="UK Passport">UK Passport</option>
                        <option value="UK Driving Licence">UK Driving Licence</option>
                        <option value="Right to Work / BRP">Right to Work / BRP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        ID Document Number
                      </label>
                      <input
                        type="text"
                        required
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value)}
                        placeholder="e.g. UK-549201842"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* 2. Skills, Categories & Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Service Categories (comma-separated)
                      </label>
                      <input
                        type="text"
                        required
                        value={categoriesInput}
                        onChange={(e) => setCategoriesInput(e.target.value)}
                        placeholder="e.g. Plumbing & Heating, Boiler & Gas"
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
                      Specific Skills (comma-separated)
                    </label>
                    <input
                      type="text"
                      required
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      placeholder="e.g. Emergency Leak Repair, EICR Testing, End of Tenancy Clean"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Professional Summary
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Certifications (Gas Safe, NICEIC, DBS), years of experience..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* 3. Availability */}
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
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
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
                        placeholder="08:30 - 17:30"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* 4. UK Bank Payout Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        UK Sort Code (for payouts)
                      </label>
                      <input
                        type="text"
                        required
                        value={sortCode}
                        onChange={(e) => setSortCode(e.target.value)}
                        placeholder="20-45-88"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        UK Account Number (8 digits)
                      </label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="73920418"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {loading
                  ? 'Creating Account...'
                  : role === 'provider'
                    ? 'Submit Provider Application'
                    : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
