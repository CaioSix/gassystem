export type OrderStatus = 'pending' | 'accepted' | 'delivering' | 'completed' | 'cancelled';

export type PaymentMethod = 'pix' | 'card' | 'cash' | 'vale_gas';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  address_number: string;
  neighborhood: string;
  reference: string;
  payment_method: PaymentMethod;
  change_for?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price?: number;
  badge?: string;
}

export const PRODUCTS: Product[] = [
  {
    id: 'gas-p13',
    name: 'Botijão de Gás P13 (13kg)',
    description: 'Gás de cozinha residencial (troca de vasilhame)',
    badge: 'Mais pedido',
  },
  {
    id: 'agua-20l',
    name: 'Galão de Água Mineral 20L',
    description: 'Água mineral natural (troca de galão)',
  },
  {
    id: 'gas-p45',
    name: 'Cilindro de Gás P45 (45kg)',
    description: 'Ideal para comércio e condomínios',
  },
  {
    id: 'kit-regulador',
    name: 'Kit Regulador + Mangueira Normatizada',
    description: 'Com selo INMETRO e instalação inclusa',
  },
];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX (Chave ou QR Code na entrega)',
  card: 'Cartão de Crédito / Débito (Levamos a maquininha)',
  cash: 'Dinheiro na entrega',
  vale_gas: 'Vale Gás',
};

export const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    customerTitle: string;
    customerDescription: string;
    color: string;
    step: number;
  }
> = {
  pending: {
    label: 'Aguardando Aceite',
    customerTitle: 'Aguardando confirmação da loja...',
    customerDescription:
      'Recebemos seu pedido! O Alexandre Gás já foi notificado e vai aceitar em instantes.',
    color: 'amber',
    step: 1,
  },
  accepted: {
    label: 'Pedido Aceito',
    customerTitle: 'Pedido Aceito! Preparando envio 🔥',
    customerDescription:
      'O Alexandre Gás aceitou seu pedido e já está separando para o entregador sair.',
    color: 'blue',
    step: 2,
  },
  delivering: {
    label: 'Saiu para Entrega',
    customerTitle: 'Entregador a caminho! 🛵💨',
    customerDescription:
      'Seu pedido já saiu da distribuidora e logo chegará no seu endereço.',
    color: 'indigo',
    step: 3,
  },
  completed: {
    label: 'Entregue',
    customerTitle: 'Pedido Entregue! Muito obrigado 😃',
    customerDescription:
      'Entrega concluída com sucesso. Conte sempre com o Alexandre Gás!',
    color: 'emerald',
    step: 4,
  },
  cancelled: {
    label: 'Cancelado',
    customerTitle: 'Pedido Cancelado',
    customerDescription:
      'Este pedido foi cancelado. Entre em contato pelo WhatsApp se precisar de ajuda.',
    color: 'red',
    step: 0,
  },
};

export const STORE_HOURS_TEXT = [
  'Seg a Sex: 08:00 às 19:30',
  'Sábados: 08:00 às 18:30',
  'Domingos: 08:00 às 13:30',
];
