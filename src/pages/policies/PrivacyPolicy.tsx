import React from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white">Privacy Policy</h1>
        <p className="text-zinc-500 font-medium">Last updated: April 6, 2026</p>
      </div>

      <div className="space-y-8 text-zinc-300 leading-relaxed">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            1. Information We Collect
          </h2>
          <p>
            We collect information you provide directly to us when you create an account, subscribe to our premium service, or communicate with us. This may include your name, email address, and payment information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-500" />
            2. How We Use Your Information
          </h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, to process your transactions, and to communicate with you about your account and our services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            3. Data Security
          </h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            4. Fan Dub Content
          </h2>
          <p>
            Please note that sahidanime provides content that may include fan-made translations and dubbing (Fan Dub). We do not claim ownership of the original intellectual property.
          </p>
        </section>
      </div>
    </div>
  );
};
