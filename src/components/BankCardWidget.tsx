import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, Landmark } from 'lucide-react';
import type { BankCardConfig } from '../types';

interface BankCardWidgetProps {
  bankCard: BankCardConfig;
  referenceCode?: string;
  amountGbp?: number | null;
}

export function BankCardWidget({ bankCard, referenceCode, amountGbp }: BankCardWidgetProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1600);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 border border-slate-700/80 shadow-lg select-none"
    >
      {/* Subtle animated metallic shimmer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bank-card-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col gap-5">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
              <Landmark className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <p className="text-xs text-blue-200/80 font-medium tracking-wide">
                UK Faster Payments Deposit
              </p>
              <p className="font-display text-sm font-semibold text-white">
                {bankCard.bankName}
              </p>
            </div>
          </div>

          {typeof amountGbp === 'number' && (
            <div className="text-right">
              <p className="text-[11px] text-blue-200/80">Amount Due</p>
              <p className="font-mono text-lg font-semibold tabular-nums text-white">
                £{amountGbp.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Sort Code & Account Number */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Sort Code</span>
              <button
                type="button"
                onClick={() => handleCopy('sortCode', bankCard.sortCode)}
                className="text-blue-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Sort Code"
              >
                {copiedField === 'sortCode' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="font-mono text-base font-semibold tracking-wider tabular-nums mt-0.5">
              {bankCard.sortCode}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Account Number</span>
              <button
                type="button"
                onClick={() => handleCopy('accountNumber', bankCard.accountNumber)}
                className="text-blue-300 hover:text-white transition-colors cursor-pointer"
                title="Copy Account Number"
              >
                {copiedField === 'accountNumber' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="font-mono text-base font-semibold tracking-wider tabular-nums mt-0.5">
              {bankCard.accountNumber}
            </p>
          </div>
        </div>

        {/* Account Holder & Reference */}
        <div className="flex flex-wrap items-end justify-between gap-4 pt-1 border-t border-white/10">
          <div>
            <p className="text-[11px] text-slate-300">Account Holder</p>
            <p className="font-display text-sm font-semibold tracking-wide text-white mt-0.5">
              {bankCard.accountHolder}
            </p>
          </div>

          {referenceCode ? (
            <div className="text-right">
              <p className="text-[11px] text-slate-300">Payment Reference</p>
              <button
                type="button"
                onClick={() => handleCopy('ref', referenceCode)}
                className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-blue-300 hover:text-white mt-0.5 cursor-pointer"
              >
                <span>{referenceCode}</span>
                {copiedField === 'ref' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-[11px] text-slate-300">IBAN</p>
              <p className="font-mono text-xs text-slate-200 mt-0.5 tabular-nums">
                {bankCard.iban}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
