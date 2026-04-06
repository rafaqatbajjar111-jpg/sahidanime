import React from 'react';
import { RefreshCcw, Clock, AlertCircle, CheckCircle } from 'lucide-react';

export const RefundPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto">
          <RefreshCcw className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white">Refund Policy</h1>
        <p className="text-zinc-500 font-medium">Last updated: April 6, 2026</p>
      </div>

      <div className="space-y-8 text-zinc-300 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            1. Refund Eligibility Window
          </h2>
          <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-2xl space-y-3">
            <p className="font-bold text-white">
              Users are eligible for a full refund within exactly 2 minutes of purchasing a premium subscription.
            </p>
            <p className="text-sm text-zinc-400">
              After this 2-minute window has passed, no refunds will be issued under any circumstances.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            2. How to Request a Refund
          </h2>
          <p>
            To request a refund, you must go to your <strong>Profile</strong> page within the 2-minute window and click the <strong>"Request Refund"</strong> button. This button will automatically disappear once the 2-minute window has expired.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            3. Processing Refunds
          </h2>
          <p>
            Once a refund is requested within the eligible window, your premium subscription will be immediately deactivated, and the refund process will be initiated. Please allow 5-7 business days for the funds to return to your original payment method.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            4. Fan Dub Disclaimer
          </h2>
          <p>
            Please note that sahidanime provides content that may include fan-made translations and dubbing (Fan Dub). Refunds will not be issued based on the quality or nature of these fan-made translations.
          </p>
        </section>
      </div>
    </div>
  );
};
