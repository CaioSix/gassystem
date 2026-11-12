import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Order, OrderItem, OrderStatus, PaymentMethod } from './types';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// Fallback local file for instant local/serverless demo when Supabase env vars are not yet set
const LOCAL_DB_PATH =
  process.env.VERCEL === '1'
    ? '/tmp/alexandre-gas-orders.json'
    : path.join(process.cwd(), '.local-orders.json');

function readLocalOrders(): Order[] {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

function writeLocalOrders(orders: Order[]): void {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local orders fallback:', err);
  }
}

export async function listOrders(): Promise<Order[]> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }
    return (data || []).map((row) => ({
      ...row,
      total: Number(row.total),
    })) as Order[];
  }

  const orders = readLocalOrders();
  return orders.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }
    return {
      ...data,
      total: Number(data.total),
    } as Order;
  }

  const orders = readLocalOrders();
  return orders.find((o) => o.id === id) || null;
}

export interface CreateOrderInput {
  customer_name: string;
  phone: string;
  address: string;
  address_number: string;
  neighborhood: string;
  reference?: string;
  payment_method: PaymentMethod;
  change_for?: string;
  items: OrderItem[];
  total: number;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: input.customer_name.trim(),
        phone: input.phone.trim(),
        address: input.address.trim(),
        address_number: input.address_number.trim(),
        neighborhood: input.neighborhood.trim(),
        reference: (input.reference || '').trim(),
        payment_method: input.payment_method,
        change_for: (input.change_for || '').trim(),
        items: input.items,
        total: input.total,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Erro ao criar pedido no Supabase');
    }

    return {
      ...data,
      total: Number(data.total),
    } as Order;
  }

  const newOrder: Order = {
    id: crypto.randomUUID(),
    customer_name: input.customer_name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    address_number: input.address_number.trim(),
    neighborhood: input.neighborhood.trim(),
    reference: (input.reference || '').trim(),
    payment_method: input.payment_method,
    change_for: (input.change_for || '').trim(),
    items: input.items,
    total: input.total,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };

  const orders = readLocalOrders();
  orders.unshift(newOrder);
  writeLocalOrders(orders);
  return newOrder;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status, updated_at: now })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      ...data,
      total: Number(data.total),
    } as Order;
  }

  const orders = readLocalOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;

  orders[idx] = {
    ...orders[idx],
    status,
    updated_at: now,
  };
  writeLocalOrders(orders);
  return orders[idx];
}

export async function deleteOrder(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase && isSupabaseConfigured) {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      throw new Error(error.message);
    }
    return true;
  }

  const orders = readLocalOrders();
  const filtered = orders.filter((o) => o.id !== id);
  if (filtered.length === orders.length) return false;
  writeLocalOrders(filtered);
  return true;
}
