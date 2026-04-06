import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { PLANS as DEFAULT_PLANS, PAYMENT_METHODS as DEFAULT_PAYMENT_METHODS } from '../constants';

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

export const usePlans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ [key: string]: PaymentMethod }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for plans
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snapshot) => {
      if (snapshot.empty) {
        // Initialize with defaults if empty
        DEFAULT_PLANS.forEach(async (plan) => {
          await setDoc(doc(db, 'plans', plan.id), plan);
        });
      } else {
        const plansList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        setPlans(plansList);
      }
    });

    // Listen for payment methods
    const unsubMethods = onSnapshot(collection(db, 'paymentMethods'), (snapshot) => {
      if (snapshot.empty) {
        // Initialize with defaults if empty
        Object.entries(DEFAULT_PAYMENT_METHODS).forEach(async ([key, method]) => {
          await setDoc(doc(db, 'paymentMethods', key), method as any);
        });
      } else {
        const methods: { [key: string]: PaymentMethod } = {};
        snapshot.docs.forEach(doc => {
          methods[doc.id] = doc.data() as PaymentMethod;
        });
        setPaymentMethods(methods);
      }
      setLoading(false);
    });

    return () => {
      unsubPlans();
      unsubMethods();
    };
  }, []);

  const updatePlan = async (plan: Plan) => {
    await setDoc(doc(db, 'plans', plan.id), plan);
  };

  const updatePaymentMethod = async (key: string, method: PaymentMethod) => {
    await setDoc(doc(db, 'paymentMethods', key), method);
  };

  return { plans, paymentMethods, loading, updatePlan, updatePaymentMethod };
};
