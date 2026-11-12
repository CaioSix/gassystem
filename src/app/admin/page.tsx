'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  MessageCircle,
  Copy,
  Check,
  RefreshCw,
  MapPin,
  Phone,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  PAYMENT_LABELS,
  STATUS_CONFIG,
} from '@/lib/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'whatsapp'>(
    'open'
  );
  const [copiedGreeting, setCopiedGreeting] = useState(false);
  const [autoAcceptedBanner, setAutoAcceptedBanner] = useState('');
  const [originUrl, setOriginUrl] = useState('https://alexandre-gas.vercel.app');

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
    } catch {
      // Ignore transient polling errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);

      // Se o dono clicou no link "Aceitar pedido em 1 clique" recebido no WhatsApp (?accept=ID)
      const params = new URLSearchParams(window.location.search);
      const acceptId = params.get('accept');
      if (acceptId) {
        fetch(`/api/orders/${acceptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'accepted' }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.order) {
              setAutoAcceptedBanner(
                `✅ Pedido #${acceptId
                  .slice(0, 6)
                  .toUpperCase()} (${data.order.customer_name}) foi ACEITO com sucesso e já atualizou na tela do cliente!`
              );
              fetchOrders();
              window.history.replaceState({}, '', '/admin');
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3500);

    const supabase = getSupabaseClient();
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null =
      null;

    if (supabase && isSupabaseConfigured) {
      channel = supabase
        .channel('admin-orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            fetchOrders();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const buildCustomerWhatsAppLink = (order: Order) => {
    const cleanPhone = order.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55')
      ? cleanPhone
      : `55${cleanPhone}`;

    let statusText = '';
    if (order.status === 'accepted') {
      statusText = `✅ *Seu pedido foi ACEITO!* Já estamos separando para enviar.`;
    } else if (order.status === 'delivering') {
      statusText = `🛵 *Seu pedido SAIU PARA ENTREGA!* Nosso entregador já está a caminho.`;
    } else if (order.status === 'completed') {
      statusText = `🎉 *Pedido entregue!* Muito obrigado pela preferência!`;
    } else {
      statusText = `Recebemos seu pedido!`;
    }

    const msg = `Olá, *${order.customer_name}*! 😃\nAqui é do *Alexandre Gás*.\n\n${statusText}\n\n📍 *Endereço:* ${order.address}, Nº ${order.address_number} - ${order.neighborhood}\n💳 *Pagamento:* ${PAYMENT_LABELS[order.payment_method]}\n💰 *Total:* R$ ${order.total.toFixed(2).replace('.', ',')}\n\n🔗 *Acompanhe ao vivo aqui:*\n${originUrl}/pedido/${order.id}`;

    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  const whatsappAutoReplyTemplate = `Olá, 😃
Alexandre Gás 

Para fazer seu pedido super rápido com endereço, forma de pagamento e acompanhar a entrega ao vivo, toque no link abaixo:
👉 ${originUrl}

Ou, para que eu consiga te atender por aqui, preciso que responda:

Nome:
Endereço:
Numero:
Bairro:
Telefone:

É só copiar e colar e escrever os detalhes que precisamos para ser rápidos para você 🫵 😃

Atendemos das 08 as 19:30hs de Seg a Sex.
Aos Sábados 08 as 18:30.
Domingos 08 as 13:30.`;

  const copyTemplate = async () => {
    await navigator.clipboard.writeText(whatsappAutoReplyTemplate);
    setCopiedGreeting(true);
    setTimeout(() => setCopiedGreeting(false), 3000);
  };

  const openOrders = orders.filter((o) =>
    ['pending', 'accepted', 'delivering'].includes(o.status)
  );
  const closedOrders = orders.filter((o) =>
    ['completed', 'cancelled'].includes(o.status)
  );
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <main className="admin-container">
      {/* Topo da Tela de Gerenciamento */}
      <header className="store-header">
        <div className="store-header-top">
          <div className="store-brand">
            <img
              src="/alexandreGas.png"
              alt="Logo Alexandre Gás"
              className="store-logo-img"
              width={72}
              height={72}
            />
            <div>
              <h1 className="store-title">
                <span>PAINEL</span>
                <span className="store-title-highlight">ALEXANDRE GÁS</span>
              </h1>
              <p className="store-tagline">
                Segurança • Qualidade • Confiança
              </p>
              <p className="store-subtitle">
                Gerenciamento em tempo real (Aceitou aqui ou pelo link do WhatsApp, muda na tela do cliente!)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchOrders}
              className="btn btn-secondary"
              style={{ minHeight: '42px', padding: '0.5rem 0.9rem', fontSize: '0.9rem' }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Atualizar
            </button>
            <Link
              href="/"
              className="btn btn-secondary"
              style={{ minHeight: '42px', padding: '0.5rem 0.9rem', fontSize: '0.9rem' }}
            >
              <ExternalLink size={16} aria-hidden="true" />
              Ver Loja do Cliente
            </Link>
          </div>
        </div>
      </header>

      {autoAcceptedBanner && (
        <div
          role="status"
          style={{
            background: '#dcfce7',
            border: '2px solid #16a34a',
            color: '#14532d',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            fontWeight: 700,
            marginBlockEnd: '1.25rem',
          }}
        >
          {autoAcceptedBanner}
        </div>
      )}

      {/* Abas de Navegação */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBlockEnd: '1.25rem',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('open')}
          className={`btn ${
            activeTab === 'open' ? 'btn-primary' : 'btn-secondary'
          }`}
          style={{ width: 'auto', minHeight: '46px' }}
        >
          Pedidos em Andamento ({openOrders.length})
          {pendingCount > 0 && (
            <span
              style={{
                background: '#041b4d',
                color: '#f5b800',
                borderRadius: '999px',
                padding: '0.1rem 0.55rem',
                fontSize: '0.82rem',
                fontWeight: 800,
              }}
            >
              {pendingCount} novo(s)!
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('closed')}
          className={`btn ${
            activeTab === 'closed' ? 'btn-primary' : 'btn-secondary'
          }`}
          style={{ width: 'auto', minHeight: '46px' }}
        >
          Concluídos / Histórico ({closedOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`btn ${
            activeTab === 'whatsapp' ? 'btn-primary' : 'btn-secondary'
          }`}
          style={{ width: 'auto', minHeight: '46px' }}
        >
          <MessageCircle size={18} aria-hidden="true" />
          Configuração do WhatsApp
        </button>
      </div>

      {/* Aba de Mensagem de Saudação do WhatsApp */}
      {activeTab === 'whatsapp' && (
        <section className="card">
          <h2 className="section-title">
            <MessageCircle size={22} color="#16a34a" aria-hidden="true" />
            1. Mensagem Automática de Saudação no WhatsApp Business (Grátis)
          </h2>
          <p style={{ color: '#475569', marginBlockEnd: '1rem', fontSize: '0.95rem' }}>
            No aplicativo <strong>WhatsApp Business</strong> você não paga nada para enviar essa mensagem automática! Basta ir em{' '}
            <strong>
              Configurações → Ferramentas comerciais → Mensagem de saudação
            </strong>
            , ativar e colar o texto abaixo com o link do seu site:
          </p>

          <pre
            style={{
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '1rem',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              marginBlockEnd: '1rem',
            }}
          >
            {whatsappAutoReplyTemplate}
          </pre>

          <button
            type="button"
            onClick={copyTemplate}
            className="btn btn-success"
          >
            {copiedGreeting ? (
              <>
                <Check size={18} aria-hidden="true" />
                Mensagem copiada com sucesso!
              </>
            ) : (
              <>
                <Copy size={18} aria-hidden="true" />
                Copiar Mensagem para o WhatsApp Business
              </>
            )}
          </button>

          <hr
            style={{
              marginBlock: '1.5rem',
              border: 'none',
              borderTop: '1px solid #cbd5e1',
            }}
          />

          <h3 className="section-title" style={{ marginBlockEnd: '0.5rem' }}>
            2. Como o pedido chega no seu WhatsApp (Painel 100% Facultativo)
          </h3>
          <p style={{ color: '#475569', fontSize: '0.94rem' }}>
            • Assim que o cliente confirma o pedido no site, o próprio sistema já abre o WhatsApp com todos os dados preenchidos enviando para o seu número (e inclui um link de <strong>1 clique para você aceitar o pedido direto pelo WhatsApp</strong> se quiser atualizar a tela do cliente).
            <br />• Além disso, a Lambda da Vercel suporta envio silencioso em segundo plano via <strong>CallMeBot (100% gratuito)</strong> ou qualquer Webhook de WhatsApp (basta definir <code>CALLMEBOT_API_KEY</code> ou <code>WHATSAPP_WEBHOOK_URL</code> na Vercel).
          </p>
        </section>
      )}

      {/* Listagem de Pedidos */}
      {activeTab !== 'whatsapp' && (
        <>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              Carregando pedidos...
            </div>
          ) : (activeTab === 'open' ? openOrders : closedOrders).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBlockEnd: '0.4rem' }}>
                {activeTab === 'open'
                  ? 'Nenhum pedido pendente no momento 😃'
                  : 'Nenhum pedido finalizado ainda'}
              </p>
              <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
                Assim que um cliente enviar um pedido pelo link, ele aparecerá aqui e no seu WhatsApp.
              </p>
            </div>
          ) : (
            <div className="orders-grid">
              {(activeTab === 'open' ? openOrders : closedOrders).map(
                (order) => {
                  const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const isBusy = updatingId === order.id;
                  const timeFormatted = new Date(
                    order.created_at
                  ).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const mapsQuery = encodeURIComponent(
                    `${order.address}, ${order.address_number} - ${order.neighborhood}`
                  );

                  return (
                    <article
                      key={order.id}
                      className={`order-card ${order.status}`}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBlockEnd: '0.75rem',
                          }}
                        >
                          <span className={`badge ${order.status}`}>
                            {st.label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.82rem',
                              color: '#475569',
                              fontWeight: 600,
                            }}
                          >
                            #{order.id.slice(0, 6).toUpperCase()} • {timeFormatted}
                          </span>
                        </div>

                        <h3
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: '#041b4d',
                            marginBlockEnd: '0.35rem',
                          }}
                        >
                          {order.customer_name}
                        </h3>

                        <div
                          style={{
                            display: 'grid',
                            gap: '0.4rem',
                            fontSize: '0.92rem',
                            color: '#1e293b',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Phone size={15} color="#0b3d91" aria-hidden="true" />
                            <span>{order.phone}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <MapPin
                              size={16}
                              color="#0b3d91"
                              style={{ marginTop: '3px', flexShrink: 0 }}
                              aria-hidden="true"
                            />
                            <div>
                              <div>
                                <strong>{order.address}, Nº {order.address_number}</strong>
                              </div>
                              <div>Bairro: {order.neighborhood}</div>
                              {order.reference && (
                                <div style={{ color: '#b45309', fontWeight: 700 }}>
                                  Ref: {order.reference}
                                </div>
                              )}
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#0284c7',
                                  textDecoration: 'underline',
                                }}
                              >
                                Abrir endereço no Google Maps
                              </a>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CreditCard size={15} color="#0b3d91" aria-hidden="true" />
                            <span>
                              {PAYMENT_LABELS[order.payment_method]}
                              {order.change_for
                                ? ` (Troco p/ ${order.change_for})`
                                : ''}
                            </span>
                          </div>
                        </div>

                        <hr
                          style={{
                            marginBlock: '0.85rem',
                            border: 'none',
                            borderTop: '1px solid #cbd5e1',
                          }}
                        />

                        {/* Itens */}
                        <div style={{ fontSize: '0.92rem', marginBlockEnd: '0.5rem' }}>
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: 600,
                              }}
                            >
                              <span>
                                {item.quantity}x {item.name}
                              </span>
                              <span>
                                R${' '}
                                {(item.price * item.quantity)
                                  .toFixed(2)
                                  .replace('.', ',')}
                              </span>
                            </div>
                          ))}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontWeight: 800,
                              fontSize: '1.08rem',
                              color: '#0b3d91',
                              marginBlockStart: '0.35rem',
                            }}
                          >
                            <span>Total:</span>
                            <span>
                              R$ {order.total.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações do Dono */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        {order.status === 'pending' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateStatus(order.id, 'accepted')
                            }
                            className="btn btn-success"
                            style={{ width: '100%' }}
                          >
                            <CheckCircle2 size={20} aria-hidden="true" />
                            Aceitar Pedido Agora
                          </button>
                        )}

                        {order.status === 'accepted' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateStatus(order.id, 'delivering')
                            }
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                          >
                            <Truck size={20} aria-hidden="true" />
                            Marcar &ldquo;Saiu para Entrega&rdquo;
                          </button>
                        )}

                        {order.status === 'delivering' && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateStatus(order.id, 'completed')
                            }
                            className="btn btn-success"
                            style={{ width: '100%' }}
                          >
                            <PackageCheck size={20} aria-hidden="true" />
                            Concluir Entrega
                          </button>
                        )}

                        <a
                          href={buildCustomerWhatsAppLink(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-whatsapp"
                          style={{ width: '100%', minHeight: '44px', fontSize: '0.92rem' }}
                        >
                          <MessageCircle size={18} aria-hidden="true" />
                          Avisar Cliente no WhatsApp
                        </a>

                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Link
                            href={`/pedido/${order.id}`}
                            target="_blank"
                            className="btn btn-secondary"
                            style={{
                              flex: 1,
                              minHeight: '38px',
                              fontSize: '0.82rem',
                              padding: '0.4rem',
                            }}
                          >
                            Ver Tela do Cliente
                          </Link>

                          {order.status !== 'cancelled' &&
                            order.status !== 'completed' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateStatus(order.id, 'cancelled')
                                }
                                className="btn btn-secondary"
                                style={{
                                  minHeight: '38px',
                                  fontSize: '0.82rem',
                                  padding: '0.4rem 0.65rem',
                                  color: '#d93025',
                                }}
                              >
                                <XCircle size={15} aria-hidden="true" />
                                Cancelar
                              </button>
                            )}
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
