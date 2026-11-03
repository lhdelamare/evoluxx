import React, { useState } from 'react';
import { AppRoute, Client, Order, Product, Vehicle, Visit } from '../types';
import { fetchAddressByCep, formatCep, formatCurrency } from '../utils/format';

interface RoutesViewProps {
  visits: Visit[];
  clients: Client[];
  vehicles: Vehicle[];
  onRefresh: () => void;
  onCheckIn: (visitId: number) => void;
  onNavigate: (route: AppRoute, paramId?: number) => void;
}

export const RoutesView: React.FC<RoutesViewProps> = ({
  visits,
  clients,
  vehicles,
  onRefresh,
  onCheckIn,
  onNavigate,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    client_id: clients[0]?.id || 1,
    vehicle_id: vehicles[0]?.id || 1,
    scheduled_date: 'Hoje',
    scheduled_time: '15:00h • Tarde',
    distance_km: '4.5',
    purpose: 'Visita Comercial & Demonstração de Produtos Automotivos',
    notes: '',
    zip_code: '',
    street: '',
    address_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: 'SP',
  });
  const [cepNotice, setCepNotice] = useState<string | null>(null);

  const handleVisitCepChange = async (rawCep: string) => {
    const formatted = formatCep(rawCep);
    setFormData((prev) => ({ ...prev, zip_code: formatted }));
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length === 8) {
      setCepNotice('Consultando CEP...');
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
        setCepNotice('Endereço preenchido! Informe apenas o número e complemento.');
      } else {
        setCepNotice('CEP não encontrado.');
      }
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    const extraLocation = formData.street
      ? ` [Local: CEP ${formData.zip_code} - ${formData.street}${
          formData.address_number ? `, ${formData.address_number}` : ''
        }${formData.complement ? ` (${formData.complement})` : ''} - ${formData.neighborhood}, ${
          formData.city
        }/${formData.state}]`
      : '';
    await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        purpose: formData.purpose + extraLocation,
      }),
    });
    setShowModal(false);
    onRefresh();
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-space-md py-space-md gap-space-md pb-24">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-label-md text-secondary uppercase tracking-wide block">
            Roteirização Inteligente
          </span>
          <h1 className="font-headline-md text-on-surface">
            Rotas de Visita &amp; Check-ins ({visits.length})
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="h-10 px-4 rounded-xl bg-primary-container text-on-primary font-label-lg shadow-sm flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[20px]">add_location_alt</span>
          <span>Agendar Visita</span>
        </button>
      </div>

      <div className="space-y-space-md">
        {visits.map((visit) => (
          <div
            key={visit.id}
            className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-md"
          >
            <div className="flex items-start gap-space-md">
              <img
                src={
                  visit.client_image ||
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuAMPiMv4dPR2pAvoNspgc-LBvWBN7mNm_p57QBhY-CVI8sH5o9dp6zIeKjexbiCK2iVXJLcW6pwGd1wPz6LHhYMMyYVkZ-I106wn8odDXHPSR9C5B6CHWqPuN_2CBL59pqsi2nSiL3pASnGu18obsJ5qrvUpGq0vMw7ewG80KUSv2H_5V810e4q6IWZU4uB707ksZTnkPdCbn7Zoz2VD_RxaCCz--E2TTnysyDZuzMos3hrEvqT1g'
                }
                alt={visit.client_name}
                className="w-14 h-14 rounded-xl object-cover shrink-0 bg-surface-container"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] ${
                      visit.status === 'Check-in Realizado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-secondary-fixed text-on-secondary-fixed'
                    }`}
                  >
                    {visit.status === 'Check-in Realizado'
                      ? `Check-in às ${visit.checked_in_at}`
                      : `${visit.scheduled_date} • ${visit.scheduled_time}`}
                  </span>
                  <span className="font-label-sm text-on-surface-variant">
                    {visit.distance_km} km
                  </span>
                </div>
                <h3
                  onClick={() => onNavigate('cliente-detalhe', visit.client_id)}
                  className="font-headline-sm text-on-surface mt-1 cursor-pointer hover:text-primary"
                >
                  {visit.client_name}
                </h3>
                <p className="font-body-sm text-on-surface-variant">{visit.purpose}</p>
                {visit.vehicle_plate && (
                  <span className="font-label-sm text-[11px] text-secondary mt-0.5 block">
                    Carro designado: {visit.vehicle_plate} ({visit.vehicle_model})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(
                  `${visit.address || ''}, ${visit.city || 'São Paulo'}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3 rounded-xl bg-surface-container text-on-surface font-label-md flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  navigation
                </span>
                <span>Waze / Maps</span>
              </a>

              {visit.status !== 'Check-in Realizado' ? (
                <button
                  type="button"
                  onClick={() => onCheckIn(visit.id)}
                  className="h-10 px-4 rounded-xl bg-primary-container text-on-primary font-label-md flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Realizar Check-in</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate('novo-pedido', visit.client_id)}
                  className="h-10 px-4 rounded-xl bg-secondary text-on-secondary font-label-md flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  <span>Tirar Pedido</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-xl space-y-4">
            <h3 className="font-headline-sm text-on-surface">Agendar Nova Visita de Rota</h3>
            <form onSubmit={handleCreateVisit} className="space-y-3">
              <div>
                <label className="font-label-sm text-on-surface block mb-1">Cliente</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.trade_name} ({c.neighborhood})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-1">
                  Carro da Frota que fará a visita
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plate} - {v.model} ({v.driver_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-1">Horário Previsto</label>
                <input
                  type="text"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                />
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-1">
                  Objetivo da Visita
                </label>
                <input
                  type="text"
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                />
              </div>

              {/* Endereço da Visita iniciado pelo CEP */}
              <div className="p-3 rounded-xl bg-surface-container-low space-y-2 border border-surface-container-high">
                <span className="font-label-sm text-secondary uppercase block">
                  Endereço / Ponto de Encontro (Opcional - Busca por CEP)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-label-sm text-on-surface block mb-0.5">1. CEP</label>
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="00000-000"
                      value={formData.zip_code}
                      onChange={(e) => handleVisitCepChange(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-label-sm text-on-surface block mb-0.5">Logradouro</label>
                    <input
                      type="text"
                      placeholder="Preenchido pelo CEP"
                      value={formData.street}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                    />
                  </div>
                  <div>
                    <label className="font-label-sm text-primary font-bold block mb-0.5">
                      2. Número
                    </label>
                    <input
                      type="text"
                      placeholder="Nº"
                      value={formData.address_number}
                      onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="font-label-sm text-primary font-bold block mb-0.5">
                      3. Complemento
                    </label>
                    <input
                      type="text"
                      placeholder="Box / Galpão / Referência"
                      value={formData.complement}
                      onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-lg bg-white text-on-surface font-body-sm"
                    />
                  </div>
                </div>
                {cepNotice && (
                  <p className="font-label-sm text-[11px] text-secondary">{cepNotice}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 h-10 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 h-10 rounded-xl bg-primary-container text-on-primary font-label-lg"
                >
                  Salvar na Rota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface ReportsViewProps {
  kpis: any;
  orders: Order[];
  vehicles: Vehicle[];
  products: Product[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  kpis,
  orders,
  vehicles,
  products,
}) => {
  const warehouseTotalValue = products.reduce(
    (sum, p) => sum + Number(p.warehouse_stock) * Number(p.unit_price),
    0
  );

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-space-md py-space-md gap-space-md pb-24">
      <div>
        <span className="font-label-md text-secondary uppercase tracking-wide block">
          Inteligência Comercial &amp; Logística
        </span>
        <h1 className="font-headline-md text-on-surface">
          Relatórios de Vendas, Estoque &amp; Frota Evoluxx
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant block">
            Faturamento Consolidado
          </span>
          <span className="font-display-lg text-primary mt-1 block">
            {formatCurrency(kpis?.monthlySales || 84650)}
          </span>
          <span className="font-body-sm text-secondary font-semibold">
            Comissão acumulada: {formatCurrency(kpis?.commissionEstimated || 4232.5)}
          </span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant block">
            Valor no Galpão Central
          </span>
          <span className="font-headline-lg text-on-surface mt-1 block">
            {formatCurrency(warehouseTotalValue)}
          </span>
          <span className="font-body-sm text-on-surface-variant">
            {products.reduce((s, p) => s + Number(p.warehouse_stock), 0)} unidades em estoque
          </span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <span className="font-label-sm text-on-surface-variant block">
            Valor Embarcado nos Carros
          </span>
          <span className="font-headline-lg text-secondary mt-1 block">
            {formatCurrency(kpis?.totalValueInCars || 0)}
          </span>
          <span className="font-body-sm text-on-surface-variant">
            {kpis?.totalItemsInCars || 0} produtos distribuídos em {vehicles.length} veículos
          </span>
        </div>
      </div>

      {/* Estoque por Carro da Frota */}
      <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm space-y-3">
        <h2 className="font-headline-sm text-on-surface">
          Resumo de Produtos por Carro da Frota
        </h2>
        <div className="space-y-3">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-surface-container-low p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-headline-sm text-on-surface">
                    {v.plate} • {v.model}
                  </span>
                  <span className="block font-body-sm text-on-surface-variant">
                    Motorista: {v.driver_name} ({v.route_region})
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-headline-sm text-primary block">
                    {formatCurrency(v.total_value)}
                  </span>
                  <span className="font-label-sm text-secondary">{v.total_items} itens</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {v.inventory.map((item) => (
                  <span
                    key={item.id}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-label-sm text-[11px] shadow-sm"
                  >
                    {item.product_name} (<strong>x{item.quantity}</strong>)
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

