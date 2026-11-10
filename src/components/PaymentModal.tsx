import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { api } from '../api';
import type { BankCardConfig, BookingRecord } from '../types';
import { BankCardWidget } from './BankCardWidget';

interface PaymentModalProps {
  booking: BookingRecord | null;
  bankCard: BankCardConfig;
  onClose: () => void;
  onPaid: (updated: BookingRecord) => void;
}

export function PaymentModal({ booking, bankCard, onClose, onPaid }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!booking) return null;

  const handleConfirmPayment = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.payBooking(booking.id);
      onPaid(res.booking);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment confirmation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Complete Bank Transfer Payment"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg my-8 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Complete Order Payment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Order {booking.referenceCode} · {booking.serviceCategory}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close payment modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Dynamic Animated Bank Card */}
          <BankCardWidget
            bankCard={bankCard}
            referenceCode={booking.referenceCode}
            amountGbp={booking.totalPrice}
          />

          {/* Order Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Assigned Professional</span>
              <span className="font-semibold text-slate-900">{booking.providerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Scheduled Date & Slot</span>
              <span className="font-mono text-slate-900 tabular-nums">
                {booking.scheduledDate} · {booking.scheduledSlot}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Total Amount Due</span>
              <span className="font-mono text-base font-bold text-blue-700 tabular-nums">
                £{booking.totalPrice?.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Transfer the exact amount via UK Faster Payments to the designated account above using{' '}
            <span className="font-mono font-semibold text-slate-800">{booking.referenceCode}</span>{' '}
            as your payment reference, then confirm below.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirmPayment}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Confirming Transfer...' : 'Confirm Bank Transfer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
