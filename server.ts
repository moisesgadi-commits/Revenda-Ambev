import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";

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
        total
      } = req.body;

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return res.status(500).json({ error: "RESEND_API_KEY not configured" });
      }

      const resend = new Resend(resendApiKey);

      // We'll format the items list
      const itemsList = items.map((item: any) => 
        `- ${item.quantity}x ${item.name} (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)})`
      ).join('\n');

      const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);

      const emailText = `
Olá ${leadName},

Recebemos sua solicitação de orçamento. Aqui estão os detalhes:

Empresa: ${companyName}
CNPJ: ${cnpj}
Telefone/WhatsApp: ${leadPhone}
Opção de Retirada/Envio: ${shippingOption}

Itens:
${itemsList}

Total: ${totalFormatted}

Entraremos em contato em breve para finalizar os detalhes e condições.

Atenciosamente,
Equipe Ambev Partner B2B
      `;

      const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
      const adminEmail = process.env.ADMIN_EMAIL || 'Moises.Gadi@gmail.com';

      await resend.emails.send({
        from: `Ambev Partner B2B <${fromEmail}>`,
        to: [leadEmail, adminEmail],
        subject: `Novo Pedido B2B - ${companyName}`,
        text: emailText,
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
