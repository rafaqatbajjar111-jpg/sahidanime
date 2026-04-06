export const PLANS = [
  {
    id: 'garib_pro_max',
    name: 'Garib Pro Max',
    description: 'Perfect for casual viewers who want ad-free experience.',
    prices: {
      IN: { amount: 50, currency: 'INR', symbol: '₹', duration: 'month' },
      PK: { amount: 100, currency: 'PKR', symbol: 'Rs.', duration: 'month' },
      BD: { amount: 100, currency: 'BDT', symbol: '৳', duration: 'month' },
      DEFAULT: { amount: 1.49, currency: 'USD', symbol: '$', duration: 'month' }
    },
    benefits: ['Ad-free streaming', 'HD Quality', 'Basic Support', 'Mobile Access']
  },
  {
    id: 'vip',
    name: 'VIP 👑',
    description: 'The ultimate experience for true anime fans.',
    prices: {
      IN: { amount: 100, currency: 'INR', symbol: '₹', duration: 'month' },
      PK: { amount: 150, currency: 'PKR', symbol: 'Rs.', duration: 'month' },
      BD: { amount: 150, currency: 'BDT', symbol: '৳', duration: 'month' },
      DEFAULT: { amount: 2.49, currency: 'USD', symbol: '$', duration: 'month' }
    },
    benefits: ['All Garib Pro Max features', 'Ultra HD 4K', 'Early Access', 'Priority Support', 'Offline Downloads']
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    description: 'Save big with our most value-packed annual subscription.',
    prices: {
      IN: { amount: 800, currency: 'INR', symbol: '₹', duration: 'year' },
      PK: { amount: 1200, currency: 'PKR', symbol: 'Rs.', duration: 'year' },
      BD: { amount: 1200, currency: 'BDT', symbol: '৳', duration: 'year' },
      DEFAULT: { amount: 12.99, currency: 'USD', symbol: '$', duration: 'year' }
    },
    benefits: ['Everything in VIP', '2 Months Free', 'Exclusive Badge', 'Special Discord Role', 'Beta Feature Access']
  }
];

export const PAYMENT_METHODS: any = {
  IN: {
    method: 'UPI',
    details: '8343830288',
    name: 'Sahid Anime 4 You/Sk Hamja',
    instruction: 'Payment karke niche Transaction ID/UTR submit karein'
  },
  PK: {
    method: 'EasyPaisa/JazzCash',
    details: '03475048897',
    name: 'Sahid Anime 4 You',
    instruction: 'Payment karke niche Transaction ID submit karein'
  },
  BD: {
    method: 'bKash/Nagad',
    details: 'bKash: +8801306984036, Nagad: 01747263491',
    name: 'Sahid Anime 4 You',
    instruction: 'Payment karke niche Transaction ID submit karein'
  },
  DEFAULT: {
    method: 'International Card',
    details: 'Contact Admin',
    name: 'Support',
    instruction: 'Please contact admin for international payments'
  }
};
