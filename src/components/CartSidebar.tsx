import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useCoupons } from '../hooks/useCoupons';
import { formatCurrency, generateWhatsAppLink, generateEmailLink } from '../utils/helpers';
import { ShoppingCart, X, Trash2, ArrowRight, Mail } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export function CartSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, removeItem, updateQuantity, cartTotal, totalItems } = useCart();
  const { coupons } = useCoupons();
  const [showCheckout, setShowCheckout] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [shippingOption, setShippingOption] = useState('Retirar em Guarulhos-SP');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  
  const [checkoutStep, setCheckoutStep] = useState<0 | 1 | 2>(0);

  const finalTotal = cartTotal * (1 - appliedDiscount);

  const fetchLeadByEmail = async (email: string) => {
    if (!email || !email.includes('@')) return;
    
    setIsLoadingProfile(true);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'leads', email.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.cnpj) setCnpj(data.cnpj);
        if (data.companyName) setCompanyName(data.companyName);
        if (data.name) setLeadName(data.name);
        if (data.phone) setLeadPhone(data.phone);
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    let masked = value;
    if (value.length > 2) masked = `${value.slice(0, 2)}.${value.slice(2)}`;
    if (value.length > 5) masked = `${masked.slice(0, 6)}.${value.slice(5)}`;
    if (value.length > 8) masked = `${masked.slice(0, 10)}/${value.slice(8)}`;
    if (value.length > 12) masked = `${masked.slice(0, 15)}-${value.slice(12)}`;

    setCnpj(masked);
  };

  const handleApplyCoupon = () => {
    const found = coupons.find(c => c.code === couponCode.toUpperCase());
    if (found) {
      setAppliedDiscount(found.discountPercentage / 100);
      alert(`Cupom de ${found.discountPercentage}% aplicado com sucesso!`);
    } else {
      setAppliedDiscount(0);
      alert('Cupom inválido ou expirado.');
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const orderItems = items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));
    
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      
      // Save proposal
      await addDoc(collection(db, 'proposals'), {
        companyName,
        cnpj,
        leadName,
        leadEmail,
        leadPhone,
        shippingOption,
        total: finalTotal,
        discount: appliedDiscount,
        coupon: couponCode,
        items: orderItems,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      
      // Save or update lead profile
      if (leadEmail) {
        await setDoc(doc(db, 'leads', leadEmail.toLowerCase()), {
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          companyName,
          cnpj,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      
      console.log('Proposta e perfil salvos com sucesso!');
      
    } catch (error) {
      console.error('Erro ao processar proposta:', error);
    }
    
    setIsSubmitting(false);
    
    const link = generateWhatsAppLink(orderItems, finalTotal, companyName, cnpj, shippingOption, leadName, leadEmail, leadPhone);
    window.open(link, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Cotação Ativa</h2>
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  {totalItems}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 bg-slate-50">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <ShoppingCart className="w-16 h-16 opacity-20" />
                  <p className="font-semibold text-slate-500">A cotação está vazia</p>
                  <p className="text-sm text-center">Adicione produtos comerciais para iniciar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-4 p-4 border border-slate-200 bg-white rounded-lg relative shadow-sm">
                      <div className={`w-14 h-14 rounded-md ${item.product.images && item.product.images.length > 0 ? 'bg-white p-1' : `bg-gradient-to-br ${item.product.imageColor}`} shrink-0 overflow-hidden relative border border-slate-100`}>
                        {item.product.images && item.product.images.length > 0 && (
                          <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="pr-8 mb-2">
                          <h4 className="font-bold text-slate-800 text-sm leading-tight mb-0.5">
                            {item.product.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Código Interno</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <p className="font-black text-blue-900 text-sm">{formatCurrency(item.product.price)}</p>
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] uppercase font-bold text-slate-400">Qtd:</label>
                            <input
                              type="number"
                              min={item.product.minQuantity}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= item.product.minQuantity) {
                                  const step = item.product.stepQuantity || 1;
                                  const remainder = val % step;
                                  if (remainder === 0) {
                                    updateQuantity(item.product.id, val);
                                  } else {
                                    updateQuantity(item.product.id, val - remainder + (remainder > step/2 ? step : 0));
                                  }
                                }
                              }}
                              step={item.product.stepQuantity || 1}
                              className="w-16 text-center border-none bg-slate-100 rounded px-1 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-600 transition-colors bg-white hover:bg-red-50 p-1.5 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Checkout Form (Moved into scrollable area) */}
                  {checkoutStep === 1 && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-4 border-t border-slate-200 mt-4"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (leadEmail.includes('@')) {
                          await fetchLeadByEmail(leadEmail);
                          setCheckoutStep(2);
                        }
                      }}
                    >
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                          <Mail className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-blue-900 mb-1">Identificação</h3>
                        <p className="text-xs text-blue-600 mb-4 px-2">Informe seu e-mail para carregar seus dados ou iniciar um novo cadastro.</p>
                        
                        <div className="w-full text-left">
                          <label className="block text-[10px] uppercase font-bold text-blue-700 tracking-wider mb-1">
                            Email
                          </label>
                          <input
                            required
                            type="email"
                            value={leadEmail}
                            onChange={(e) => setLeadEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium mb-3"
                          />
                          <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                          >
                            {isLoadingProfile ? 'BUSCANDO...' : 'CONTINUAR'}
                            {!isLoadingProfile && <ArrowRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </motion.form>
                  )}

                  {checkoutStep === 2 && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-4 border-t border-slate-200 mt-4"
                      id="checkout-form"
                      onSubmit={handleCheckout}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-slate-800 text-sm">Dados do Cadastro</h3>
                        <button type="button" onClick={() => setCheckoutStep(1)} className="text-[10px] text-blue-600 font-bold uppercase hover:underline">
                          Alterar E-mail
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Email Cadastrado</label>
                        <input
                          disabled
                          type="email"
                          value={leadEmail}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none font-medium text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Nome do Contato</label>
                        <input
                          required
                          type="text"
                          value={leadName}
                          onChange={(e) => setLeadName(e.target.value)}
                          placeholder="Seu nome completo"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Telefone / WhatsApp</label>
                          <input
                            required
                            type="tel"
                            value={leadPhone}
                            onChange={(e) => setLeadPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">CNPJ</label>
                          <input
                            required
                            type="text"
                            value={cnpj}
                            onChange={handleCnpjChange}
                            placeholder="00.000.000/0000-00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Razão Social / Fantasia</label>
                        <input
                          required
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Sua Empresa LTDA"
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 mt-2">Opções de Frete</label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm cursor-pointer border p-2 rounded-lg bg-slate-50">
                            <input
                              type="radio"
                              name="shipping"
                              value="Retirar em Guarulhos-SP"
                              checked={shippingOption === 'Retirar em Guarulhos-SP'}
                              onChange={(e) => setShippingOption(e.target.value)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-slate-700">Retirar em Guarulhos-SP</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer border p-2 rounded-lg bg-slate-50">
                            <input
                              type="radio"
                              name="shipping"
                              value="Frete Fob (Por conta do cliente)"
                              checked={shippingOption === 'Frete Fob (Por conta do cliente)'}
                              onChange={(e) => setShippingOption(e.target.value)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-slate-700">Frete FOB (Por conta do cliente)</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer border p-2 rounded-lg bg-slate-50">
                            <input
                              type="radio"
                              name="shipping"
                              value="Frete Cif (A calcular com comercial)"
                              checked={shippingOption === 'Frete Cif (A calcular com comercial)'}
                              onChange={(e) => setShippingOption(e.target.value)}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium text-slate-700">Frete CIF (A calcular com comercial)</span>
                          </label>
                        </div>
                      </div>
                    </motion.form>
                  )}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-slate-200 bg-white p-6 shadow-[0_-4px_10px_rgba(0,0,0,0.02)] shrink-0">
                <div className="mb-4">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Cupom de Desconto</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Ex: B2B10"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-6">
                  <div className="flex flex-col gap-1 w-full">
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between w-full text-sm font-medium text-slate-500 mb-1">
                        <span>Subtotal:</span>
                        <span className="line-through">{formatCurrency(cartTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end w-full">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {appliedDiscount > 0 ? 'Total com Desconto' : 'Subtotal Estimado'}
                      </span>
                      <span className="text-xl font-black text-blue-900">{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>
                </div>

                {checkoutStep === 0 ? (
                  <button
                    onClick={() => setCheckoutStep(1)}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
                  >
                    PROSSEGUIR COM A NEGOCIAÇÃO
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : checkoutStep === 2 ? (
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="submit"
                      form="checkout-form"
                      disabled={isSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-200 text-sm disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        'ENVIANDO...'
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                          </svg>
                          ENVIAR PELO WHATSAPP
                        </>
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
