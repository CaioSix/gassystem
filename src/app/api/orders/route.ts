import { NextRequest, NextResponse } from 'next/server';
import { createOrder, listOrders } from '@/lib/store';
import { PaymentMethod } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await listOrders();
    return NextResponse.json({ orders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao listar pedidos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const customer_name = String(body.customer_name || '').trim();
    const phone = String(body.phone || '').trim();
    const address = String(body.address || '').trim();
    const address_number = String(body.address_number || '').trim();
    const neighborhood = String(body.neighborhood || '').trim();
    const reference = String(body.reference || '').trim();
    const payment_method = (body.payment_method || 'pix') as PaymentMethod;
    const change_for = String(body.change_for || '').trim();
    const items = Array.isArray(body.items) ? body.items : [];
    const total = Number(body.total || 0);

    if (!customer_name || !phone || !address || !address_number || !neighborhood) {
      return NextResponse.json(
        { error: 'Por favor, preencha todos os campos obrigatórios de entrega.' },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Selecione pelo menos 1 produto para o pedido.' },
        { status: 400 }
      );
    }

    const order = await createOrder({
      customer_name,
      phone,
      address,
      address_number,
      neighborhood,
      reference,
      payment_method,
      change_for,
      items,
      total,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao registrar pedido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
