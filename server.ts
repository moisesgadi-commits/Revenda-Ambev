import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/send-proposal", async (req, res) => {
    try {
      const {
        leadName,
        leadEmail,
        leadPhone,
        companyName,
        cnpj,
        shippingOption,
        items,
        total,
        freightValue,
        discount,
        paymentTerm,
        deliverySchedule,
        cep,
        address,
        addressNumber,
        neighborhood,
        city,
        addressState,
        freightDeliveryTime
      } = req.body;

      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (!smtpUser || !smtpPass) {
        // Just log the error and pretend it succeeded for now, so backend doesn't crash 
        // if user hasn't provided credentials yet.
        console.error("SMTP_USER or SMTP_PASS not configured. Skipping email send.");
        return res.status(200).json({ success: false, reason: "SMTP credentials missing, email skipped." });
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const itemsListHtml = items.map((item: any) => 
        `<tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</td>
        </tr>`
      ).join('');

      const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
      const freightFormatted = freightValue > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freightValue) : "Grátis / A Combinar";
      const discountFormatted = discount > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discount) : "R$ 0,00";

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0b1528; padding: 20px; text-align: center;">
            <h2 style="color: #fff; margin: 0;">Nova Solicitação de Proposta B2B</h2>
          </div>
          
          <div style="padding: 20px;">
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a;">Detalhes do Cliente</h3>
            <p><strong>Empresa:</strong> ${companyName}</p>
            <p><strong>CNPJ:</strong> ${cnpj}</p>
            <p><strong>Nome:</strong> ${leadName}</p>
            <p><strong>E-mail:</strong> ${leadEmail}</p>
            <p><strong>Telefone:</strong> ${leadPhone}</p>
            
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px;">Endereço de Entrega</h3>
            <p>${address}, ${addressNumber} - ${neighborhood}</p>
            <p>${city} - ${addressState} - CEP: ${cep}</p>
            
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px;">Opções Comerciais e Logística</h3>
            <p><strong>Opção de Frete:</strong> ${shippingOption}</p>
            <p><strong>Prazo de Entrega Estimado:</strong> ${freightDeliveryTime > 0 ? freightDeliveryTime + ' dias' : 'A combinar / Imediato'}</p>
            <p><strong>Horário de Recebimento:</strong> ${deliverySchedule}</p>
            <p><strong>Prazo de Pagamento:</strong> ${paymentTerm}</p>

            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px;">Produtos Selecionados</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background-color: #f8fafc; text-align: left;">
                  <th style="padding: 8px; border: 1px solid #ddd;">Qtd</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Produto</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Preço Un.</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
              </tbody>
            </table>

            <div style="margin-top: 20px; background-color: #f8fafc; padding: 15px; border-radius: 8px;">
              <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Valor dos Produtos:</span> <strong>${totalFormatted}</strong></p>
              <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Valor do Frete:</span> <strong>${freightFormatted}</strong></p>
              ${discount > 0 ? `<p style="margin: 5px 0; display: flex; justify-content: space-between; color: #ca8a04;"><span>Desconto:</span> <strong>-${discountFormatted}</strong></p>` : ''}
              <hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">
              <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 18px;"><strong>Total da Proposta:</strong> <strong style="color: #1e3a8a;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total + freightValue - discount)}</strong></p>
            </div>
            
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px;">Fornecedor</h3>
            <p><strong>Global Products Equipamentos Industriais</strong></p>
            <p>Estrada do Saboó 217, Jardim São João, Guarulhos - SP, CEP: 07151-130</p>
            <p><strong>Atendimento Comercial:</strong> (11) 99409-0984</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: '"Global Products" <' + smtpUser + '>',
        to: leadEmail,
        cc: "moises.gadi@gpsproducts.com.br, vinicius.silva@gpsproducts.com.br",
        subject: `Cópia da Proposta B2B - ${companyName}`,
        html: htmlContent,
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
