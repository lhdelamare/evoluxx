import React, { useRef, useState } from 'react';
import { AppRoute, Client } from '../types';
import {
  fetchAddressByCep,
  formatCep,
  formatCurrency,
  formatDocument,
  getDocumentLabel,
} from '../utils/format';

interface ClientsViewProps {
  clients: Client[];
  onNavigate: (route: AppRoute, paramId?: number) => void;
  onRefresh: () => void;
  openModalInitially?: boolean;
  onModalClosed?: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onNavigate,
  onRefresh,
  openModalInitially = false,
  onModalClosed,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'potential'>('all');
  const [showModal, setShowModal] = useState(openModalInitially);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepStatus, setCepStatus] = useState<string | null>(null);

  const numberInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    person_type: 'PJ' as 'PJ' | 'PF',
    company_name: '',
    trade_name: '',
    cnpj: '',
    state_registration: '',
    segment: 'Estética Automotiva',
    tier: 'VIP • Ouro',
    status: 'Ativo',
    zip_code: '',
    street: '',
    address_number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    region: 'Zona Sul',
    contact_name: '',
    contact_role: 'Gerente de Compras',
    phone: '',
    whatsapp: '',
    credit_limit: '15000',
    payment_terms: '28 / 35 / 42 DDL',
    notes: '',
  });

  React.useEffect(() => {
    if (openModalInitially) {
      handleOpenNew();
    }
  }, [openModalInitially]);

  const handleOpenNew = () => {
    setEditingClient(null);
    setCepStatus(null);
    setFormData({
      person_type: 'PJ',
      company_name: '',
      trade_name: '',
      cnpj: '',
      state_registration: '',
      segment: 'Estética Automotiva',
      tier: 'VIP • Ouro',
      status: 'Ativo',
      zip_code: '',
      street: '',
      address_number: '',
      complement: '',
      neighborhood: '',
      city: 'São Paulo',
      state: 'SP',
      region: 'Zona Sul',
      contact_name: '',
      contact_role: 'Gerente de Compras',
      phone: '',
      whatsapp: '',
      credit_limit: '15000',
      payment_terms: '28 / 35 / 42 DDL',
      notes: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setCepStatus(null);
    const detectedType: 'PJ' | 'PF' =
      client.person_type ||
      ((client.cnpj || '').replace(/\D/g, '').length === 11 ? 'PF' : 'PJ');

    // Parse street and number from existing address if street is empty
    let parsedStreet = client.street || '';
    let parsedNumber = client.address_number || '';
    if (!parsedStreet && client.address) {
      const parts = client.address.split(',');
      parsedStreet = parts[0]?.trim() || client.address;
      parsedNumber = parts[1]?.trim() || '';
    }

    setFormData({
      person_type: detectedType,
      company_name: client.company_name,
      trade_name: client.trade_name,
      cnpj: client.cnpj,
      state_registration: client.state_registration || '',
      segment: client.segment,
      tier: client.tier,
      status: client.status,
      zip_code: client.zip_code || '',
      street: parsedStreet,
      address_number: parsedNumber,
      complement: client.complement || '',
      neighborhood: client.neighborhood,
      city: client.city,
      state: client.state,
      region: client.region || 'Zona Sul',
      contact_name: client.contact_name,
      contact_role: client.contact_role,
      phone: client.phone,
      whatsapp: client.whatsapp,
      credit_limit: String(client.credit_limit),
      payment_terms: client.payment_terms,
      notes: client.notes || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (onModalClosed) onModalClosed();
  };

  const handleCepChange = async (rawValue: string) => {
    const formatted = formatCep(rawValue);
    setFormData((prev) => ({ ...prev, zip_code: formatted }));

    const cleanDigits = rawValue.replace(/\D/g, '');
    if (cleanDigits.length === 8) {
      await triggerCepLookup(cleanDigits);
    } else {
      setCepStatus(null);
    }
  };

  const triggerCepLookup = async (cleanDigits?: string) => {
    const digits = (cleanDigits || formData.zip_code).replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepStatus('Digite os 8 números do CEP.');
      return;
    }

    setCepLoading(true);
    setCepStatus('Buscando endereço pelo CEP...');
    try {
      let result = null;
      const apiRes = await fetch(`/api/cep/${digits}`);
      if (apiRes.ok) {
        result = await apiRes.json();
      } else {
        result = await fetchAddressByCep(digits);
      }

      if (result && (result.street || result.city)) {
        setFormData((prev) => ({
          ...prev,
          street: result.street || prev.street,
          neighborhood: result.neighborhood || prev.neighborhood,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
        setCepStatus('Endereço preenchido automaticamente! Informe apenas o número e complemento.');
        setTimeout(() => {
          numberInputRef.current?.focus();
        }, 100);
      } else {
        setCepStatus('CEP não encontrado no webservice. Preencha manualmente.');
      }
    } catch {
      setCepStatus('Não foi possível consultar o CEP no momento.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const composedAddress = formData.street
        ? `${formData.street}${formData.address_number ? `, ${formData.address_number}` : ''}${
            formData.complement ? ` - ${formData.complement}` : ''
          }`
        : '';

      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          trade_name: formData.trade_name || formData.company_name,
          contact_name:
            formData.contact_name ||
            (formData.person_type === 'PF' ? formData.company_name : 'Responsável'),
          address: composedAddress,
          credit_limit: Number(formData.credit_limit) || 15000,
        }),
      });
      if (res.ok) {
        handleCloseModal();
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir este cliente da carteira?')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.trade_name.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.toLowerCase().includes(search.toLowerCase()) ||
      c.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'active') return c.status === 'Ativo';
    if (filter === 'inactive') return c.status.includes('Inativo');
    if (filter === 'potential') return c.status === 'Potencial' || c.tier === 'Potencial';
    return true;
  });

  const activeCount = clients.filter((c) => c.status === 'Ativo').length;
  const inactiveCount = clients.filter((c) => c.status.includes('Inativo')).length;
  const potentialCount = clients.filter((c) => c.status === 'Potencial' || c.tier === 'Potencial').length;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-space-md py-space-md gap-space-md pb-24">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
            <span className="font-label-md text-label-md text-secondary tracking-wide uppercase">
              Gestão de Contas (PJ &amp; PF)
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Carteira de Clientes{' '}
            <span className="text-secondary font-semibold text-[15px]">({clients.length} cadastrados)</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="h-10 px-space-md rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-sm active:scale-95 transition-transform flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
          <span className="material-symbols-outlined text-[20px]">search</span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por Nome, Razão Social, CPF, CNPJ ou Bairro..."
          className="w-full h-11 pl-10 pr-10 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-md text-body-md shadow-sm focus:outline-none focus:bg-surface-container-low transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="w-full overflow-x-auto no-scrollbar -mx-space-md px-space-md flex items-center gap-space-xs">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 h-8 rounded-full font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition-all ${
            filter === 'all'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">corporate_fare</span>
          <span>Todos ({clients.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`px-3.5 h-8 rounded-full font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition-all ${
            filter === 'active'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[15px] text-secondary">verified</span>
          <span>Positivados / Ativos ({activeCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('inactive')}
          className={`px-3.5 h-8 rounded-full font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition-all ${
            filter === 'inactive'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[15px] text-error">hourglass_bottom</span>
          <span>Inativos +30 dias ({inactiveCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter('potential')}
          className={`px-3.5 h-8 rounded-full font-label-sm text-label-sm whitespace-nowrap flex items-center gap-1.5 active:scale-95 transition-all ${
            filter === 'potential'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[15px] text-secondary-container">flag</span>
          <span>Potenciais ({potentialCount})</span>
        </button>
      </div>

      {/* Client Cards List */}
      <div className="flex flex-col gap-space-md mt-space-xs">
        {filteredClients.map((client) => {
          const isInactive = client.status.includes('Inativo');
          const creditAvailable = Math.max(0, Number(client.credit_limit) - Number(client.credit_used));
          const creditPercent = Math.min(
            100,
            Math.round((creditAvailable / Math.max(1, Number(client.credit_limit))) * 100)
          );
          const docLabel = getDocumentLabel(client.cnpj, client.person_type);

          return (
            <div
              key={client.id}
              className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden"
            >
              <div
                className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  isInactive ? 'bg-error' : client.status === 'Potencial' ? 'bg-secondary-container' : 'bg-secondary'
                }`}
              />

              <div className="flex items-start justify-between gap-2 pl-1.5">
                <div
                  onClick={() => onNavigate('cliente-detalhe', client.id)}
                  className="flex items-start gap-3 min-w-0 cursor-pointer flex-1"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-surface-container">
                    <img
                      className="w-full h-full object-cover"
                      src={client.image_url}
                      alt={client.company_name}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px]">
                        {docLabel === 'CPF' ? 'PF • Pessoa Física' : 'PJ • Empresa'}
                      </span>
                      {isInactive ? (
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm flex items-center gap-1 font-bold">
                          <span className="material-symbols-outlined text-[13px]">warning</span>
                          Atenção • Sem compras há +30 dias
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm flex items-center gap-1 font-bold">
                          <span className="material-symbols-outlined text-[13px]">stars</span>
                          {client.tier} • {client.segment}
                        </span>
                      )}
                      <span className="font-label-sm text-[11px] text-on-surface-variant">{client.region}</span>
                    </div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface truncate mt-0.5 hover:text-primary transition-colors">
                      {client.company_name}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {docLabel}: {client.cnpj} • CEP {client.zip_code} • {client.neighborhood}, {client.city} -{' '}
                      {client.state}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(client)}
                    title="Editar cliente"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(client.id)}
                    title="Excluir cliente"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-error-container hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {/* Financial & Last Purchase Summary */}
              <div
                onClick={() => onNavigate('cliente-detalhe', client.id)}
                className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1.5">
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        isInactive ? 'text-error' : 'text-secondary'
                      }`}
                    >
                      {isInactive ? 'history_toggle_off' : 'shopping_bag'}
                    </span>
                    Última Compra ({client.last_purchase_date || 'Sem registro'})
                  </span>
                  <span className="font-label-lg text-label-lg text-on-surface font-bold">
                    {formatCurrency(client.last_purchase_value)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="flex items-center justify-between font-label-sm text-label-sm">
                    <span className="text-on-surface-variant">
                      Crédito Disponível:{' '}
                      <strong className="text-secondary font-semibold">{formatCurrency(creditAvailable)}</strong>
                    </span>
                    <span className="text-outline">Limite: {formatCurrency(client.credit_limit)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${creditPercent}%` }} />
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${client.phone}`}
                    aria-label="Ligar para cliente"
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[19px]">call</span>
                  </a>
                  <a
                    href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir WhatsApp"
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary hover:bg-secondary-container hover:text-on-secondary-container transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[19px]">chat</span>
                  </a>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      `${client.address}, ${client.city} - ${client.state}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Navegar até endereço"
                    className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[19px]">near_me</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onNavigate('cliente-detalhe', client.id)}
                    className="h-10 px-3 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[17px]">visibility</span>
                    <span>Ficha 360°</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('novo-pedido', client.id)}
                  className="h-10 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  <span>Criar Pedido</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Novo / Editar Cliente (Pessoa Jurídica ou Pessoa Física + Busca Automática por CEP) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-space-lg shadow-xl space-y-space-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person_add</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seletor Pessoa Jurídica (CNPJ) vs Pessoa Física (CPF) */}
              <div className="p-1 bg-surface-container rounded-xl grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      person_type: 'PJ',
                      cnpj: formatDocument(prev.cnpj, 'PJ'),
                    }))
                  }
                  className={`h-10 rounded-lg font-label-md flex items-center justify-center gap-1.5 transition-all ${
                    formData.person_type === 'PJ'
                      ? 'bg-primary-container text-on-primary shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">domain</span>
                  <span>Pessoa Jurídica (CNPJ)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      person_type: 'PF',
                      cnpj: formatDocument(prev.cnpj, 'PF'),
                    }))
                  }
                  className={`h-10 rounded-lg font-label-md flex items-center justify-center gap-1.5 transition-all ${
                    formData.person_type === 'PF'
                      ? 'bg-primary-container text-on-primary shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span>Pessoa Física (CPF)</span>
                </button>
              </div>

              {/* Bloco 1: Identificação (PJ ou PF) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    {formData.person_type === 'PF' ? 'CPF *' : 'CNPJ *'}
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cnpj: formatDocument(e.target.value, formData.person_type),
                      })
                    }
                    placeholder={
                      formData.person_type === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    {formData.person_type === 'PF' ? 'RG / Documento (Opcional)' : 'Inscrição Estadual'}
                  </label>
                  <input
                    type="text"
                    value={formData.state_registration}
                    onChange={(e) =>
                      setFormData({ ...formData, state_registration: e.target.value })
                    }
                    placeholder={formData.person_type === 'PF' ? 'Ex: 45.123.890-X' : 'Isento ou Nº IE'}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    {formData.person_type === 'PF' ? 'Nome Completo do Cliente *' : 'Razão Social *'}
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder={
                      formData.person_type === 'PF'
                        ? 'Ex: João Carlos da Silva'
                        : 'Ex: Detailer Master Estética Automotiva LTDA'
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    {formData.person_type === 'PF'
                      ? 'Apelido / Nome da Oficina'
                      : 'Nome Fantasia *'}
                  </label>
                  <input
                    required={formData.person_type === 'PJ'}
                    type="text"
                    value={formData.trade_name}
                    onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                    placeholder={
                      formData.person_type === 'PF'
                        ? 'Ex: João Detailer / Lava-Jato do João'
                        : 'Ex: Detailer Master Estética'
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    Segmento de Atuação
                  </label>
                  <select
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  >
                    <option>Estética Automotiva</option>
                    <option>Lava-Rápido</option>
                    <option>Detailer Autônomo (PF)</option>
                    <option>Concessionária</option>
                    <option>Auto Posto</option>
                    <option>Oficina &amp; Funilaria</option>
                    <option>Consumidor / Hobista</option>
                  </select>
                </div>
              </div>

              {/* Bloco 2: Endereço Iniciado pelo CEP com Preenchimento Automático */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-high space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-secondary uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">location_on</span>
                    Endereço (Busca Automática por CEP)
                  </span>
                  {cepLoading && (
                    <span className="font-label-sm text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined animate-spin text-[15px]">sync</span>
                      Consultando CEP...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1º Campo do Endereço: CEP */}
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                      1. CEP *
                    </label>
                    <div className="relative flex items-center">
                      <input
                        required
                        type="text"
                        value={formData.zip_code}
                        onChange={(e) => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full h-10 pl-3 pr-9 rounded-xl bg-surface-container-lowest text-on-surface font-headline-sm ring-1 ring-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => triggerCepLookup()}
                        title="Buscar CEP"
                        className="absolute right-2 text-secondary hover:text-primary flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[20px]">search</span>
                      </button>
                    </div>
                  </div>

                  {/* Logradouro preenchido automaticamente */}
                  <div className="sm:col-span-2">
                    <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                      Logradouro (Rua / Avenida) *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="Preenchido automaticamente pelo CEP"
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md focus:outline-none"
                    />
                  </div>

                  {/* Número (Foco automático após CEP) */}
                  <div>
                    <label className="font-label-sm text-label-sm text-primary font-bold block mb-1">
                      2. Número *
                    </label>
                    <input
                      ref={numberInputRef}
                      required
                      type="text"
                      value={formData.address_number}
                      onChange={(e) =>
                        setFormData({ ...formData, address_number: e.target.value })
                      }
                      placeholder="Ex: 1420"
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md ring-1 ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Complemento */}
                  <div className="sm:col-span-2">
                    <label className="font-label-sm text-label-sm text-primary font-bold block mb-1">
                      3. Complemento (Galpão, Box, Sala, Bloco)
                    </label>
                    <input
                      type="text"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      placeholder="Ex: Box 04 / Galpão B (Opcional)"
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md focus:outline-none"
                    />
                  </div>

                  {/* Bairro, Cidade e UF preenchidos pelo CEP */}
                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                      Bairro *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Bairro"
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                      Cidade *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                      UF *
                    </label>
                    <input
                      required
                      type="text"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value.toUpperCase() })
                      }
                      placeholder="SP"
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md uppercase focus:outline-none"
                    />
                  </div>
                </div>

                {cepStatus && (
                  <p className="font-label-sm text-[11px] text-secondary flex items-center gap-1 pt-0.5">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    <span>{cepStatus}</span>
                  </p>
                )}
              </div>

              {/* Bloco 3: Contato & Financeiro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    {formData.person_type === 'PF'
                      ? 'Nome para Contato'
                      : 'Nome do Comprador *'}
                  </label>
                  <input
                    required={formData.person_type === 'PJ'}
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="Marcos Oliveira"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value, whatsapp: '55' + e.target.value })
                    }
                    placeholder="11987654321"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    Limite de Crédito (R$)
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    Condição de Pagamento
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  >
                    <option>28 / 35 / 42 DDL</option>
                    <option>Boleto Faturado 28 Dias</option>
                    <option>PIX à Vista</option>
                    <option>Cartão de Crédito 3x</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="font-label-sm text-label-sm text-on-surface block mb-1">
                    Observações de Campo / Giro de Produtos
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Anotações sobre preferências de compra, galões mais usados, horário de recebimento..."
                    className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 h-10 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 h-10 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg shadow-sm"
                >
                  {saving ? 'Salvando...' : editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
