import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, products as staticProducts } from '../data/products';

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

interface ProductsContextType {
  products: Product[];
  loading: boolean;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = () => {
      const unsubscribe = onSnapshot(
        collection(db, 'products'),
        (snapshot) => {
          if (snapshot.empty) {
            setProducts([]);
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
          setProducts([]); // Fallback if query fails
          setLoading(false);
        }
      );
      return unsubscribe;
    };
    
    return fetchProducts();
  }, []);

  return (
    <ProductsContext.Provider value={{ products, loading }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}
