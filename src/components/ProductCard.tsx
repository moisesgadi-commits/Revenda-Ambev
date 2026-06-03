import React, { useState } from 'react';
import { Product } from '../data/products';
import { formatCurrency } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Plus, Minus, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(product.minQuantity);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const handleAdd = () => {
    setIsModalOpen(true);
    setCurrentImgIndex(0);
  };

  const confirmAdd = () => {
    addItem(product, quantity);
    setIsModalOpen(false);
  };

  const step = product.stepQuantity || 1;
  const increment = () => setQuantity((q) => q + step);
  const decrement = () => setQuantity((q) => Math.max(product.minQuantity, q - step));

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow">
        <div className={`relative aspect-square ${product.images && product.images.length > 0 ? 'bg-white p-2' : `bg-gradient-to-br ${product.imageColor}`} rounded-lg mb-4 flex flex-col justify-end overflow-hidden group p-4`}>
          {product.images && product.images.length > 0 && (
            <img 
              src={product.images[0]} 
              alt={product.name}
              className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded z-10">
            HOMOLOGADO
          </div>
          <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white text-[10px] font-bold tracking-wider z-10">
            {product.brand}
          </div>
          
          {/* Abstract light reflection to make gradient pop */}
          {(!product.images || product.images.length === 0) && (
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all z-0"></div>
          )}
        </div>
        
        <div className="flex flex-col flex-grow">
          <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{product.name}</h4>
          <p className="text-xs text-slate-500 mb-3">
            Mín: {product.minQuantity} un. | Prazo: {product.productionTime}
            {product.stepQuantity && product.stepQuantity > 1 && ` | Caixa: ${product.stepQuantity} un.`}
          </p>

          <div className="flex flex-col gap-1 mb-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] text-blue-600 font-bold uppercase">Preço Lote</span>
              <span className="text-lg font-black text-blue-900">{formatCurrency(product.price)}</span>
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={handleAdd}
              className="w-full bg-blue-50 text-blue-700 border border-blue-100 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 hover:text-white transition-colors uppercase tracking-wider"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Confirmar Pedido</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex gap-4 mb-6">
                <div className={`relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 ${product.images && product.images.length > 0 ? 'bg-white' : `bg-gradient-to-br ${product.imageColor}`} rounded-lg flex items-center justify-center overflow-hidden`}>
                  {product.images && product.images.length > 0 ? (
                    <>
                      <img 
                        src={product.images[currentImgIndex]} 
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      {product.images.length > 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev - 1 + product.images!.length) % product.images!.length); }}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/90 z-10"
                          >
                            <ChevronLeft className="w-4 h-4 text-slate-800" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(prev => (prev + 1) % product.images!.length); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/90 z-10"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-800" />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-12 h-12 bg-white/20 rounded-full blur-md"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">{product.name}</h4>
                  <p className="text-sm text-slate-500 mb-2">Marca: {product.brand}</p>
                  <p className="text-sm font-semibold text-blue-600">{formatCurrency(product.price)} / unidade</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Quantidade Desejada
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={decrement}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-600 transition-colors"
                    disabled={quantity <= product.minQuantity}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= product.minQuantity) {
                        const remainder = val % step;
                        if (remainder === 0) {
                          setQuantity(val);
                        } else {
                          setQuantity(val - remainder + (remainder > step/2 ? step : 0));
                        }
                      }
                    }}
                    step={step}
                    min={product.minQuantity}
                    className="flex-1 text-center border-none bg-white font-bold text-lg rounded-lg py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={increment}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 text-center">
                  Mínimo: {product.minQuantity} un. 
                  {product.stepQuantity && product.stepQuantity > 1 && ` | Incremento: ${product.stepQuantity} un.`}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-600">Total do Item:</span>
                  <span className="text-xl font-black text-slate-800">{formatCurrency(product.price * quantity)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAdd}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
