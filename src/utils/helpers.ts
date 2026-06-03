export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function generateWhatsAppLink(
  items: { name: string; quantity: number; price: number }[],
  total: number,
  companyName: string,
  cnpj: string,
  shippingOption: string,
  leadName: string,
  leadEmail: string,
  leadPhone: string
): string {
  const sellerPhone = '5511994090984';
  
  let message = `*NOVO PEDIDO B2B - DISTRIBUIDORA*\n`;
  message += `*Empresa:* ${companyName}\n`;
  message += `*CNPJ:* ${cnpj}\n`;
  message += `*Contato:* ${leadName} - ${leadPhone}\n`;
  message += `*Email:* ${leadEmail}\n\n`;
  message += `*ITENS DO PEDIDO:*\n`;
  
  items.forEach((item) => {
    message += `- ${item.quantity}x ${item.name} (${formatCurrency(item.price)})\n`;
  });
  
  message += `\n*TOTAL APROXIMADO:* ${formatCurrency(total)}\n`;
  message += `*MODALIDADE DE FRETE:* ${shippingOption}\n\n`;
  message += `*Gostaria de finalizar esta negociação e combinar o pagamento.*`;
  
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${sellerPhone}?text=${encodedMessage}`;
}

export function generateEmailLink(
  items: { name: string; quantity: number; price: number }[],
  total: number,
  companyName: string,
  cnpj: string,
  shippingOption: string,
  leadName: string,
  leadEmail: string,
  leadPhone: string
): string {
  const toEmails = 'moises.gadi@gpsproducts.com.br,vinicius.silva@gpsproducts.com.br';
  const subject = `Nova Cotação B2B - ${companyName}`;
  
  let message = `NOVO PEDIDO B2B - DISTRIBUIDORA\n\n`;
  message += `Empresa: ${companyName}\n`;
  message += `CNPJ: ${cnpj}\n`;
  message += `Contato: ${leadName} - ${leadPhone}\n`;
  message += `Email: ${leadEmail}\n\n`;
  message += `ITENS DO PEDIDO:\n`;
  
  items.forEach((item) => {
    message += `- ${item.quantity}x ${item.name} (${formatCurrency(item.price)})\n`;
  });
  
  message += `\nTOTAL APROXIMADO: ${formatCurrency(total)}\n`;
  message += `MODALIDADE DE FRETE: ${shippingOption}\n\n`;
  message += `Gostaria de finalizar esta negociação e combinar o pagamento.`;
  
  // Note: For mailto links we use standard encodeURIComponent, though spaces can also be %20
  const encodedMessage = encodeURIComponent(message);
  return `mailto:${toEmails}?subject=${encodeURIComponent(subject)}&body=${encodedMessage}`;
}
