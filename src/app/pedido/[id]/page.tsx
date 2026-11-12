'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Truck,
  PackageCheck,
  XCircle,
  MessageCircle,
  ArrowLeft,
  MapPin,
  CreditCard,
} from 'lucide-react';
import {
  Order,
  PAYMENT_LABELS,
  STATUS_CONFIG,
} from '@/lib/types';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { formatNewOrderWhatsAppMessage } from '@/lib/whatsapp-notify';

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [originUrl, setOriginUrl] = useState('');

  const storeWhatsApp =
    process.env.NEXT_PUBLIC_STORE_WHATSAPP || '5511999999999';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 404) {
            setError('Pedido não encontrado.');
          }
          return;
        }
        const data = await res.json();
        if (active && data.order) {
          setOrder(data.order);
          setError('');
        }
      } catch {
        // Ignore transient network errors during polling
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOrder();

    // Polling a cada 3 segundos para garantir atualização mesmo sem Supabase Realtime
    const interval = setInterval(fetchOrder, 3000);

    // Se Supabase estiver configurado, assina mudanças em tempo real (instantâneo)
    const supabase = getSupabaseClient();
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null =
      null;

    if (supabase && isSupabaseConfigured) {
      channel = supabase
        .channel(`order-${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${id}`,
          },
          (payload) => {
            if (active && payload.new) {
              setOrder({
                ...(payload.new as Order),
                total: Number(payload.new.total),
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      active = false;
      clearInterval(interval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [id]);

  if (loading) {
    return (
      <main className="container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
            Carregando status do seu pedido...
          </p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container">
        <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <h1 style={{ fontSize: '1.3rem', marginBlockEnd: '0.75rem' }}>
            {error || 'Pedido não encontrado'}
          </h1>
          <Link href="/" className="btn btn-primary">
            <ArrowLeft size={18} aria-hidden="true" />
            Fazer novo pedido
          </Link>
        </div>
      </main>
    );
  }

  const currentStatus = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  const steps = [
    {
      step: 1,
      title: '1. Pedido Enviado',
      desc: 'Aguardando o Alexandre Gás aceitar seu pedido',
      icon: Clock,
    },
    {
      step: 2,
      title: '2. Pedido Aceito! 😃',
      desc: 'Seu pedido foi confirmado e está sendo separado',
      icon: CheckCircle2,
    },
    {
      step: 3,
      title: '3. Saiu para Entrega 🛵',
      desc: 'O entregador já está indo até o seu endereço',
      icon: Truck,
    },
    {
      step: 4,
      title: '4. Pedido Entregue',
      desc: 'Entrega finalizada com sucesso',
      icon: PackageCheck,
    },
  ];

  const whatsappMessage = encodeURIComponent(
    formatNewOrderWhatsAppMessage(order, originUrl)
  );

  return (
    <main className="container">
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
                <span>ALEXANDRE</span>
                <span className="store-title-highlight">GÁS</span>
              </h1>
              <p className="store-tagline">
                Segurança • Qualidade • Confiança
              </p>
              <p className="store-subtitle">
                Acompanhamento ao vivo • Pedido #{order.id.slice(0, 6).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Banner Principal de Status (Atualiza sozinho quando o dono aceita!) */}
      <section
        className={`status-banner ${order.status}`}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBlockEnd: '0.35rem',
          }}
        >
          Status Atualizado em Tempo Real
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBlockEnd: '0.4rem' }}>
          {currentStatus.customerTitle}
        </h2>
        <p style={{ fontSize: '0.98rem' }}>{currentStatus.customerDescription}</p>
      </section>

      {/* Linha do Tempo do Pedido */}
      {order.status !== 'cancelled' ? (
        <section className="card" aria-label="Progresso do Pedido">
          <h3 className="section-title">Andamento da Entrega</h3>
          <ol className="steps-list">
            {steps.map((s) => {
              const Icon = s.icon;
              const isDone = currentStatus.step > s.step || order.status === 'completed';
              const isActive =
                currentStatus.step === s.step && order.status !== 'completed';
              return (
                <li
                  key={s.step}
                  className={`step-item ${isActive ? 'active' : ''} ${
                    isDone ? 'done' : ''
                  }`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <Icon size={22} aria-hidden="true" />
                  <div>
                    <div style={{ fontSize: '0.98rem' }}>{s.title}</div>
                    <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>
                      {s.desc}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : (
        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d93025', fontWeight: 700 }}>
            <XCircle size={22} aria-hidden="true" />
            <span>Este pedido foi cancelado pela distribuidora.</span>
          </div>
        </section>
      )}

      {/* Detalhes do Pedido e Endereço */}
      <section className="card">
        <h3 className="section-title">
          <MapPin size={20} color="#0b3d91" aria-hidden="true" />
          Resumo dos Dados Enviados
        </h3>

        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.95rem' }}>
          <div>
            <strong>Cliente:</strong> {order.customer_name}
          </div>
          <div>
            <strong>Telefone:</strong> {order.phone}
          </div>
          <div>
            <strong>Endereço:</strong> {order.address}, Nº {order.address_number} —{' '}
            {order.neighborhood}
          </div>
          {order.reference && (
            <div>
              <strong>Ponto de Referência:</strong> {order.reference}
            </div>
          )}
          <div>
            <CreditCard
              size={16}
              style={{ display: 'inline', verticalAlign: 'text-bottom', marginInlineEnd: '0.3rem' }}
              aria-hidden="true"
            />
            <strong>Pagamento:</strong> {PAYMENT_LABELS[order.payment_method]}
            {order.change_for ? ` (Troco para: ${order.change_for})` : ''}
          </div>
        </div>

        <hr
          style={{
            marginBlock: '1rem',
            border: 'none',
            borderTop: '1px solid #cbd5e1',
          }}
        />

        <div style={{ display: 'grid', gap: '0.4rem' }}>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <span>
                {item.quantity}x {item.name}
              </span>
              <strong>
                R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
              </strong>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0b3d91',
              marginBlockStart: '0.4rem',
            }}
          >
            <span>Total</span>
            <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <a
          href={`https://wa.me/${storeWhatsApp.replace(/\D/g, '')}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-whatsapp"
        >
          <MessageCircle size={20} aria-hidden="true" />
          Enviar / Falar com Alexandre Gás no WhatsApp
        </a>

        <Link href="/" className="btn btn-secondary">
          <ArrowLeft size={18} aria-hidden="true" />
          Fazer outro pedido
        </Link>
      </div>
    </main>
  );
}
