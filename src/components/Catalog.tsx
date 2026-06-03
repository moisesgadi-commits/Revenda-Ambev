import React, { useState, useMemo, useEffect } from 'react';
import { Brand } from '../data/products';
import { ProductCard } from './ProductCard';
import { Search, Filter, ShoppingBag, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';

export function Catalog() {
  const { products, loading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<Brand | 'Todas'>('Todas');

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBrand = selectedBrand === 'Todas' || product.brand === selectedBrand;
      return matchesSearch && matchesBrand;
    }).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [products, searchTerm, selectedBrand]);

  const brands: (Brand | 'Todas')[] = ['Todas', 'Corona', 'Brahma', 'Chopp Brahma', 'Budweiser', 'Stella Artois', 'Bohemia', 'Spaten', 'Colorado'];

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto">
      {/* Banner Section - Place for full-width image */}
      <div className="w-full h-[150px] sm:h-[300px] mb-8 bg-white flex items-center justify-center rounded-xl shadow-sm overflow-hidden">
        <img src="https://i.ibb.co/gF73hv4t/Produtos.png" alt="Banner Produtos" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-blue-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-700" /> 
          PRODUTOS B2B
        </h2>
        
        <div className="flex gap-3 items-center w-full overflow-x-auto pb-4 scrollbar-hide pt-2">
          {brands.map((brand) => {
            const brandLogos: Record<string, string> = {
              'Corona': 'https://i.ibb.co/s9v7MYsV/Logo-Corona.png',
              'Brahma': 'https://i.ibb.co/DH6nXzJZ/Logo-Duplo-Malte.png',
              'Chopp Brahma': 'https://i.ibb.co/WNq5kPqJ/Logo-Chop-Brahma.png',
              'Budweiser': 'https://i.ibb.co/v4gzjPvj/Logo-Budweiser.png',
              'Stella Artois': 'https://i.ibb.co/r21XmW1b/Logo-Stella-Artois.png',
              'Bohemia': 'https://i.ibb.co/SDk6wJSC/Logo-Bohemia.png',
              'Spaten': 'https://i.ibb.co/XR4VGrC/Logo-Spaten.png',
              'Colorado': 'https://i.ibb.co/35MPfrq9/Logo-Colorado.png'
            };

            return (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                title={brand}
                className={`relative flex items-center justify-center p-2 rounded-xl transition-all border shrink-0 ${
                  selectedBrand === brand
                    ? 'border-blue-500 bg-white shadow-[0_0_0_2px_rgba(59,130,246,0.3)]'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                }`}
                style={{ width: '70px', height: '70px' }}
              >
                {brand === 'Todas' ? (
                  <span className={`text-[11px] font-bold uppercase text-center ${selectedBrand === brand ? 'text-blue-700' : 'text-slate-500'}`}>Todos</span>
                ) : (
                  <img 
                    src={brandLogos[brand]} 
                    alt={brand} 
                    className="w-full h-full object-contain" 
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="catalog-search"
            type="text"
            placeholder="Pesquisar SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Nenhum produto encontrado</h3>
          <p className="text-xs text-slate-500">Tente ajustar seus filtros de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
