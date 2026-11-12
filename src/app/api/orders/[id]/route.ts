import { NextRequest, NextResponse } from 'next/server';
import { getOrderById, updateOrderStatus } from '@/lib/store';
import { OrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'delivering',
  'completed',
  'cancelled',
];

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao buscar pedido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const status = body.status as OrderStatus;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const updated = await updateOrderStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ order: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar pedido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
