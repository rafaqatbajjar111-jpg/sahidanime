import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { PLANS as DEFAULT_PLANS, PAYMENT_METHODS as DEFAULT_PAYMENT_METHODS } from '../constants';
import { handleFirestoreError, OperationType } from '../firebase/firestoreError';

export interface Plan {
  id: string;
  name: string;
  description: string;
  prices: {
    [key: string]: {
      amount: number;
      currency: string;
      symbol: string;
      duration: 'month' | 'year';
    };
  };
  benefits: string[];
}

export interface PaymentMethod {
  method: string;
  details: string;
  name: string;
  instruction: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  recipientName: string;
  upiId: string;
  currency: string;
  enabled: boolean;
}

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ [key: string]: PaymentMethod }>({});
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for plans
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snapshot) => {
      if (snapshot.empty) {
        // Initialize with defaults if empty
        DEFAULT_PLANS.forEach(async (plan) => {
          try {
            await setDoc(doc(db, 'plans', plan.id), plan);
          } catch (e) {
            // Silently fail if not admin, as this is just a convenience initialization
          }
        });
      } else {
        const plansList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        setPlans(plansList);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'plans');
    });

    // Listen for payment methods (Legacy/Default)
    const unsubMethods = onSnapshot(collection(db, 'paymentMethods'), (snapshot) => {
      if (snapshot.empty) {
        // Initialize with defaults if empty
        Object.entries(DEFAULT_PAYMENT_METHODS).forEach(async ([key, method]) => {
          try {
            await setDoc(doc(db, 'paymentMethods', key), method as any);
          } catch (e) {
            // Silently fail if not admin
          }
        });
      } else {
        const methods: { [key: string]: PaymentMethod } = {};
        snapshot.docs.forEach(doc => {
          methods[doc.id] = doc.data() as PaymentMethod;
        });
        setPaymentMethods(methods);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'paymentMethods');
    });

    // Listen for dynamic payment providers
    const unsubProviders = onSnapshot(doc(db, 'settings', 'payments'), (snapshot) => {
      if (snapshot.exists()) {
        setPaymentProviders(snapshot.data().providers || []);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/payments');
      setLoading(false);
    });

    return () => {
      unsubPlans();
      unsubMethods();
      unsubProviders();
    };
  }, []);

  const updatePlan = async (plan: Plan) => {
    await setDoc(doc(db, 'plans', plan.id), plan);
  };

  const updatePaymentMethod = async (key: string, method: PaymentMethod) => {
    await setDoc(doc(db, 'paymentMethods', key), method);
  };

  const updatePaymentProviders = async (providers: PaymentProvider[]) => {
    await setDoc(doc(db, 'settings', 'payments'), { providers });
  };

  return { plans, paymentMethods, paymentProviders, loading, updatePlan, updatePaymentMethod, updatePaymentProviders };
};
