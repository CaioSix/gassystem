'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  CreditCard,
  ShoppingBag,
  ShieldCheck,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  PRODUCTS,
  PAYMENT_LABELS,
  PaymentMethod,
  STORE_HOURS_TEXT,
  Order,
} from '@/lib/types';
import {
  formatNewOrderWhatsAppMessage,
  getPrimaryStoreWhatsApp,
} from '@/lib/whatsapp-notify';

export default function CustomerOrderPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const announcerRef = useRef<HTMLDivElement>(null);

  const storeWhatsApp = getPrimaryStoreWhatsApp();

  // Default: 1x Botijão P13 selected for speed
  const [quantities, setQuantities] = useState<Record<string, number>>({
    'gas-p13': 1,
  });

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [changeFor, setChangeFor] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Sync aria-invalid and aria-describedby with :user-invalid (and fallback) per modern-web-guidance
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const dirtyState = new WeakMap<
      Element,
      { hasInteracted: boolean; hasBlurred: boolean }
    >();
    const flagged = new WeakSet<Element>();
    const announced = new WeakSet<Element>();
    let announceTimer: ReturnType<typeof setTimeout> | undefined;
    let announcedField: Element | null = null;
    const supportsUserInvalid =
      typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)');

    const linkError = (el: HTMLElement, shown: boolean) => {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const ids = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
      else el.removeAttribute('aria-describedby');
    };

    const spokenText = (node: Element) => {
      const copy = node.cloneNode(true) as Element;
      copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
      copy
        .querySelectorAll('[role="img"][aria-label]')
        .forEach((n) =>
          n.replaceWith(`${n.getAttribute('aria-label')}: `)
        );
      return (copy.textContent || '').replace(/\s+/g, ' ').trim();
    };

    const announceError = (el: HTMLInputElement) => {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const errorEl = document.getElementById(errorId);
      if (!errorEl || !announcerRef.current) return;
      const label = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : '';
      if (announceTimer) clearTimeout(announceTimer);
      announcerRef.current.textContent = '';
      announcedField = el;
      announceTimer = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = label + spokenText(errorEl);
        }
      }, 500);
    };

    const syncAria = (target: EventTarget | null, announce = false) => {
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches('input, select, textarea')) return;
      const input = target as HTMLInputElement;

      let invalid = false;
      if (supportsUserInvalid) {
        invalid = input.matches(':user-invalid');
      } else {
        const state = dirtyState.get(input);
        if (state?.hasInteracted && state?.hasBlurred) {
          invalid = !input.validity.valid;
          input.classList.toggle('user-invalid-fallback', invalid);
        }
      }

      if (invalid) {
        if (announce && !announced.has(input)) {
          announceError(input);
          announced.add(input);
        }
        input.setAttribute('aria-invalid', 'true');
        linkError(input, true);
        flagged.add(input);
      } else if (
        flagged.has(input) ||
        input.getAttribute('aria-invalid') !== 'true'
      ) {
        input.setAttribute('aria-invalid', 'false');
        linkError(input, false);
        flagged.delete(input);
        announced.delete(input);
        if (announcedField === input && announcerRef.current) {
          if (announceTimer) clearTimeout(announceTimer);
          announcerRef.current.textContent = '';
        }
      }
    };

    form.querySelectorAll('input, select, textarea').forEach((el) => {
      syncAria(el);
    });

    const onBlur = (e: Event) => {
      if (e.target instanceof HTMLElement) {
        const st = dirtyState.get(e.target) || {
          hasInteracted: false,
          hasBlurred: false,
        };
        st.hasBlurred = true;
        dirtyState.set(e.target, st);
      }
      syncAria(e.target, true);
    };

    const onInput = (e: Event) => {
      if (e.target instanceof HTMLElement) {
        const st = dirtyState.get(e.target) || {
          hasInteracted: false,
          hasBlurred: false,
        };
        st.hasInteracted = true;
        dirtyState.set(e.target, st);
        if (e.target.hasAttribute('aria-invalid')) syncAria(e.target);
      }
    };

    const onChange = (e: Event) => syncAria(e.target, true);

    const onInvalid = (e: Event) => {
      if (e.target instanceof HTMLElement) {
        dirtyState.set(e.target, { hasInteracted: true, hasBlurred: true });
        announced.add(e.target);
        syncAria(e.target);
      }
    };

    form.addEventListener('blur', onBlur, true);
    form.addEventListener('input', onInput);
    form.addEventListener('change', onChange, true);
    form.addEventListener('invalid', onInvalid, true);

    return () => {
      form.removeEventListener('blur', onBlur, true);
      form.removeEventListener('input', onInput);
      form.removeEventListener('change', onChange, true);
      form.removeEventListener('invalid', onInvalid, true);
    };
  }, []);

  const updateQty = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[productId] || 0) + delta);
      return { ...prev, [productId]: next };
    });
  };

  const selectedItems = PRODUCTS.filter((p) => (quantities[p.id] || 0) > 0).map(
    (p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      quantity: quantities[p.id],
    })
  );

  const totalAmount = selectedItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const firstInvalid = form.querySelector<HTMLElement>(':invalid');
      firstInvalid?.focus();
      return;
    }

    if (selectedItems.length === 0) {
      setSubmitError('Selecione pelo menos 1 produto acima para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          phone,
          address,
          address_number: addressNumber,
          neighborhood,
          reference,
          payment_method: paymentMethod,
          change_for: paymentMethod === 'cash' ? changeFor : '',
          items: selectedItems,
          total: totalAmount,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.order?.id) {
        throw new Error(data.error || 'Não foi possível enviar seu pedido.');
      }

      const createdOrder: Order = data.order;
      const origin =
        typeof window !== 'undefined' ? window.location.origin : '';
      const whatsappMsg = formatNewOrderWhatsAppMessage(createdOrder, origin);
      const whatsappUrl = `https://wa.me/${storeWhatsApp}?text=${encodeURIComponent(
        whatsappMsg
      )}`;

      // Redireciona o cliente direto para o WhatsApp já com a mensagem preenchida
      // No celular isso abre o app do WhatsApp instantaneamente
      window.location.href = whatsappUrl;
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Erro ao enviar pedido.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container">
      {/* Polite live region for field validation announcements */}
      <div
        ref={announcerRef}
        aria-live="polite"
        className="visually-hidden"
      />

      {/* Header da Loja com a Logo Oficial Alexandre Gás */}
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
                Olá! 😃 Peça rápido aqui e acompanhe sua entrega ao vivo
              </p>
            </div>
          </div>
        </div>

        <div className="hours-card">
          <div className="hours-title">
            <Clock size={15} aria-hidden="true" />
            <span>Horários de Atendimento:</span>
          </div>
          {STORE_HOURS_TEXT.map((line) => (
            <div key={line}>• {line}</div>
          ))}
        </div>
      </header>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        method="POST"
        action="/api/orders"
        noValidate
      >
        {/* 1. Escolha os Produtos */}
        <section className="card" aria-labelledby="heading-products">
          <h2 id="heading-products" className="section-title">
            <ShoppingBag size={20} color="#0b3d91" aria-hidden="true" />
            1. O que você precisa hoje?
          </h2>

          <div className="product-list">
            {PRODUCTS.map((product) => {
              const qty = quantities[product.id] || 0;
              return (
                <div
                  key={product.id}
                  className={`product-item ${qty > 0 ? 'selected' : ''}`}
                >
                  <div className="product-info">
                    <div className="product-name">
                      <span>{product.name}</span>
                      {product.badge && (
                        <span className="product-badge">{product.badge}</span>
                      )}
                    </div>
                    <p className="product-desc">{product.description}</p>
                    <p className="product-price">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  <div className="qty-controls">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => updateQty(product.id, -1)}
                      aria-label={`Diminuir quantidade de ${product.name}`}
                    >
                      −
                    </button>
                    <span className="qty-value" aria-live="polite">
                      {qty}
                    </span>
                    <button
                      type="button"
                      className="qty-btn primary"
                      onClick={() => updateQty(product.id, 1)}
                      aria-label={`Aumentar quantidade de ${product.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Dados de Entrega */}
        <section className="card" aria-labelledby="heading-address">
          <h2 id="heading-address" className="section-title">
            <MapPin size={20} color="#0b3d91" aria-hidden="true" />
            2. Dados para Entrega Rápida
          </h2>

          <div className="field">
            <label htmlFor="customer_name">
              Nome:<span className="required-star" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="customer_name"
              name="customer_name"
              autoComplete="name"
              enterKeyHint="next"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              data-error="name-error"
            />
            <div id="name-error" className="error-msg">
              <span role="img" aria-label="Erro">
                ❌
              </span>{' '}
              Informe seu nome para identificarmos a entrega.
            </div>
          </div>

          <div className="field">
            <label htmlFor="phone">
              Telefone (WhatsApp):
              <span className="required-star" aria-hidden="true">*</span>
            </label>
            <span id="phone-hint" className="hint">
              Com DDD (ex: 11 99999-9999) para avisarmos sobre o pedido
            </span>
            <input
              type="tel"
              id="phone"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              enterKeyHint="next"
              required
              aria-describedby="phone-hint"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              data-error="phone-error"
            />
            <div id="phone-error" className="error-msg">
              <span role="img" aria-label="Erro">
                ❌
              </span>{' '}
              Informe um telefone ou WhatsApp válido para contato.
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="address">
                Endereço (Rua / Av):
                <span className="required-star" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                autoComplete="address-line1"
                enterKeyHint="next"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                data-error="address-error"
              />
              <div id="address-error" className="error-msg">
                <span role="img" aria-label="Erro">
                  ❌
                </span>{' '}
                Informe o nome da rua ou avenida.
              </div>
            </div>

            <div className="field">
              <label htmlFor="address_number">
                Número:
                <span className="required-star" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="address_number"
                name="address_number"
                autoComplete="address-line2"
                enterKeyHint="next"
                required
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                data-error="number-error"
              />
              <div id="number-error" className="error-msg">
                <span role="img" aria-label="Erro">
                  ❌
                </span>{' '}
                Informe o número do imóvel (ou S/N).
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="neighborhood">
              Bairro:
              <span className="required-star" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="neighborhood"
              name="neighborhood"
              autoComplete="address-level3"
              enterKeyHint="next"
              required
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              data-error="neighborhood-error"
            />
            <div id="neighborhood-error" className="error-msg">
              <span role="img" aria-label="Erro">
                ❌
              </span>{' '}
              Informe o seu bairro.
            </div>
          </div>

          <div className="field" style={{ marginBlockEnd: 0 }}>
            <label htmlFor="reference">Ponto de Referência:</label>
            <span id="ref-hint" className="hint">
              Ex: Próximo à padaria, portão branco, casa de esquina...
            </span>
            <input
              type="text"
              id="reference"
              name="reference"
              enterKeyHint="done"
              aria-describedby="ref-hint"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </section>

        {/* 3. Forma de Pagamento */}
        <section className="card" aria-labelledby="heading-payment">
          <h2 id="heading-payment" className="section-title">
            <CreditCard size={20} color="#0b3d91" aria-hidden="true" />
            3. Forma de Pagamento na Entrega
          </h2>

          <fieldset className="payment-fieldset">
            <legend className="visually-hidden">
              Escolha a forma de pagamento
            </legend>
            <div className="radio-group">
              {(Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((method) => (
                <div key={method} className="radio-option">
                  <input
                    type="radio"
                    id={`pay-${method}`}
                    name="payment_method"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  <label htmlFor={`pay-${method}`}>
                    {PAYMENT_LABELS[method]}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          {paymentMethod === 'cash' && (
            <div className="field" style={{ marginBlockEnd: 0 }}>
              <label htmlFor="change_for">Precisa de troco para quanto?</label>
              <span id="change-hint" className="hint">
                Deixe em branco se tiver o valor trocado
              </span>
              <input
                type="text"
                id="change_for"
                name="change_for"
                inputMode="numeric"
                aria-describedby="change-hint"
                value={changeFor}
                onChange={(e) => setChangeFor(e.target.value)}
                placeholder="Ex: R$ 200,00"
              />
            </div>
          )}
        </section>

        {/* Resumo e Botão de Finalizar */}
        <div className="summary-box">
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              Total do Pedido ({selectedItems.reduce((a, b) => a + b.quantity, 0)}{' '}
              item/itens)
            </div>
            <div className="summary-total">
              R$ {totalAmount.toFixed(2).replace('.', ',')}
            </div>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#f5b800', fontWeight: 800 }}>
            Entrega Rápida 🛵
          </div>
        </div>

        {submitError && (
          <div
            role="alert"
            style={{
              background: '#fce8e6',
              color: '#d93025',
              padding: '0.875rem',
              borderRadius: '10px',
              marginBlockEnd: '1rem',
              fontWeight: 600,
            }}
          >
            ❌ {submitError}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-whatsapp"
          style={{ width: '100%', minHeight: '56px', fontSize: '1.15rem' }}
          disabled={isSubmitting}
        >
          <MessageCircle size={24} aria-hidden="true" />
          {isSubmitting
            ? 'Preparando pedido...'
            : `Enviar Pedido pelo WhatsApp • R$ ${totalAmount
                .toFixed(2)
                .replace('.', ',')}`}
        </button>
      </form>

      <footer
        style={{
          marginBlockStart: '2.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#475569',
        }}
      >
        <p>
          <strong>Alexandre Gás</strong> — Segurança • Qualidade • Confiança
        </p>
        <p style={{ marginBlockStart: '0.5rem' }}>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              textDecoration: 'underline',
              color: '#0b3d91',
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={14} aria-hidden="true" />
            Acesso do Dono / Gerenciamento de Pedidos
          </Link>
        </p>
      </footer>
    </main>
  );
}
