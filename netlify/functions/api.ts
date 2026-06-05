import express from "express";
import serverless from "serverless-http";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json());

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
      <div style="background-color: #f4f6f8; padding: 40px 20px; font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #0b1528; padding: 20px; text-align: center;">
            <h2 style="color: #fff; margin: 0; font-size: 20px;">Proposta Global Products/Score Group - Revendas Ambev</h2>
          </div>
          
          <div style="padding: 24px;">
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; font-size: 16px;">Detalhes do Cliente</h3>
            <p style="margin: 4px 0;"><strong>Empresa:</strong> ${companyName}</p>
            <p style="margin: 4px 0;"><strong>CNPJ:</strong> ${cnpj}</p>
            <p style="margin: 4px 0;"><strong>Nome:</strong> ${leadName}</p>
            <p style="margin: 4px 0;"><strong>E-mail:</strong> ${leadEmail}</p>
            <p style="margin: 4px 0;"><strong>Telefone:</strong> ${leadPhone}</p>
            
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px; font-size: 16px;">Endereço de Entrega</h3>
            <p style="margin: 4px 0;">${address}, ${addressNumber} - ${neighborhood}</p>
            <p style="margin: 4px 0;">${city} - ${addressState} - CEP: ${cep}</p>
            
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px; font-size: 16px;">Opções Comerciais e Logística</h3>
            <p style="margin: 4px 0;"><strong>Opção de Frete:</strong> ${shippingOption}</p>
            <p style="margin: 4px 0;"><strong>Prazo de Entrega Estimado:</strong> ${freightDeliveryTime > 0 ? freightDeliveryTime + ' dias' : 'A combinar / Imediato'}</p>
            <p style="margin: 4px 0;"><strong>Horário de Recebimento:</strong> ${deliverySchedule}</p>
            <p style="margin: 4px 0;"><strong>Prazo de Pagamento:</strong> ${paymentTerm}</p>

            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px; font-size: 16px;">Produtos Selecionados</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
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

            <div style="margin-top: 20px; background-color: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px;">
              <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Valor dos Produtos:</span> <strong>${totalFormatted}</strong></p>
              <p style="margin: 5px 0; display: flex; justify-content: space-between;"><span>Valor do Frete:</span> <strong>${freightFormatted}</strong></p>
              ${discount > 0 ? `<p style="margin: 5px 0; display: flex; justify-content: space-between; color: #ca8a04;"><span>Desconto:</span> <strong>-${discountFormatted}</strong></p>` : ''}
              <hr style="border: 0; border-top: 1px solid #ddd; margin: 10px 0;">
              <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 18px;"><strong>Total da Proposta:</strong> <strong style="color: #1e3a8a;">${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total + freightValue - discount)}</strong></p>
            </div>
            
            <h3 style="border-bottom: 2px solid #eaeaea; padding-bottom: 8px; color: #1e3a8a; margin-top: 24px; font-size: 16px;">Fornecedor</h3>
            <p style="margin: 4px 0;"><strong>Global Products</strong></p>
            <p style="margin: 4px 0;">CNPJ: 03.977.536/0011-21</p>
            <p style="margin: 12px 0 4px 0; color: #555; font-size: 13px;">
              Rua Iguatemi, 236<br/>
              Itaim Bibi, São Paulo/SP<br/>
              CEP: 01451-010
            </p>
            <p style="margin: 4px 0 12px 0; color: #555; font-size: 13px;">
              Alameda Tocantins, 630-01<br/>
              Alphaville, Barueri/SP<br/>
              CEP: 06455-020
            </p>
            <p style="margin: 4px 0;"><strong>Atendimento Comercial:</strong> (11) 99409-0984</p>
          </div>
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

export const handler = serverless(app);
