import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductsContext';
import { useCoupons, Coupon } from '../hooks/useCoupons';
import { LogIn, LogOut, Package, RefreshCw, Plus, Edit, Image as ImageIcon, Ticket, Trash2, FileText, Truck, Users, Upload, Download, Eye, MessageCircle, Search } from 'lucide-react';
import { doc, setDoc, collection, getDocs, query, orderBy, deleteDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { products as staticProducts, Product } from '../data/products';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function AdminPanel() {
  const { user, isAdmin, login, logout } = useAuth();
  const { products, loading } = useProducts();
  const { coupons, saveCoupon, deleteCoupon } = useCoupons();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'freight' | 'coupons' | 'proposals' | 'clients'>('catalog');
  
  const [syncing, setSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [viewProposal, setViewProposal] = useState<any>(null);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [freightRates, setFreightRates] = useState<Record<string, { capital: number, interior: number, capitalDeliveryTime?: number, interiorDeliveryTime?: number }>>({});
  const [savingFreight, setSavingFreight] = useState(false);

  const [bulkImportFreight, setBulkImportFreight] = useState(false);
  const [bulkFreightText, setBulkFreightText] = useState('');
  
  const [bulkImportProducts, setBulkImportProducts] = useState(false);
  const [bulkProductsText, setBulkProductsText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    );
  });

  useEffect(() => {
    if (isAdmin) {
      fetchProposals();
      fetchFreightConfig();
    }
  }, [isAdmin]);

  const fetchFreightConfig = async () => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const docSnap = await getDoc(doc(db, 'settings', 'freight_v3'));
      if (docSnap.exists()) {
        setFreightRates(docSnap.data().rates || {});
      } else {
        const defaultRates = await import('../data/freight.json');
        setFreightRates(defaultRates.default);
      }
    } catch (error) {
      console.error('Error fetching freight config:', error);
    }
  };

  const saveFreightConfig = async () => {
    setSavingFreight(true);
    try {
      await setDoc(doc(db, 'settings', 'freight_v3'), {
        rates: freightRates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('Tabela de frete salva com sucesso!');
    } catch (error) {
      console.error('Error saving freight config:', error);
      alert('Erro ao salvar tabela de frete.');
    }
    setSavingFreight(false);
  };

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

  const handleDeleteProposal = (id: string) => {
    setProposalToDelete(id);
  };

  const executeDeleteProposal = async () => {
    if (!proposalToDelete) return;
    try {
      await deleteDoc(doc(db, 'proposals', proposalToDelete));
      setProposals(proposals.filter(p => p.id !== proposalToDelete));
      setProposalToDelete(null);
    } catch (error) {
      alert('Erro ao excluir solicitação.');
      setProposalToDelete(null);
    }
  };

  const generateProposalPDF = (proposal: any) => {
    const doc = new jsPDF() as any;
    const addText = (text: string, x: number, y: number, size = 10, align = 'left', bold = false) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, x, y, { align: align as 'left'|'center'|'right' });
    };

    addText("GLOBAL PRODUCTS SOLUTIONS LATIN AMERICA INDÚSTRIA E COMÉRCIO S.A.", 105, 20, 14, 'center', true);
    addText("03.977.536/0001-50", 105, 26, 10, 'center');
    addText("Alameda Tocantins, n° 630, galpão 1, Centro Industrial e Empresarial Alphaville,", 105, 32, 10, 'center');
    addText("CEP 06455-020 – Barueri - SP", 105, 38, 10, 'center');

    addText("DADOS DO CLIENTE", 14, 55, 12, 'left', true);
    addText(`Razão Social / Nome: ${proposal.companyName || proposal.leadName || ''}`, 14, 62);
    addText(`CNPJ: ${proposal.cnpj || 'Não informado'}`, 14, 68);
    addText(`Endereço: ${proposal.address || ''}, ${proposal.addressNumber || ''} - ${proposal.neighborhood || ''}`, 14, 74);
    addText(`CEP: ${proposal.cep || ''} - ${proposal.city || ''}/${proposal.addressState || ''}`, 14, 80);
    addText(`Contato: ${proposal.leadName || ''} (${proposal.leadPhone || ''}) - ${proposal.leadEmail || ''}`, 14, 86);
    addText(`Horário de Entrega: ${proposal.deliverySchedule || 'Não informado'}`, 14, 92);

    addText("DETALHES DA PROPOSTA", 14, 105, 12, 'left', true);

    const head = [['Item', 'Descrição', 'Qtd', 'Vol/Cx', 'Dimensões (LxAxP)', 'Preço Un.', 'Subtotal']];
    let maxProductionTime = 0;
    const body = (proposal.items || []).map((item: any, i: number) => {
        const prodTime = parseInt(item.productionTime) || 0;
        if (prodTime > maxProductionTime) maxProductionTime = prodTime;
        return [
           String(i + 1),
           item.name,
           item.quantity,
           item.stepQuantity || 1,
           `${item.packageWidth||0}x${item.packageHeight||0}x${item.packageDepth||0} cm`,
           `R$ ${Number(item.price || 0).toFixed(2)}`,
           `R$ ${(item.quantity * Number(item.price || 0)).toFixed(2)}`
        ];
    });

    autoTable(doc, {
        startY: 110,
        head,
        body,
        theme: 'striped',
        headStyles: { fillColor: [40, 96, 144] }
    });

    let currentY = doc.lastAutoTable.finalY + 15;
    
    const checkPageBreak = (yAdded: number) => {
      if (currentY + yAdded > 280) {
         doc.addPage();
         currentY = 20;
      }
    };
    
    checkPageBreak(50);
    
    const propDate = new Date(proposal.createdAt || Date.now());
    const productionEnd = new Date(propDate);
    productionEnd.setDate(productionEnd.getDate() + maxProductionTime);
    
    const freightDays = proposal.freightDeliveryTime || 0;
    const deliveryEnd = new Date(productionEnd);
    deliveryEnd.setDate(deliveryEnd.getDate() + freightDays);

    const pd = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;

    addText("RESUMO FINANCEIRO E PRAZOS", 14, currentY, 12, 'left', true); currentY += 8;
    addText(`Frete Estimado: R$ ${Number(proposal.freightValue || 0).toFixed(2)} (${proposal.shippingOption || ''})`, 14, currentY); currentY += 6;
    addText(`Desconto Aplicado: ${(Number(proposal.discount || 0) * 100).toFixed(2)}%`, 14, currentY); currentY += 6;
    addText(`Total Final: R$ ${Number(proposal.total || 0).toFixed(2)}`, 14, currentY, 11, 'left', true); currentY += 8;

    addText(`Prazo de Produção Máximo: ${maxProductionTime} dias`, 14, currentY); currentY += 6;
    addText(`Data Estimada de Finalização de Produção: ${pd(productionEnd)}`, 14, currentY); currentY += 6;
    addText(`Tempo de Transporte Logístico: ${freightDays} dias`, 14, currentY); currentY += 6;
    addText(`Data Estimada de Entrega: ${pd(deliveryEnd)}`, 14, currentY); currentY += 12;

    checkPageBreak(50);

    addText("CONDIÇÕES DE PAGAMENTO", 14, currentY, 12, 'left', true); currentY += 8;
    addText(`Pagamento em: ${proposal.paymentTerm || '30 DDL'} após emissão da fatura.`, 14, currentY); currentY += 12;

    addText("CONTATOS CONTAS B2B", 14, currentY, 12, 'left', true); currentY += 8;
    addText("Vinicius Silva, Analista de contas", 14, currentY); currentY += 6;
    addText("vinicius.silva@gpsproducts.com.br", 14, currentY); currentY += 6;
    addText("Cel/Whatsapp: 11 99409-0984", 14, currentY); currentY += 10;
    
    addText("Moisés Gadi, Diretor de contas", 14, currentY); currentY += 6;
    addText("moises.gadi@gpsproducts.com.br", 14, currentY); currentY += 6;
    addText("Cel/Whatsapp: 11 96995-4217", 14, currentY); currentY += 10;

    checkPageBreak(20);

    const limitDate = new Date(propDate);
    limitDate.setDate(limitDate.getDate() + 5);
    addText(`Proposta válida até: ${pd(limitDate)}`, 14, currentY, 10, 'left', true);

    const safeName = (proposal.cnpj || proposal.companyName || 'Lead').replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Proposta_${safeName}.pdf`);
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
      images: [],
      packageWidth: 0,
      packageHeight: 0,
      packageDepth: 0,
      packageWeight: 0
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id) return;
    try {
      const { id, ...data } = editingProduct;
      await setDoc(doc(db, 'products', editingProduct.id), data);
      setEditingProduct(null);
      alert('Produto salvo com sucesso!');
    } catch(e) {
      alert('Erro ao salvar.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (e) {
      alert('Erro ao excluir: ' + e);
    }
  };

  const handleBulkProducts = async () => {
    try {
      const rows = bulkProductsText.trim().split('\n');
      if (rows.length < 2) return alert('Copie os cabeçalhos junto com as linhas (Nome, Marca, Preço, etc).');
      
      let separator = '\t';
      if (!rows[0].includes('\t')) {
         if (rows[0].includes(';')) separator = ';';
         else if (rows[0].includes(',')) separator = ',';
      }

      const headers = rows[0].split(separator).map((h: string) => h.trim().toLowerCase());
      
      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(separator);
        if (columns.length < 2) continue;
        
        let prodData: any = { imageColor: 'from-slate-200 to-slate-300', images: [] };
        
        headers.forEach((header, index) => {
           const val = columns[index]?.trim();
           if (!val) return;
           if (header === 'id' || header.includes('codigo')) prodData.id = val;
           if (header.includes('nome')) prodData.name = val;
           if (header.includes('marca')) prodData.brand = val;
           if (header.includes('categoria')) prodData.category = val;
           if (header.includes('preço') || header.includes('preco')) prodData.price = parseFloat(val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',','.'));
           if (header.includes('mínim') || header.includes('minim')) prodData.minQuantity = parseInt(val);
           if (header.includes('caixa')) prodData.stepQuantity = parseInt(val);
           if (header.includes('prazo')) prodData.productionTime = val;
           if (header.includes('largura')) prodData.packageWidth = parseFloat(val.replace(',','.'));
           if (header.includes('altura')) prodData.packageHeight = parseFloat(val.replace(',','.'));
           if (header.includes('profundidade')) prodData.packageDepth = parseFloat(val.replace(',','.'));
           if (header.includes('peso')) prodData.packageWeight = parseFloat(val.replace(',','.'));
           if (header.includes('prioridade')) prodData.priority = parseInt(val);
           if (header.includes('imagem')) prodData.images = val.split(/[;,]/).map(v => v.trim()).filter(Boolean);
        });
        
        if (!prodData.id) prodData.id = `prod-${Date.now()}-${i}`;
        
        if (prodData.name && !isNaN(prodData.price)) {
          // ensure required fields have some default
          if (!prodData.brand) prodData.brand = 'Outros';
          if (!prodData.category) prodData.category = 'Outros';
          if (!prodData.minQuantity) prodData.minQuantity = 10;
          if (!prodData.stepQuantity) prodData.stepQuantity = 1;
          await setDoc(doc(db, 'products', prodData.id), prodData);
          count++;
        }
      }
      alert(`${count} produtos importados com sucesso!`);
      setBulkImportProducts(false);
      setBulkProductsText('');
    } catch (e) {
      alert('Erro na importação de produtos. Verifique o formato.');
    }
  };

  const handleBulkFreight = async () => {
    try {
      const rows = bulkFreightText.trim().split('\n');
      if (rows.length < 2) return alert('Copie os cabeçalhos (UF, Type, Value, Prazo). Ex: SP;C; 2.173,03 ;3');
      
      let separator = ';';
      if (rows[0].includes('\t')) separator = '\t';
      else if (rows[0].includes(',')) separator = ',';

      const newRates = { ...freightRates };
      let count = 0;
      
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(separator);
        if (columns.length >= 4) {
           const uf = columns[0].trim().toUpperCase();
           if (uf.length === 2 || uf.length > 0) {
             const cleanUf = uf.substring(0, 2);
             const type = columns[1].trim().toUpperCase();
             const val = parseFloat(columns[2].replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.').trim()) || 0;
             const prazo = parseInt(columns[3].trim()) || 0;
             
             if (!newRates[cleanUf]) {
               newRates[cleanUf] = { capital: 0, interior: 0, capitalDeliveryTime: 0, interiorDeliveryTime: 0 };
             }
             
             if (type === 'C' || type === 'CAPITAL') {
               newRates[cleanUf] = { ...newRates[cleanUf], capital: val, capitalDeliveryTime: prazo };
             } else {
               newRates[cleanUf] = { ...newRates[cleanUf], interior: val, interiorDeliveryTime: prazo };
             }
             count++;
           }
        }
      }
      setFreightRates(newRates);
      
      setSavingFreight(true);
      await setDoc(doc(db, 'settings', 'freight_v3'), {
        rates: newRates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSavingFreight(false);
      
      alert(`${count} estados atualizados com sucesso!`);
      setBulkImportFreight(false);
      setBulkFreightText('');
    } catch (e) {
      alert('Erro na importação de frete.');
      setSavingFreight(false);
    }
  };

  const handleExportProducts = () => {
    const headers = ["ID", "Nome", "Marca", "Categoria", "Preço", "Caixa", "Minim", "Prazo", "Largura", "Altura", "Profundidade", "Peso", "Prioridade", "Imagem"];
    const rows = products.map((p: any) => [
      p.id || '',
      p.name || '',
      p.brand || '',
      p.category || '',
      p.price ? p.price.toString().replace('.', ',') : '',
      p.stepQuantity || 1,
      p.minQuantity || 1,
      p.productionTime || '',
      p.packageWidth ? p.packageWidth.toString().replace('.', ',') : '',
      p.packageHeight ? p.packageHeight.toString().replace('.', ',') : '',
      p.packageDepth ? p.packageDepth.toString().replace('.', ',') : '',
      p.packageWeight ? p.packageWeight.toString().replace('.', ',') : '',
      p.priority || 0,
      p.images ? p.images.join(';') : ''
    ]);
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFreight = () => {
    const headers = ["ESTADO", "CAPITAL/INTERIOR", "Valor por Metro Cubico", "prazo"];
    const ufs = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    const rows: string[][] = [];
    ufs.forEach(uf => {
      const rates = freightRates[uf] || { capital: 0, interior: 0, capitalDeliveryTime: 0, interiorDeliveryTime: 0 };
      rows.push([uf, "C", rates.capital ? rates.capital.toString().replace('.', ',') : '0,00', (rates.capitalDeliveryTime || 0).toString()]);
      rows.push([uf, "I", rates.interior ? rates.interior.toString().replace('.', ',') : '0,00', (rates.interiorDeliveryTime || 0).toString()]);
    });
    const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fretes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-blue-900">Painel do Administrador</h2>
          <p className="text-sm text-slate-500">Gerencie produtos, tabelas de preço, cupons e mais.</p>
        </div>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800 flex flex-col items-center">
          <LogOut className="w-5 h-5 mb-1" />
          Sair
        </button>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-slate-200">
        <button onClick={() => setActiveTab('catalog')} className={`px-4 py-2 font-bold text-sm rounded-t-lg border-b-2 transition-colors ${activeTab === 'catalog' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
          <Package className="w-4 h-4 inline mr-2" /> Catálogo
        </button>
        <button onClick={() => setActiveTab('freight')} className={`px-4 py-2 font-bold text-sm rounded-t-lg border-b-2 transition-colors ${activeTab === 'freight' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
          <Truck className="w-4 h-4 inline mr-2" /> Frete
        </button>
        <button onClick={() => setActiveTab('coupons')} className={`px-4 py-2 font-bold text-sm rounded-t-lg border-b-2 transition-colors ${activeTab === 'coupons' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
          <Ticket className="w-4 h-4 inline mr-2" /> Cupons
        </button>
        <button onClick={() => setActiveTab('proposals')} className={`px-4 py-2 font-bold text-sm rounded-t-lg border-b-2 transition-colors ${activeTab === 'proposals' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
          <FileText className="w-4 h-4 inline mr-2" /> Propostas
        </button>
        <button onClick={() => setActiveTab('clients')} className={`px-4 py-2 font-bold text-sm rounded-t-lg border-b-2 transition-colors ${activeTab === 'clients' ? 'border-blue-600 text-blue-800 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
          <Users className="w-4 h-4 inline mr-2" /> Clientes
        </button>
      </div>

      {activeTab === 'catalog' && (
      <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Catálogo B2B
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={handleExportProducts}
              className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md font-bold flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Baixar Planilha
            </button>
            <button 
              onClick={() => setBulkImportProducts(true)}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md font-bold flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Importar Planilha
            </button>
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
          <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between md:items-center">
            <div className="relative flex-1 max-w-md">
              <input 
                type="text" 
                placeholder="Buscar por nome, marca ou categoria..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <div className="text-sm font-medium text-slate-500">
               Mostrando {filteredProducts.length} produtos
            </div>
          </div>

          {products.length === 0 && !loading && (
            <div className="text-center py-10 opacity-60">
              <p>Nenhum produto cadastrado.</p>
              <p className="text-xs mt-1">Dica: Use "Sincronizar Mockup" acima para carregar a base modelo.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(p => (
              <div key={p.id} className="border border-slate-200 rounded-lg p-3 flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded ${p.images && p.images.length > 0 ? 'bg-white p-1' : `bg-gradient-to-br ${p.imageColor}`} shrink-0 overflow-hidden relative border border-slate-100`}>
                    {p.images && p.images.length > 0 && <img src={p.images[0]} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{p.brand} &bull; R$ {p.price}</p>
                  </div>
                </div>
                
                <div className="mt-auto flex gap-2">
                  <button 
                    onClick={() => setEditingProduct(p)}
                    className="flex-1 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 py-1.5 rounded text-xs font-bold transition-colors"
                  >
                    <Edit className="w-3 h-3 inline mr-1" /> Editar
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(p.id)}
                    className="w-8 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
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
                    <option value="Outros">Outros</option>
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
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prazo de Produção (Dias)</label>
                  <input type="text" value={editingProduct.productionTime || ''} onChange={e => setEditingProduct({...editingProduct, productionTime: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 30" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prioridade Exibição (Opcional)</label>
                  <input type="number" value={editingProduct.priority || 0} onChange={e => setEditingProduct({...editingProduct, priority: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Maior = aparece antes" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Largura (cm)</label>
                  <input type="number" value={editingProduct.packageWidth || 0} onChange={e => setEditingProduct({...editingProduct, packageWidth: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Altura (cm)</label>
                  <input type="number" value={editingProduct.packageHeight || 0} onChange={e => setEditingProduct({...editingProduct, packageHeight: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 40" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profundidade (cm)</label>
                  <input type="number" value={editingProduct.packageDepth || 0} onChange={e => setEditingProduct({...editingProduct, packageDepth: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 30" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Peso (kg)</label>
                  <input type="number" step="0.01" value={editingProduct.packageWeight || 0} onChange={e => setEditingProduct({...editingProduct, packageWeight: parseFloat(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: 5.5" />
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

      {bulkImportProducts && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-screen flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                Importar Produtos (CSV/TSV)
              </h3>
              <button onClick={() => setBulkImportProducts(false)} className="text-slate-400 hover:text-slate-800 font-bold px-2 py-1">X</button>
            </div>
            <div className="p-6 flex-1 flex flex-col min-h-0">
               <div className="flex justify-between items-start gap-4 mb-4">
                 <p className="text-sm text-slate-600">
                   Selecione um arquivo CSV/Excel ou cole as células abaixo. O sistema mapeará as colunas: <strong>ID, Nome, Marca, Categoria, Preço, Caixa, Minim, Prazo, Largura, Altura, Profundidade, Peso, e Imagem.</strong> (Use "ID" para atualizar produtos existentes)
                 </p>
                 <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded text-xs cursor-pointer whitespace-nowrap">
                   Selecionar Arquivo
                   <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       const reader = new FileReader();
                       reader.onload = (ev) => {
                           if (ev.target?.result) setBulkProductsText(ev.target.result as string);
                       };
                       reader.readAsText(file);
                   }} />
                 </label>
               </div>
               <textarea 
                 value={bulkProductsText}
                 onChange={e => setBulkProductsText(e.target.value)}
                 className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs whitespace-pre resize-none focus:ring-2 focus:ring-blue-500 outline-none min-h-[300px]"
                 placeholder="Cole aqui seu conteúdo TSV..."
                 spellCheck={false}
               />
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
               <button onClick={() => setBulkImportProducts(false)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded font-bold hover:bg-white">Cancelar</button>
               <button onClick={handleBulkProducts} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-2">
                 <Upload className="w-4 h-4" /> Processar Importação
               </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {activeTab === 'coupons' && (
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
      )}

      {activeTab === 'freight' && (
      <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Tabelas de Preços Regionais (Valor por m³)
          </h3>
          <div className="flex gap-2">
            <button onClick={handleExportFreight} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded text-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Baixar Planilha
            </button>
            <button onClick={() => setBulkImportFreight(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded text-sm flex items-center gap-2">
              <Upload className="w-4 h-4" /> Importar Planilha
            </button>
            <button onClick={saveFreightConfig} disabled={savingFreight} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded text-sm">
              {savingFreight ? 'Salvando...' : 'Salvar Tabela'}
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map((uf) => (
              <div key={uf} className="border border-slate-200 rounded p-4 bg-slate-50">
                <div className="font-bold text-slate-800 mb-3 text-lg border-b border-slate-200 pb-1">{uf}</div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Capital (R$ / m³)</label>
                    <input 
                      type="number" 
                      value={freightRates[uf]?.capital ?? ''} 
                      onChange={e => setFreightRates(prev => ({...prev, [uf]: {...(prev[uf] || {}), capital: Number(e.target.value)}}))} 
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prazo Capital (Dias)</label>
                    <input 
                      type="number" 
                      value={freightRates[uf]?.capitalDeliveryTime ?? ''} 
                      onChange={e => setFreightRates(prev => ({...prev, [uf]: {...(prev[uf] || {}), capitalDeliveryTime: Number(e.target.value)}}))} 
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                      placeholder="Ex: 5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Interior (R$ / m³)</label>
                    <input 
                      type="number" 
                      value={freightRates[uf]?.interior ?? ''} 
                      onChange={e => setFreightRates(prev => ({...prev, [uf]: {...(prev[uf] || {}), interior: Number(e.target.value)}}))} 
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prazo Interior (Dias)</label>
                    <input 
                      type="number" 
                      value={freightRates[uf]?.interiorDeliveryTime ?? ''} 
                      onChange={e => setFreightRates(prev => ({...prev, [uf]: {...(prev[uf] || {}), interiorDeliveryTime: Number(e.target.value)}}))} 
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                      placeholder="Ex: 5"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {bulkImportFreight && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                Importar Tabela de Frete (CSV/TSV)
              </h3>
              <button onClick={() => setBulkImportFreight(false)} className="text-slate-400 hover:text-slate-800 font-bold px-2 py-1">X</button>
            </div>
            <div className="p-6 flex-1 flex flex-col min-h-0">
               <div className="flex justify-between items-start gap-4 mb-4">
                 <p className="text-sm text-slate-600">
                   Copie as colunas do Excel: <strong>UF, Frete Capital, Frete Interior, Prazo Entrega</strong> ou selecione um arquivo CSV. Exemplo: <code>SP<br/>150,00<br/>200,00<br/>5</code>.
                 </p>
                 <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded text-xs cursor-pointer whitespace-nowrap">
                   Selecionar Arquivo
                   <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (!file) return;
                       const reader = new FileReader();
                       reader.onload = (ev) => {
                           if (ev.target?.result) setBulkFreightText(ev.target.result as string);
                       };
                       reader.readAsText(file);
                   }} />
                 </label>
               </div>
               <textarea 
                 value={bulkFreightText}
                 onChange={e => setBulkFreightText(e.target.value)}
                 className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs whitespace-pre resize-none focus:ring-2 focus:ring-blue-500 outline-none min-h-[300px]"
                 placeholder="ESTADO;CAPITAL/INTERIOR;Valor por Metro Cubico;prazo&#10;SP;C;R$ 2.173,03;3&#10;SP;I;R$ 2.717,15;4"
                 spellCheck={false}
               />
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
               <button onClick={() => setBulkImportFreight(false)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded font-bold hover:bg-white">Cancelar</button>
               <button onClick={handleBulkFreight} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-2">
                 <Upload className="w-4 h-4" /> Processar Importação
               </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {activeTab === 'proposals' && (
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
                        <div className="flex justify-end gap-3">
                          <button onClick={() => setViewProposal(proposal)} className="text-slate-500 hover:text-slate-800" title="Ver Detalhes">
                            <Eye className="w-4 h-4 ml-auto" />
                          </button>
                          <a href={`https://wa.me/55${proposal.leadPhone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-700" title="WhatsApp">
                            <MessageCircle className="w-4 h-4 ml-auto" />
                          </a>
                          <button onClick={() => generateProposalPDF(proposal)} className="text-blue-500 hover:text-blue-700" title="Gerar PDF">
                            <FileText className="w-4 h-4 ml-auto" />
                          </button>
                          <button onClick={() => handleDeleteProposal(proposal.id)} className="text-red-500 hover:text-red-700" title="Excluir">
                            <Trash2 className="w-4 h-4 ml-auto" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === 'clients' && (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Clientes Cadastrados (Derivados de Solicitações)
          </h3>
          <button 
             onClick={() => {
                const headers = ["Nome / Contato", "Empresa", "CNPJ", "E-mail", "Telefone", "CEP", "Horário de Entrega", "Criado Em"];
                const uniqueClients = Array.from(new Map(proposals.map(p => [(p.cnpj || '') + (p.leadEmail || ''), p])).values());
                const rows = uniqueClients.map((c: any) => [
                   c.leadName || '',
                   c.companyName || '',
                   c.cnpj || '',
                   c.leadEmail || '',
                   c.leadPhone || '',
                   c.cep || '',
                   c.deliverySchedule || '',
                   c.createdAt || ''
                ]);
                const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
             }}
             className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded text-sm flex items-center gap-2"
          >
             <Download className="w-4 h-4" /> Baixar Planilha
          </button>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-y border-slate-200 text-xs font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome / Contato</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">CNPJ</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from(new Map(proposals.map(p => [(p.cnpj || '') + (p.leadEmail || ''), p])).values()).map((client: any) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">{client.leadName}</td>
                    <td className="px-4 py-3">{client.companyName}</td>
                    <td className="px-4 py-3">{client.cnpj}</td>
                    <td className="px-4 py-3">{client.leadEmail}</td>
                    <td className="px-4 py-3">{client.leadPhone}</td>
                    <td className="px-4 py-3">
                      <button 
                         onClick={() => {
                            const newName = window.prompt("Novo nome de contato:", client.leadName);
                            if (newName === null) return;
                            const newCompany = window.prompt("Nova Razão Social:", client.companyName);
                            if (newCompany === null) return;
                            const newPhone = window.prompt("Novo Telefone:", client.leadPhone);
                            if (newPhone === null) return;
                            
                           (async () => {
                             try {
                               const { updateDoc } = await import('firebase/firestore');
                               const q = query(collection(db, 'proposals'), 
                                  client.cnpj ? where('cnpj', '==', client.cnpj) : where('leadEmail', '==', client.leadEmail));
                               const snaps = await getDocs(q);
                               
                               const promises = snaps.docs.map((d) => 
                                  updateDoc(doc(db, 'proposals', d.id), {
                                     leadName: newName,
                                     companyName: newCompany,
                                     leadPhone: newPhone
                                  })
                               );
                               await Promise.all(promises);
                               
                               fetchProposals();
                               alert("Dados atualizados com sucesso!");
                             } catch(e) {
                               console.error("Erro ao editar cliente:", e);
                               alert("Erro ao atualizar. Verifique o console.");
                             }
                           })();
                         }}
                         className="text-blue-500 hover:text-blue-700 font-bold text-xs"
                      >
                         Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {proposals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 opacity-60">Nenhum cliente registrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {proposalToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-slate-800 mb-2">Excluir Solicitação</h3>
            <p className="text-slate-600 text-sm mb-6">Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setProposalToDelete(null)} className="px-4 py-2 border border-slate-300 text-slate-600 rounded font-bold hover:bg-slate-50">Cancelar</button>
              <button onClick={executeDeleteProposal} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {viewProposal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Detalhes da Proposta</h3>
              <button onClick={() => setViewProposal(null)} className="text-slate-400 hover:text-slate-800 font-bold px-2 py-1">X</button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
               <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                 <div><strong className="text-slate-500 block uppercase text-[10px]">Cliente / Empresa</strong>{viewProposal.companyName || viewProposal.leadName}</div>
                 <div><strong className="text-slate-500 block uppercase text-[10px]">CNPJ</strong>{viewProposal.cnpj || 'N/A'}</div>
                 <div><strong className="text-slate-500 block uppercase text-[10px]">Contato</strong>{viewProposal.leadName} ({viewProposal.leadPhone})</div>
                 <div><strong className="text-slate-500 block uppercase text-[10px]">Email</strong>{viewProposal.leadEmail}</div>
                 <div className="col-span-2"><strong className="text-slate-500 block uppercase text-[10px]">Endereço</strong>{viewProposal.address}, {viewProposal.addressNumber} - {viewProposal.neighborhood} <br/> {viewProposal.city}/{viewProposal.addressState} - CEP: {viewProposal.cep}</div>
                 <div><strong className="text-slate-500 block uppercase text-[10px]">Prazo Pgto</strong>{viewProposal.paymentTerm || '30DDL'}</div>
                 <div><strong className="text-slate-500 block uppercase text-[10px]">Horário de Entrega</strong>{viewProposal.deliverySchedule || 'N/A'}</div>
               </div>
               
               <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Itens</h4>
               <ul className="space-y-3 mb-6">
                 {(viewProposal.items || []).map((item: any, idx: number) => (
                   <li key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                      <span className="text-sm font-medium">{item.quantity}x {item.name}</span>
                      <span className="text-sm font-bold text-slate-700">R$ {((item.price || 0) * item.quantity).toFixed(2)}</span>
                   </li>
                 ))}
               </ul>
               
               <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Resumo de Valores</h4>
               <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between"><span>Frete ({viewProposal.shippingOption})</span><span>R$ {Number(viewProposal.freightValue || 0).toFixed(2)}</span></div>
                  {viewProposal.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Desconto Aplicado</span><span>{(Number(viewProposal.discount) * 100).toFixed(1)}%</span></div>}
                  <div className="flex justify-between font-bold text-lg text-blue-900 mt-2 pt-2 border-t border-slate-200"><span>Total</span><span>R$ {Number(viewProposal.total || 0).toFixed(2)}</span></div>
               </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
               <button onClick={() => setViewProposal(null)} className="px-6 py-2 border border-slate-300 text-slate-600 rounded font-bold hover:bg-white">Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
