import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
}

export function useCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Coupon[];
      setCoupons(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveCoupon = async (coupon: Coupon) => {
    const { id, ...data } = coupon;
    await setDoc(doc(db, 'coupons', id || data.code.toUpperCase()), data);
  };

  const deleteCoupon = async (id: string) => {
    await deleteDoc(doc(db, 'coupons', id));
  };

  return { coupons, loading, saveCoupon, deleteCoupon };
}
