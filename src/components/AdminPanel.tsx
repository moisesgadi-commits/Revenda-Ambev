import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../hooks/useProducts';
import { useCoupons, Coupon } from '../hooks/useCoupons';
import { LogIn, LogOut, Package, RefreshCw, Plus, Edit, Image as ImageIcon, Ticket, Trash2, FileText } from 'lucide-react';
import { doc, setDoc, collection, getDocs, query, orderBy, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { products as staticProducts, Product } from '../data/products';

export function AdminPanel() {
  const { user, isAdmin, login, logout } = useAuth();
  const { products, loading } = useProducts();
  const { coupons, saveCoupon, deleteCoupon } = useCoupons();
  
  const [syncing, setSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchProposals();
    }
  }, [isAdmin]);

  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const q = query(collection(db, 'proposals'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setProposals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching proposals:', error);
    }
    setLoadingProposals(false);
  };

  const handleDeleteProposal = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta solicitação?')) {
      try {
        await deleteDoc(doc(db, 'proposals', id));
        setProposals(proposals.filter(p => p.id !== id));
      } catch (error) {
        alert('Erro ao excluir solicitação.');
      }
    }
  };

  const handleSyncInitialData = async () => {
    setSyncing(true);
    try {
      for (const p of staticProducts) {
        const { id, ...data } = p;
        await setDoc(doc(db, 'products', p.id), data);
      }
      alert('Produtos sincronizados com sucesso!');
    } catch (e) {
      alert('Erro ao sincronizar produtos: ' + e);
    }
    setSyncing(false);
  };

  const handleCreateProduct = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      name: '',
      brand: 'Chopp Brahma',
      category: 'Cervegela',
      price: 0,
      minQuantity: 100,
      stepQuantity: 1,
      productionTime: '30 Dias',
      imageColor: 'from-slate-200 to-slate-300',
      images: []
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const { id, ...data } = editingProduct;
      await setDoc(doc(db, 'products', editingProduct.id), data);
      setEditingProduct(null);
      alert('Produto salvo com sucesso!');
    } catch(e) {
      alert('Erro ao salvar.');
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;
    try {
      await saveCoupon({
        id: newCouponCode.toUpperCase(),
        code: newCouponCode.toUpperCase(),
        discountPercentage: newCouponDiscount
      });
      setNewCouponCode('');
      setNewCouponDiscount(10);
      alert('Cupom adicionado!');
    } catch(e) {
      alert('Erro ao adicionar cupom.');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Acesso Administrativo</h2>
        <button 
          onClick={login}
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2"
        >
          <LogIn className="w-5 h-5" /> Fazer login com Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Acesso Negado</h2>
        <p className="text-slate-600 mb-6">Você não tem permissão para acessar esta área.</p>
        <button 
          onClick={logout}
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-3 rounded-lg font-bold"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-blue-900">Painel do Administrador</h2>
          <p className="text-sm text-slate-500">Gerencie produtos e tabelas de preço.</p>
        </div>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800 flex flex-col items-center">
          <LogOut className="w-5 h-5 mb-1" />
          Sair
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Catálogo B2B
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCreateProduct}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Criar Produto
            </button>
            <button 
              onClick={handleSyncInitialData}
              disabled={syncing}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md font-bold flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar Mockup
            </button>
          </div>
        </div>

        <div className="p-6">
          {products.length === 0 && !loading && (
            <div className="text-center py-10 opacity-60">
              <p>Nenhum produto cadastrado.</p>
              <p className="text-xs mt-1">Dica: Use "Sincronizar Mockup" acima para carregar a base modelo.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <div key={p.id} className="border border-slate-200 rounded-lg p-3 flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded ${p.images && p.images.length > 0 ? 'bg-white p-1' : `bg-gradient-to-br ${p.imageColor}`} shrink-0 overflow-hidden relative border border-slate-100`}>
                    {p.images && p.images.length > 0 && <img src={p.images[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{p.brand} &bull; R$ {p.price}</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setEditingProduct(p)}
                  className="mt-auto w-full border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  <Edit className="w-3 h-3 inline mr-1" /> Editar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg text-slate-800">Editar Produto</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-800 font-bold px-2 py-1">X</button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Produto</label>
                <input required type="text" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link da Imagem</label>
                <input type="url" value={editingProduct.images?.[0] || ''} onChange={e => setEditingProduct({...editingProduct, images: [e.target.value]})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$)</label>
                  <input required type="number" step="0.01" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Marca</label>
                  <select required value={editingProduct.brand} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="Corona">Corona</option>
                    <option value="Brahma">Brahma</option>
                    <option value="Chopp Brahma">Chopp Brahma</option>
                    <option value="Budweiser">Budweiser</option>
                    <option value="Stella Artois">Stella Artois</option>
                    <option value="Bohemia">Bohemia</option>
                    <option value="Spaten">Spaten</option>
                    <option value="Colorado">Colorado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pedido Mínimo</label>
                  <input required type="number" value={editingProduct.minQuantity} onChange={e => setEditingProduct({...editingProduct, minQuantity: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qntd em Caixa</label>
                  <input type="number" value={editingProduct.stepQuantity || 1} onChange={e => setEditingProduct({...editingProduct, stepQuantity: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade Exibição (Opcional)</label>
                  <input type="number" value={editingProduct.priority || 0} onChange={e => setEditingProduct({...editingProduct, priority: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Maior = aparece antes" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 border border-slate-300 text-slate-600 rounded py-2 font-bold hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-700 text-white rounded py-2 font-bold hover:bg-blue-800">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-green-600" />
            Cupons de Desconto
          </h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleAddCoupon} className="flex flex-col sm:flex-row gap-4 items-end mb-6">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código do Cupom</label>
              <input required type="text" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value)} placeholder="Ex: B2B20" className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none uppercase" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desconto (%)</label>
              <input required type="number" min="1" max="100" value={newCouponDiscount} onChange={e => setNewCouponDiscount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded">
              Adicionar
            </button>
          </form>

          {coupons.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-y border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Desconto (%)</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coupons.map(coupon => (
                    <tr key={coupon.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-800">{coupon.code}</td>
                      <td className="px-4 py-3">{coupon.discountPercentage}%</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteCoupon(coupon.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4 ml-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Tabelas de Preços Regionais
          </h3>
        </div>
        <div className="p-6 text-center">
          <p className="text-slate-600 font-medium">Você pode configurar as tabelas de preços por capital/interior brevemente.</p>
          <button disabled className="mt-4 bg-slate-200 text-slate-500 font-bold px-4 py-2 rounded">
            <Plus className="w-4 h-4 inline mr-2" /> Adicionar Tabela
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Solicitações e Propostas
          </h3>
          <button 
            onClick={fetchProposals}
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md font-bold flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loadingProposals ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
        <div className="p-6">
          {loadingProposals ? (
            <div className="text-center py-6 text-slate-500">Carregando...</div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-10 opacity-60">
              <p>Nenhuma solicitação recebida ainda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-y border-slate-200 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {proposals.map(proposal => (
                    <tr key={proposal.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(proposal.createdAt).toLocaleDateString()} {new Date(proposal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{proposal.companyName}</div>
                        <div className="text-xs text-slate-500">{proposal.cnpj}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{proposal.leadName}</div>
                        <div className="text-xs">{proposal.leadEmail}</div>
                        <div className="text-xs">{proposal.leadPhone}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        R$ {proposal.total?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded uppercase">
                          {proposal.status || 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteProposal(proposal.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4 ml-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
