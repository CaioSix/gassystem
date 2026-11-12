import { Order, PAYMENT_LABELS } from './types';

export function formatNewOrderWhatsAppMessage(
  order: Order,
  originUrl?: string
): string {
  const shortId = order.id.slice(0, 6).toUpperCase();
  const itemsText = order.items
    .map(
      (i) =>
        `• ${i.quantity}x ${i.name} (R$ ${(i.price * i.quantity)
          .toFixed(2)
          .replace('.', ',')})`
    )
    .join('\n');

  const paymentText =
    PAYMENT_LABELS[order.payment_method] +
    (order.change_for ? ` (Troco para: ${order.change_for})` : '');

  const base = originUrl || '';
  const quickAcceptLink = base
    ? `\n\n✅ *Aceitar pedido em 1 clique:*\n${base}/admin?accept=${order.id}`
    : '';

  return (
    `🔥 *NOVO PEDIDO #${shortId} — ALEXANDRE GÁS*\n\n` +
    `*Nome:* ${order.customer_name}\n` +
    `*Endereço:* ${order.address}\n` +
    `*Numero:* ${order.address_number}\n` +
    `*Bairro:* ${order.neighborhood}\n` +
    `*Ponto de Referência:* ${order.reference || 'Não informado'}\n` +
    `*Telefone:* ${order.phone}\n\n` +
    `🛒 *Itens:*\n${itemsText}\n` +
    `💳 *Pagamento:* ${paymentText}\n` +
    `💰 *Total:* R$ ${order.total.toFixed(2).replace('.', ',')}` +
    quickAcceptLink
  );
}

/**
 * Dispara notificação automática no servidor (Lambda) para o WhatsApp do dono,
 * caso CALLMEBOT_API_KEY (grátis) ou WHATSAPP_WEBHOOK_URL esteja configurado.
 */
export async function sendServerWhatsAppNotification(
  order: Order,
  originUrl?: string
): Promise<void> {
  const storePhone = (
    process.env.NEXT_PUBLIC_STORE_WHATSAPP || ''
  ).replace(/\D/g, '');
  const callMeBotKey = process.env.CALLMEBOT_API_KEY || '';
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || '';

  const text = formatNewOrderWhatsAppMessage(order, originUrl);

  try {
    // Opção 1: CallMeBot (100% Gratuito para enviar alertas para o próprio WhatsApp do dono)
    if (storePhone && callMeBotKey) {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        storePhone
      )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(
        callMeBotKey
      )}`;
      await fetch(url, { method: 'GET' });
    }

    // Opção 2: Webhook genérico (Evolution API, Z-API, n8n, Make, Meta Cloud API)
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: storePhone,
          message: text,
          order,
        }),
      });
    }
  } catch (err) {
    console.error('Aviso: falha ao disparar webhook de WhatsApp:', err);
  }
}
