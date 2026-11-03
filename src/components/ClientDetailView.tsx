import React, { useEffect, useState } from 'react';
import { AppRoute, Client } from '../types';
import { fetchAddressByCep, formatCep, formatCurrency, getDocumentLabel } from '../utils/format';

interface ClientDetailViewProps {
  clientId: number;
  onNavigate: (route: AppRoute, paramId?: number) => void;
}

export const ClientDetailView: React.FC<ClientDetailViewProps> = ({ clientId, onNavigate }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'products' | 'notes'>('history');
  const [loading, setLoading] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [checkInDone, setCheckInDone] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({
    zip_code: '',
    street: '',
    address_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'SP',
  });
  const [cepMsg, setCepMsg] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data);
        setNoteInput(data.notes || '');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [clientId]);

  const handleSaveNotes = async () => {
    if (!client) return;
    await fetch(`/api/clients/${client.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...client, notes: noteInput }),
    });
    fetchDetail();
  };

  const handleQuickCheckIn = async () => {
    if (!client) return;
    await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        scheduled_date: 'Hoje',
        scheduled_time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        purpose: 'Check-in Presencial GPS Realizado na Ficha do Cliente',
        notes: noteInput,
      }),
    });
    setCheckInDone(true);
  };

  if (loading || !client) {
    return (
      <div className="flex items-center justify-center py-20 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">sync</span>
        Carregando ficha do cliente...
      </div>
    );
  }

  const creditLimit = Number(client.credit_limit) || 15000;
  const creditUsed = Number(client.credit_used) || 0;
  const creditFree = Math.max(0, creditLimit - creditUsed);
  const usedPercent = Math.min(100, Math.round((creditUsed / Math.max(1, creditLimit)) * 100));
  const docLabel = getDocumentLabel(client.cnpj, client.person_type);

  const handleOpenAddrEdit = () => {
    let parsedStreet = client.street || '';
    let parsedNumber = client.address_number || '';
    if (!parsedStreet && client.address) {
      const parts = client.address.split(',');
      parsedStreet = parts[0]?.trim() || client.address;
      parsedNumber = parts[1]?.trim() || '';
    }
    setAddrForm({
      zip_code: client.zip_code || '',
      street: parsedStreet,
      address_number: parsedNumber,
      complement: client.complement || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || 'SP',
    });
    setCepMsg(null);
    setEditingAddress(true);
  };

  const handleCepLookupInline = async (rawCep: string) => {
    const formatted = formatCep(rawCep);
    setAddrForm((prev) => ({ ...prev, zip_code: formatted }));
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepMsg('Buscando endereço no webservice...');
      let result = null;
      const apiRes = await fetch(`/api/cep/${digits}`);
      if (apiRes.ok) {
        result = await apiRes.json();
      } else {
        result = await fetchAddressByCep(digits);
      }
      if (result && (result.street || result.city)) {
        setAddrForm((prev) => ({
          ...prev,
          street: result.street || prev.street,
          neighborhood: result.neighborhood || prev.neighborhood,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
        setCepMsg('Endereço encontrado! Preencha apenas Número e Complemento.');
      } else {
        setCepMsg('CEP não encontrado.');
      }
    }
  };

  const handleSaveInlineAddress = async () => {
    const composedAddress = addrForm.street
      ? `${addrForm.street}${addrForm.address_number ? `, ${addrForm.address_number}` : ''}${
          addrForm.complement ? ` - ${addrForm.complement}` : ''
        }`
      : client.address;
    await fetch(`/api/clients/${client.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...client,
        ...addrForm,
        address: composedAddress,
      }),
    });
    setEditingAddress(false);
    fetchDetail();
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-space-md py-space-sm space-y-space-md pb-24">
      {/* Top Action & Entity Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('clientes')}
          className="flex items-center gap-1 text-on-surface hover:text-primary font-label-md text-label-md transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span>Carteira B2B</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            aria-label="Histórico de pedidos"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">history_edu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            aria-label="Adicionar anotação rápida"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
          </button>
        </div>
      </div>

      {/* Customer Primary Ident Card */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col space-y-space-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                {client.tier}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm">
                {client.status}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface leading-tight">
              {client.company_name}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              {docLabel}: {client.cnpj} •{' '}
              {docLabel === 'CPF'
                ? `RG/Doc: ${client.state_registration || 'Pessoa Física'}`
                : `Inscr. Estadual: ${client.state_registration || 'Isento'}`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0">
            <span
              className="material-symbols-outlined text-[28px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              stream_apps
            </span>
          </div>
        </div>
      </div>

      {/* Card: Endereço, Contato & Quick Field Actions */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm space-y-space-md">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex items-start gap-space-sm flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[22px]">location_on</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
                Endereço (CEP: {client.zip_code})
              </span>
              <p className="font-body-md text-body-md text-on-surface font-semibold">
                {client.address}
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                CEP {client.zip_code} • {client.neighborhood} • {client.city} - {client.state}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenAddrEdit}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary font-label-sm flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-[15px]">edit_location_alt</span>
            <span>Alterar CEP</span>
          </button>
        </div>

        {editingAddress && (
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="font-label-sm text-on-surface block mb-0.5">1. CEP *</label>
                <input
                  type="text"
                  maxLength={9}
                  value={addrForm.zip_code}
                  onChange={(e) => handleCepLookupInline(e.target.value)}
                  placeholder="00000-000"
                  className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-headline-sm ring-1 ring-secondary/40"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-label-sm text-on-surface block mb-0.5">Logradouro</label>
                <input
                  type="text"
                  value={addrForm.street}
                  onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                />
              </div>
              <div>
                <label className="font-label-sm text-primary font-bold block mb-0.5">
                  2. Número *
                </label>
                <input
                  type="text"
                  value={addrForm.address_number}
                  onChange={(e) => setAddrForm({ ...addrForm, address_number: e.target.value })}
                  placeholder="Nº"
                  className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm ring-1 ring-primary/40"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-label-sm text-primary font-bold block mb-0.5">
                  3. Complemento
                </label>
                <input
                  type="text"
                  value={addrForm.complement}
                  onChange={(e) => setAddrForm({ ...addrForm, complement: e.target.value })}
                  placeholder="Box, Galpão, Sala..."
                  className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                />
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-0.5">Bairro</label>
                <input
                  type="text"
                  value={addrForm.neighborhood}
                  onChange={(e) => setAddrForm({ ...addrForm, neighborhood: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                />
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-0.5">Cidade</label>
                <input
                  type="text"
                  value={addrForm.city}
                  onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                />
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-0.5">UF</label>
                <input
                  type="text"
                  maxLength={2}
                  value={addrForm.state}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, state: e.target.value.toUpperCase() })
                  }
                  className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm uppercase"
                />
              </div>
            </div>
            {cepMsg && <p className="font-label-sm text-[11px] text-secondary">{cepMsg}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAddress(false)}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface font-label-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveInlineAddress}
                className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-sm"
              >
                Salvar Endereço
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-space-sm bg-surface-container-low p-space-sm rounded-lg">
          <img
            className="w-10 h-10 rounded-full object-cover shrink-0"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbtHp4xrvN3yHY8EmZ82u0_pnxI0NP0KkheCus2AqwfDA5YvkX8TqtXxVlpeHCU85_tXs1iXvWRn5uuSNH2mT62Vlt3mIxI5wi08dVx5ns969mMuCH0VPpwl1Ubk0EpDBQAHGLe1BsTVz-XGlZb7bBmHlg8-m5Dceizz8Q4lxscAmh5HtlKx4_3kvTViUGhvWbsz6CP7_ICM9jG749fEiDbgcBPoxvM1a7f6wxUo2tjUHYWpAjAg"
            alt={client.contact_name}
          />
          <div className="flex-1 min-w-0">
            <p className="font-label-md text-label-md text-on-surface truncate">{client.contact_name}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{client.contact_role}</p>
          </div>
          <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded-md shrink-0">
            Comprador
          </span>
        </div>

        {/* Quick Dispatch Buttons */}
        <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
          <a
            href={`tel:${client.phone}`}
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all active:scale-95 text-center"
          >
            <span className="material-symbols-outlined text-[20px] text-tertiary">call</span>
            <span className="font-label-sm text-label-sm mt-1">Ligar</span>
          </a>
          <a
            href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all active:scale-95 text-center"
          >
            <span className="material-symbols-outlined text-[20px] text-secondary">chat</span>
            <span className="font-label-sm text-label-sm mt-1">WhatsApp</span>
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(
              `${client.address}, ${client.city} - ${client.state}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition-all active:scale-95 text-center"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">navigation</span>
            <span className="font-label-sm text-label-sm mt-1">Waze / Maps</span>
          </a>
        </div>
      </div>

      {/* Card: Financeiro e Limite de Crédito B2B */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm space-y-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">payments</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Crédito &amp; Condições B2B
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Sem pendências / Bom pagador
          </span>
        </div>

        {/* Credit Metrics Summary */}
        <div className="bg-surface-container-low p-space-md rounded-xl space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="font-label-md text-label-md text-on-surface-variant">Limite Total Aprovado</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">
              {formatCurrency(creditLimit)}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden flex">
              <div
                className="h-full bg-primary-container rounded-full"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-on-surface-variant flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-container inline-block" />
                Utilizado: <strong className="text-on-surface">{formatCurrency(creditUsed)}</strong> (
                {usedPercent}%)
              </span>
              <span className="text-secondary flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                Livre: {formatCurrency(creditFree)}
              </span>
            </div>
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
          <div className="p-space-sm rounded-lg bg-surface-container">
            <span className="font-label-sm text-label-sm text-on-surface-variant block">Condição Padrão</span>
            <p className="font-label-md text-label-md text-on-surface mt-0.5">{client.payment_terms}</p>
            <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
              Boleto / Faturado
            </span>
          </div>
          <div className="p-space-sm rounded-lg bg-surface-container">
            <span className="font-label-sm text-label-sm text-on-surface-variant block">
              Ticket Médio Mensal
            </span>
            <p className="font-label-md text-label-md text-on-surface mt-0.5">
              {formatCurrency(client.avg_monthly_ticket)}
            </p>
            <span className="font-body-sm text-body-sm text-secondary font-semibold text-[11px]">
              ↑ 12% trimestral
            </span>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex p-1 bg-surface-container rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg font-label-md text-label-md text-center transition-all ${
            activeTab === 'history'
              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Últimos Pedidos ({client.orders?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2 rounded-lg font-label-md text-label-md text-center transition-all ${
            activeTab === 'products'
              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Mais Comprados
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-2 rounded-lg font-label-md text-label-md text-center transition-all ${
            activeTab === 'notes'
              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Notas &amp; Visitas
        </button>
      </div>

      {/* TAB 1: Últimos Pedidos */}
      {activeTab === 'history' && (
        <div className="space-y-space-sm">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Últimas Emissões B2B</h2>
            <span
              onClick={() => onNavigate('pedidos')}
              className="font-label-sm text-label-sm text-secondary cursor-pointer hover:underline"
            >
              Ver todos os pedidos
            </span>
          </div>

          {(!client.orders || client.orders.length === 0) && (
            <div className="bg-surface-container-lowest p-6 rounded-xl text-center text-on-surface-variant">
              Nenhum pedido emitido ainda para este cliente.
            </div>
          )}

          {client.orders?.map((order) => (
            <div
              key={order.id}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col space-y-space-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Pedido #{order.order_number}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">
                    {order.status}
                  </span>
                </div>
                <span className="font-data-currency text-data-currency text-on-surface">
                  {formatCurrency(order.total)}
                </span>
              </div>

              <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  {new Date(order.created_at).toLocaleDateString('pt-BR')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">receipt</span>
                  {order.nfe_number || 'NF-e Emitida'}
                </span>
              </div>

              {order.vehicle_plate && (
                <div className="text-body-sm text-secondary font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  Entregue pelo veículo {order.vehicle_plate} ({order.vehicle_model})
                </div>
              )}

              <div className="pt-space-xs flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant bg-surface-container-low p-space-xs rounded-lg">
                <span className="truncate pr-2">
                  {order.items
                    ?.map((i) => `${i.product_name} (x${i.quantity})`)
                    .join(', ') || 'Itens do pedido B2B'}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('novo-pedido', client.id)}
                  className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-0.5 shrink-0"
                >
                  Replicar
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Produtos Mais Comprados */}
      {activeTab === 'products' && (
        <div className="space-y-space-sm">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Mix Frequente do Cliente</h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Giro dos últimos 90 dias
            </span>
          </div>

          {client.topProducts?.map((prod, idx) => (
            <div
              key={prod.id}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-md"
            >
              <img
                className="w-14 h-14 rounded-lg object-cover shrink-0 bg-surface-container"
                src={prod.image_url}
                alt={prod.name}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-label-sm text-label-sm px-1.5 py-0.2 rounded ${
                      idx === 0
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {idx + 1}º Mais Pedido
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface truncate mt-0.5">
                  {prod.name}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Cód. {prod.code} • {prod.packaging} • {prod.dilution}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-label-md text-label-md text-on-surface font-bold">
                    {formatCurrency(prod.unit_price)} un.
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary bg-secondary-fixed/40 px-2 py-0.5 rounded-full">
                    Comprado {Number(prod.total_bought) || (3 - idx) * 6} un.
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Notas e Visitas */}
      {activeTab === 'notes' && (
        <div className="space-y-space-sm">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm space-y-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Anotações Comerciais &amp; Histórico de Campo
              </span>
              <span className="font-label-sm text-label-sm text-primary bg-primary-fixed px-2 py-0.5 rounded-full">
                Meta: Ampliar Galões 20L
              </span>
            </div>
            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface font-body-sm focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="px-4 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-sm hover:opacity-90"
              >
                Salvar Anotação
              </button>
            </div>
          </div>

          <div className="bg-surface-container-low p-space-md rounded-xl text-center space-y-2">
            <span className="material-symbols-outlined text-secondary text-[28px]">pin_drop</span>
            <p className="font-headline-sm text-headline-sm text-on-surface">
              Você está próximo a esta oficina?
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Registre sua presença no GPS da distribuidora para liberar bonificação de visita.
            </p>
            <button
              type="button"
              onClick={handleQuickCheckIn}
              disabled={checkInDone}
              className={`w-full py-2.5 rounded-xl font-label-md text-label-md transition-colors flex items-center justify-center gap-1.5 ${
                checkInDone
                  ? 'bg-green-600 text-white'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              {checkInDone
                ? 'Check-in Presencial Registrado com Sucesso!'
                : 'Realizar Check-in de Visita'}
            </button>
          </div>
        </div>
      )}

      {/* Persistent Action Button */}
      <div className="pt-space-sm pb-space-sm">
        <button
          type="button"
          onClick={() => onNavigate('novo-pedido', client.id)}
          className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">add_shopping_cart</span>
          <span>Iniciar Novo Pedido para este Cliente</span>
        </button>
      </div>
    </div>
  );
};

