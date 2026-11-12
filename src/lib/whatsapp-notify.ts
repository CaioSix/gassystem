import { Order, PAYMENT_LABELS } from './types';

/**
 * Retorna a lista de telefones configurados em NEXT_PUBLIC_STORE_WHATSAPP
 * Aceita 1 ou vários números separados por vírgula:
 * Ex: "5511999991111,5511999992222,5511999993333,5511999994444"
 */
export function getStoreWhatsAppNumbers(): string[] {
  const raw = process.env.NEXT_PUBLIC_STORE_WHATSAPP || '5511999999999';
  const list = raw
    .split(/[,;\s]+/)
    .map((n) => n.replace(/\D/g, ''))
    .filter(Boolean);
  return list.length > 0 ? list : ['5511999999999'];
}

export function getPrimaryStoreWhatsApp(): string {
  return getStoreWhatsAppNumbers()[0];
}

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
 * Dispara notificação automática no servidor (Lambda da Vercel) para TODOS os 4 telefones
 * simultaneamente em paralelo (Promise.allSettled).
 *
 * Formatos suportados nas variáveis de ambiente da Vercel:
 * 1) WHATSAPP_RECIPIENTS="5511911111111:apikey1,5511922222222:apikey2,5511933333333:apikey3,5511944444444:apikey4"
 *    (Usa CallMeBot gratuito para disparar no WhatsApp dos 4 aparelhos ao mesmo tempo!)
 * 2) Ou NEXT_PUBLIC_STORE_WHATSAPP="num1,num2,num3,num4" + CALLMEBOT_API_KEY="key1,key2,key3,key4"
 * 3) Ou WHATSAPP_WEBHOOK_URL (envia a lista completa `phones` para Evolution API / Z-API / n8n)
 */
export async function sendServerWhatsAppNotification(
  order: Order,
  originUrl?: string
): Promise<void> {
  const storePhones = getStoreWhatsAppNumbers();
  const recipientsEnv = process.env.WHATSAPP_RECIPIENTS || '';
  const callMeBotKeys = (process.env.CALLMEBOT_API_KEY || '')
    .split(/[,;\s]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || '';

  const text = formatNewOrderWhatsAppMessage(order, originUrl);
  const tasks: Promise<unknown>[] = [];

  // 1. Se WHATSAPP_RECIPIENTS estiver configurado no formato "telefone:apikey,telefone2:apikey2"
  if (recipientsEnv.trim()) {
    const pairs = recipientsEnv
      .split(/[,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const pair of pairs) {
      const [rawPhone, apiKey] = pair.split(':').map((s) => s?.trim());
      const cleanPhone = (rawPhone || '').replace(/\D/g, '');
      if (cleanPhone && apiKey) {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
          cleanPhone
        )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(
          apiKey
        )}`;
        tasks.push(fetch(url, { method: 'GET' }));
      }
    }
  } else if (callMeBotKeys.length > 0) {
    // 2. Se configurou NEXT_PUBLIC_STORE_WHATSAPP com 4 números e CALLMEBOT_API_KEY com as chaves correspondentes
    storePhones.forEach((phone, idx) => {
      const key = callMeBotKeys[idx] || callMeBotKeys[0];
      if (phone && key) {
        const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
          phone
        )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
        tasks.push(fetch(url, { method: 'GET' }));
      }
    });
  }

  // 3. Se tiver um Webhook (Z-API, Evolution API, n8n, Make), dispara para todos os telefones juntos
  if (webhookUrl) {
    tasks.push(
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phones: storePhones,
          phone: storePhones[0],
          message: text,
          order,
        }),
      })
    );
  }

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
