/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductsProvider, useProducts } from './context/ProductsContext';
import { Catalog } from './components/Catalog';
import { CartSidebar } from './components/CartSidebar';
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
import { ShoppingCart, LogIn, ChevronRight, PackageSearch, Settings } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'admin'>('catalog');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { user, login } = useAuth();
  const { items } = useCart();
  const { loading } = useProducts();

  useEffect(() => {
    if (window.location.pathname === '/admin') {
      setActiveTab('admin');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center animate-pulse">
          <img 
            src="https://i.ibb.co/Y70xyGZz/GLOBAL-preferencial-black-1.png" 
            alt="GLOBAL Logo" 
            className="h-16 mb-4 object-contain"
          />
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mt-4"></div>
          <p className="text-slate-500 font-medium mt-4 text-sm tracking-widest uppercase">Carregando Plataforma...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 relative">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-8 shrink-0 shadow-sm sticky top-0 z-50">
        
        {/* Left Side: Company Logo */}
        <div className="flex-1 flex justify-start items-center">
          <div 
            className="cursor-pointer flex items-center"
            onClick={() => {
              setActiveTab('catalog');
              window.history.pushState({}, '', '/');
            }}
          >
            <img 
              src="https://i.ibb.co/Y70xyGZz/GLOBAL-preferencial-black-1.png" 
              alt="GLOBAL preferencial" 
              className="h-8 sm:h-10 object-contain"
            />
          </div>
        </div>

        {/* Center: Ambev Logo */}
        <div className="flex-1 flex justify-center items-center pointer-events-none">
          <img 
            src="https://i.ibb.co/C5vwrcKN/Logo-Ambev1.png" 
            alt="Ambev Logo" 
            className="h-8 sm:h-10 object-contain"
          />
        </div>

        {/* Right Side: Account and Cart */}
        <div className="flex-1 flex justify-end items-center gap-4">
          {!user ? (
            <button onClick={login} className="hidden sm:flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-900 border-r pr-4 border-slate-200">
              <LogIn className="w-4 h-4" /> Entrar
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2 border-r pr-4 border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-slate-400">Portal B2B</p>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsCartOpen(true)}
            className={`relative px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors border ${items.length > 0 ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm animate-pulse' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100'}`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cotação</span>
            {items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow">
                {items.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'catalog' && <Catalog />}
        {activeTab === 'admin' && (
          <React.Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Carregando painel de administração...</div>}>
            <AdminPanel />
          </React.Suspense>
        )}
        
        {/* Footer */}
        <footer className="mt-12 bg-white border-t border-slate-200 py-8 text-center shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
            <div className="w-8 h-8 bg-blue-50 text-blue-700 rounded mb-4 flex items-center justify-center mb-2">
              <span className="text-blue-700 font-bold text-xs">AP</span>
            </div>
            <p className="mb-1 text-sm font-semibold text-slate-600">Portal B2B Integrado via WhatsApp.</p>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Desenvolvido sob medida para gestão de visibilidade em PDVs e Eventos.</p>
          </div>
        </footer>
      </main>

      {/* Floating CTA Button */}
      {items.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full animate-pulse bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2 transition-all hover:scale-105"
          >
            <ShoppingCart className="w-5 h-5" />
            FINALIZAR PEDIDO
          </button>
        </div>
      )}

      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  );
}
