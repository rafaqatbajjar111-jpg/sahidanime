import React from 'react';
import { Scale, FileText, AlertCircle, Info } from 'lucide-react';

export const TermsConditions: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto">
          <Scale className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white">Terms & Conditions</h1>
        <p className="text-zinc-500 font-medium">Last updated: April 6, 2026</p>
      </div>

      <div className="space-y-8 text-zinc-300 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using sahidanime, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, do not use our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            2. User Accounts
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            3. Content Disclaimer (Fan Dub)
          </h2>
          <p>
            sahidanime hosts content that includes fan-made dubbing and translations (Fan Dub). This content is provided for entertainment purposes only. We do not claim to be the official distributors of the original anime/donghua series.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            4. Premium Subscriptions
          </h2>
          <p>
            Premium subscriptions provide ad-free access and other benefits. Subscriptions are subject to our Refund Policy.
          </p>
        </section>
      </div>
    </div>
  );
};
