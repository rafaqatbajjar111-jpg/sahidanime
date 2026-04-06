import { Timestamp } from 'firebase/firestore';

export const getSubscriptionExpiration = (duration: 'month' | 'year'): Date => {
  const now = new Date();
  if (duration === 'year') {
    // End of the current year (Start of next year)
    return new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
  } else {
    // End of the current month (Start of next month)
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  }
};

export const isSubscriptionExpired = (expiresAt: any): boolean => {
  if (!expiresAt) return false;
  
  let date: Date;
  if (expiresAt instanceof Timestamp) {
    date = expiresAt.toDate();
  } else if (expiresAt?.seconds) {
    date = new Date(expiresAt.seconds * 1000);
  } else {
    date = new Date(expiresAt);
  }
  
  return date < new Date();
};

export const convertINRToOtherCurrencies = (inrAmount: number) => {
  // Approximate conversion rates
  // 1 INR ≈ 3.3 PKR
  // 1 INR ≈ 1.3 BDT
  // 1 INR ≈ 0.012 USD
  
  return {
    PK: Math.round(inrAmount * 3.3),
    BD: Math.round(inrAmount * 1.3),
    DEFAULT: parseFloat((inrAmount * 0.012).toFixed(2))
  };
};
