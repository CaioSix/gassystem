# 🔥 Alexandre Gás — Sistema de Pedidos Online & Painel em Tempo Real

Projeto enxuto feito em **Next.js (App Router)** para rodar **100% na Vercel (Serverless Functions / Lambdas)** integrado ao **Supabase** (banco gratuito com Realtime).

---

## 🚀 Como funciona o fluxo

1. **Cliente manda "Oi" no WhatsApp da distribuidora** e recebe automaticamente a **Mensagem de Saudação** do WhatsApp Business contendo o link da loja + o modelo de texto.
2. **Tela de Pedido do Cliente (`/`)**:
   - Escolhe os produtos (Gás P13, Água 20L, P45, Kit Regulador).
   - Preenche **Nome, Telefone, Endereço, Número, Bairro, Ponto de Referência e Forma de Pagamento** (ou cola diretamente o texto do WhatsApp no botão *"Já preencheu a mensagem no WhatsApp? Clique para colar aqui"*).
3. **Tela de Acompanhamento ao Vivo (`/pedido/[id]`)**:
   - Assim que o cliente envia o pedido, ele cai na tela de acompanhamento.
4. **Painel de Gerenciamento do Dono (`/admin`)**:
   - O dono vê os pedidos chegarem na hora.
   - Quando o dono clica em **"✅ Aceitar Pedido Agora"**, o status muda **instantaneamente na tela do cliente final** (de *"Aguardando confirmação"* para *"Pedido Aceito! Preparando envio 🔥"*).
   - Também possui botão **"💬 Avisar Cliente no WhatsApp"** e aba com o **modelo pronto da Mensagem de Saudação** do WhatsApp.

---

## 💻 Rodando localmente agora mesmo

```bash
npm install
npm run dev
```

> **Nota:** Para facilitar seus testes locais, se você ainda não tiver configurado as variáveis do Supabase no `.env.local`, o sistema salva os pedidos automaticamente em um arquivo local (`.local-orders.json`) para você testar tudo imediatamente!

- **Link do Cliente:** `http://localhost:3000`
- **Painel do Dono:** `http://localhost:3000/admin`

---

## ☁️ Como publicar na Vercel + Supabase (100% Gratuito)

1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. No menu lateral do Supabase, abra **SQL Editor** e execute o conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql).
3. Pegue a `Project URL` e a chave `anon public` em **Project Settings → API**.
4. Importe este repositório na [Vercel](https://vercel.com) e adicione as variáveis de ambiente (veja [`.env.example`](./.env.example)):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_STORE_WHATSAPP` (ex: `5511999999999`)
5. Clique em **Deploy**!
