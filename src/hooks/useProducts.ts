import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../data/products';
import { products as staticProducts } from '../data/products';

enum OperationType {
  GET = 'get',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = () => {
      const unsubscribe = onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          if (snapshot.empty) {
            setProducts(staticProducts);
          } else {
            const loadedProducts = snapshot.docs.map((doc) => {
              const data = doc.data();
              const baseProduct = staticProducts.find(p => p.id === doc.id);
              
              return {
                id: doc.id,
                ...baseProduct,
                ...data,
                images: data.images && data.images.length > 0 ? data.images : baseProduct?.images,
                imageColor: data.imageColor || baseProduct?.imageColor
              };
            }) as Product[];
            setProducts(loadedProducts);
          }
          setLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'products');
          setProducts(staticProducts); // Fallback if query fails
          setLoading(false);
        }
      );
      return unsubscribe;
    };
    
    return fetchProducts();
  }, []);

  return { products, loading };
}
