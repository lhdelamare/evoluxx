import React, { useState } from 'react';
import { AppRoute, Product, Vehicle } from '../types';
import { formatCurrency, formatNumber } from '../utils/format';

interface FleetViewProps {
  vehicles: Vehicle[];
  products: Product[];
  onRefresh: () => void;
  onNavigate: (route: AppRoute, paramId?: number, vehicleId?: number) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  vehicles,
  products,
  onRefresh,
  onNavigate,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(vehicles[0]?.id || 1);
  const [showNewVehicleModal, setShowNewVehicleModal] = useState(false);
  const [showLoadStockModal, setShowLoadStockModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;

  const [vehicleForm, setVehicleForm] = useState({
    plate: '',
    model: '',
    brand: 'Fiat',
    year: '2024',
    type: 'Furgão Pronta-Entrega',
    driver_name: '',
    driver_phone: '(11) 99999-0000',
    route_region: 'Grande SP - Zona Sul',
    status: 'Em Rota',
    current_km: '15000',
    next_maintenance_km: '25000',
    fuel_level: '100',
    max_load_kg: '650',
    notes: '',
  });

  const [loadForm, setLoadForm] = useState({
    product_id: products[0]?.id || 1,
    action: 'load' as 'load' | 'unload',
    quantity: '10',
  });

  const [logForm, setLogForm] = useState({
    log_type: 'Abastecimento',
    description: '',
    cost: '',
    km_recorded: '',
    fuel_level: '100',
    status: 'Em Rota',
  });

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleForm),
      });
      if (res.ok) {
        const created = await res.json();
        setShowNewVehicleModal(false);
        await onRefresh();
        setSelectedVehicleId(created.id);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!window.confirm('Deseja remover este veículo da frota?')) return;
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleQuickStockAdjust = async (
    vehicleId: number,
    productId: number,
    action: 'load' | 'unload',
    qty: number
  ) => {
    await fetch(`/api/vehicles/${vehicleId}/inventory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        action,
        quantity: qty,
      }),
    });
    onRefresh();
  };

  const handleLoadStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setSaving(true);
    try {
      await fetch(`/api/vehicles/${selectedVehicle.id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(loadForm.product_id),
          action: loadForm.action,
          quantity: Number(loadForm.quantity) || 1,
        }),
      });
      setShowLoadStockModal(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;
    setSaving(true);
    try {
      await fetch(`/api/vehicles/${selectedVehicle.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_type: logForm.log_type,
          description: logForm.description,
          cost: Number(logForm.cost) || 0,
          km_recorded: Number(logForm.km_recorded) || selectedVehicle.current_km,
          fuel_level: Number(logForm.fuel_level),
          status: logForm.status,
        }),
      });
      setShowLogModal(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (vehicle: Vehicle, newStatus: string) => {
    await fetch(`/api/vehicles/${vehicle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vehicle, status: newStatus }),
    });
    onRefresh();
  };

  const totalFleetItems = vehicles.reduce((acc, v) => acc + (v.total_items || 0), 0);
  const totalFleetValue = vehicles.reduce((acc, v) => acc + (v.total_value || 0), 0);
  const inRouteCount = vehicles.filter((v) => v.status === 'Em Rota').length;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-space-md py-space-md gap-space-md pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-label-md text-label-md text-secondary uppercase tracking-wide">
              Logística &amp; Pronta-Entrega
            </span>
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface">
            Controle de Frota &amp; Estoque nos Carros
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowNewVehicleModal(true)}
          className="h-10 px-space-md rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">directions_car</span>
          <span>Cadastrar Carro</span>
        </button>
      </div>

      {/* Fleet Summary KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm">
            <span>Veículos na Frota</span>
            <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
          </div>
          <p className="font-headline-md text-headline-md text-on-surface mt-1">
            {vehicles.length} Carros
          </p>
          <span className="font-label-sm text-[11px] text-secondary font-bold">
            {inRouteCount} em rota agora
          </span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm">
            <span>Produtos nos Carros</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">inventory_2</span>
          </div>
          <p className="font-headline-md text-headline-md text-on-surface mt-1">
            {totalFleetItems} un.
          </p>
          <span className="font-label-sm text-[11px] text-on-surface-variant">
            Pronta-entrega móvel
          </span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm">
            <span>Valor Embarcado</span>
            <span className="material-symbols-outlined text-[18px] text-tertiary">payments</span>
          </div>
          <p className="font-headline-sm text-headline-sm text-on-surface mt-1">
            {formatCurrency(totalFleetValue)}
          </p>
          <span className="font-label-sm text-[11px] text-secondary">Mercadoria ativa</span>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-label-sm">
            <span>Saúde da Frota</span>
            <span className="material-symbols-outlined text-[18px] text-green-600">verified</span>
          </div>
          <p className="font-headline-sm text-headline-sm text-on-surface mt-1">100% Operacional</p>
          <span className="font-label-sm text-[11px] text-on-surface-variant">Revisões em dia</span>
        </div>
      </section>

      {/* Vehicle Selector Horizontal Cards */}
      <div className="flex flex-col gap-space-xs">
        <span className="font-label-md text-label-md text-on-surface-variant px-1">
          Selecione um carro da frota para ver e controlar quais produtos estão nele:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          {vehicles.map((v) => {
            const isSelected = selectedVehicle?.id === v.id;
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={`p-space-md rounded-xl cursor-pointer transition-all flex items-start gap-space-md relative overflow-hidden ${
                  isSelected
                    ? 'bg-surface-container-lowest ring-2 ring-primary shadow-md'
                    : 'bg-surface-container-lowest/80 hover:bg-surface-container-lowest shadow-sm'
                }`}
              >
                <img
                  src={v.image_url}
                  alt={v.model}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-surface-container"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-on-surface text-surface font-label-sm text-[11px] tracking-wider">
                      {v.plate}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                        v.status === 'Em Rota'
                          ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : v.status === 'Manutenção'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-surface-container-high text-on-surface'
                      }`}
                    >
                      {v.status}
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface truncate mt-1">
                    {v.model}
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Motorista: <strong>{v.driver_name}</strong> • {v.route_region}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-surface-container font-label-sm text-[11px]">
                    <span className="text-secondary font-bold">
                      {v.total_items} produtos no carro
                    </span>
                    <span className="text-on-surface font-bold">
                      {formatCurrency(v.total_value)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Vehicle Full Control Panel */}
      {selectedVehicle && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-lg border border-surface-container-high">
          {/* Vehicle Header & Telemetry */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-md border-b border-surface-container">
            <div className="flex items-start gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">local_shipping</span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-on-surface text-white font-label-md tracking-widest">
                    {selectedVehicle.plate}
                  </span>
                  <span className="font-label-sm text-label-sm bg-surface-container px-2 py-0.5 rounded text-secondary">
                    {selectedVehicle.type} ({selectedVehicle.year})
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface mt-1">
                  {selectedVehicle.model}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Responsável: <strong>{selectedVehicle.driver_name}</strong> ({selectedVehicle.driver_phone}) • Rota:{' '}
                  {selectedVehicle.route_region}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedVehicle.status}
                onChange={(e) => handleStatusChange(selectedVehicle, e.target.value)}
                className="h-9 px-3 rounded-xl bg-surface-container text-on-surface font-label-sm focus:outline-none"
              >
                <option value="Em Rota">Status: Em Rota</option>
                <option value="Na Base">Status: Na Base (Matriz)</option>
                <option value="Manutenção">Status: Em Manutenção</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setLogForm({
                    log_type: 'Abastecimento',
                    description: '',
                    cost: '',
                    km_recorded: String(selectedVehicle.current_km),
                    fuel_level: String(selectedVehicle.fuel_level),
                    status: selectedVehicle.status,
                  });
                  setShowLogModal(true);
                }}
                className="h-9 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  local_gas_station
                </span>
                <span>KM / Combustível</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteVehicle(selectedVehicle.id)}
                className="h-9 w-9 rounded-xl bg-surface-container hover:bg-error-container text-outline hover:text-error flex items-center justify-center"
                title="Remover veículo"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>

          {/* Telemetry Bar (KM, Combustível, Carga) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
            <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-label-sm text-on-surface-variant block">Hodômetro / Revisão</span>
                <span className="font-headline-sm text-on-surface">
                  {formatNumber(selectedVehicle.current_km)} km
                </span>
                <span className="block font-body-sm text-[11px] text-on-surface-variant">
                  Próx. revisão: {formatNumber(selectedVehicle.next_maintenance_km)} km
                </span>
              </div>
              <span className="material-symbols-outlined text-secondary text-[24px]">speed</span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-on-surface-variant">Combustível no Tanque</span>
                <span className="font-label-md text-secondary font-bold">
                  {selectedVehicle.fuel_level}%
                </span>
              </div>
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden my-1.5">
                <div
                  className={`h-full rounded-full ${
                    selectedVehicle.fuel_level < 25 ? 'bg-error' : 'bg-secondary'
                  }`}
                  style={{ width: `${selectedVehicle.fuel_level}%` }}
                />
              </div>
              <span className="font-body-sm text-[11px] text-on-surface-variant">
                Última carga: {selectedVehicle.last_load_date || 'Hoje'}
              </span>
            </div>

            <div className="bg-surface-container-low p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-label-sm text-on-surface-variant block">
                  Mercadoria neste Carro
                </span>
                <span className="font-headline-sm text-primary">
                  {formatCurrency(selectedVehicle.total_value)}
                </span>
                <span className="block font-body-sm text-[11px] text-on-surface-variant">
                  {selectedVehicle.total_items} itens prontos para venda
                </span>
              </div>
              <span className="material-symbols-outlined text-primary text-[24px]">inventory</span>
            </div>
          </div>

          {/* Section: QUAIS PRODUTOS ESTÃO NESTE CARRO */}
          <div className="space-y-space-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    inventory_2
                  </span>
                  <span>Produtos Embarcados no Carro ({selectedVehicle.plate})</span>
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Controle em tempo real de quais produtos estão dentro deste veículo para pronta-entrega.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoadForm({
                      product_id: products[0]?.id || 1,
                      action: 'load',
                      quantity: '10',
                    });
                    setShowLoadStockModal(true);
                  }}
                  className="h-10 px-3.5 rounded-xl bg-secondary text-on-secondary font-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_box</span>
                  <span>Carregar Produto no Carro</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('novo-pedido', undefined, selectedVehicle.id)}
                  className="h-10 px-3.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
                  <span>Vender Deste Carro</span>
                </button>
              </div>
            </div>

            {selectedVehicle.inventory.length === 0 ? (
              <div className="bg-surface-container-low rounded-xl p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-outline text-[32px]">
                  inventory_2
                </span>
                <p className="font-headline-sm text-on-surface">
                  Este veículo está sem produtos carregados no momento.
                </p>
                <p className="font-body-sm text-on-surface-variant">
                  Clique em &ldquo;Carregar Produto no Carro&rdquo; para transferir itens do Galpão Central para este veículo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                {selectedVehicle.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2.5 border border-surface-container-high"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-14 h-14 rounded-lg object-cover bg-white shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-label-sm text-[10px] bg-surface-container-highest text-on-surface px-2 py-0.5 rounded">
                            {item.code}
                          </span>
                          <span className="font-label-sm text-[11px] text-on-surface-variant">
                            {item.packaging}
                          </span>
                        </div>
                        <h4 className="font-headline-sm text-headline-sm text-on-surface truncate mt-0.5">
                          {item.product_name}
                        </h4>
                        <div className="flex items-center justify-between text-body-sm mt-1">
                          <span className="text-on-surface-variant">
                            Un: <strong>{formatCurrency(item.unit_price)}</strong>
                          </span>
                          <span className="text-secondary font-bold">
                            Total: {formatCurrency(item.quantity * item.unit_price)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-surface-container-lowest p-2 rounded-lg">
                      <span className="font-label-sm text-on-surface-variant">
                        Qtd. no Carro {selectedVehicle.plate}:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickStockAdjust(selectedVehicle.id, item.product_id, 'unload', 1)
                          }
                          title="Devolver 1 un. ao galpão"
                          className="w-7 h-7 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-bold text-on-surface"
                        >
                          −
                        </button>
                        <span className="w-10 text-center font-headline-sm text-primary font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickStockAdjust(selectedVehicle.id, item.product_id, 'load', 1)
                          }
                          title="Carregar +1 un. do galpão"
                          className="w-7 h-7 rounded-md bg-surface-container hover:bg-surface-container-high flex items-center justify-center font-bold text-on-surface"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Recent Logs (Histórico de Carga, Rota e Manutenção) */}
          <div className="space-y-2 pt-2 border-t border-surface-container">
            <h4 className="font-label-lg text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">history</span>
              <span>Diário de Bordo &amp; Movimentações do Veículo</span>
            </h4>
            <div className="space-y-1.5">
              {selectedVehicle.logs?.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-body-sm bg-surface-container-low px-3 py-2 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-sm text-[10px] shrink-0">
                      {log.log_type}
                    </span>
                    <span className="text-on-surface truncate">{log.description}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-on-surface-variant text-[11px]">
                    {Number(log.cost) > 0 && (
                      <strong className="text-primary">{formatCurrency(log.cost)}</strong>
                    )}
                    <span>{formatNumber(log.km_recorded)} km</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Carregar / Descarregar Produtos no Carro */}
      {showLoadStockModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-xl space-y-space-md">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">inventory_2</span>
                <h3 className="font-headline-sm text-on-surface">
                  Movimentar Estoque • {selectedVehicle.plate}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLoadStockModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleLoadStockSubmit} className="space-y-3">
              <div>
                <label className="font-label-sm text-on-surface block mb-1">Tipo de Operação</label>
                <select
                  value={loadForm.action}
                  onChange={(e) =>
                    setLoadForm({ ...loadForm, action: e.target.value as 'load' | 'unload' })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md"
                >
                  <option value="load">
                    Carregar no Carro (Sai do Galpão Central → Entra no Carro)
                  </option>
                  <option value="unload">
                    Devolver ao Galpão (Sai do Carro → Volta ao Galpão Central)
                  </option>
                </select>
              </div>

              <div>
                <label className="font-label-sm text-on-surface block mb-1">
                  Selecione o Produto Automotivo
                </label>
                <select
                  value={loadForm.product_id}
                  onChange={(e) => setLoadForm({ ...loadForm, product_id: Number(e.target.value) })}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} ({p.packaging}) [Galpão: {p.warehouse_stock} un.]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-label-sm text-on-surface block mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={loadForm.quantity}
                  onChange={(e) => setLoadForm({ ...loadForm, quantity: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLoadStockModal(false)}
                  className="px-4 h-10 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 h-10 rounded-xl bg-primary-container text-on-primary font-label-lg"
                >
                  {saving ? 'Confirmando...' : 'Confirmar Movimentação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Novo Carro na Frota */}
      {showNewVehicleModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-xl space-y-space-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">directions_car</span>
                <h3 className="font-headline-md text-on-surface">Cadastrar Novo Carro na Frota</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewVehicleModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">Placa Mercosul *</label>
                  <input
                    required
                    type="text"
                    placeholder="EVX-1A23"
                    value={vehicleForm.plate}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface uppercase"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">Marca / Ano</label>
                  <input
                    required
                    type="text"
                    placeholder="Fiat / 2024"
                    value={vehicleForm.brand}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-label-sm text-on-surface block mb-1">
                    Modelo do Veículo *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Fiat Strada Endurance Cabine Plus 1.3"
                    value={vehicleForm.model}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">
                    Tipo de Operação
                  </label>
                  <select
                    value={vehicleForm.type}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  >
                    <option>Furgão Pronta-Entrega</option>
                    <option>Utilitário Leve</option>
                    <option>VUC Distribuição Pesada</option>
                    <option>Carro Representante VIP</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">
                    Motorista / Vendedor *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Nome do motorista/vendedor"
                    value={vehicleForm.driver_name}
                    onChange={(e) =>
                      setVehicleForm({ ...vehicleForm, driver_name: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">
                    Região / Rota de Atuação
                  </label>
                  <input
                    type="text"
                    placeholder="Grande SP - Zona Sul"
                    value={vehicleForm.route_region}
                    onChange={(e) =>
                      setVehicleForm({ ...vehicleForm, route_region: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">
                    Hodômetro Atual (KM)
                  </label>
                  <input
                    type="number"
                    value={vehicleForm.current_km}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, current_km: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowNewVehicleModal(false)}
                  className="px-4 h-10 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 h-10 rounded-xl bg-primary-container text-on-primary font-label-lg"
                >
                  {saving ? 'Salvando...' : 'Salvar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Abastecimento / Manutenção / KM */}
      {showLogModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-xl space-y-space-md">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-headline-sm text-on-surface">
                Registrar KM, Abastecimento ou Manutenção ({selectedVehicle.plate})
              </h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-3">
              <div>
                <label className="font-label-sm text-on-surface block mb-1">Tipo de Registro</label>
                <select
                  value={logForm.log_type}
                  onChange={(e) => setLogForm({ ...logForm, log_type: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                >
                  <option>Abastecimento</option>
                  <option>Manutenção Preventiva</option>
                  <option>Saída em Rota</option>
                  <option>Retorno para Base</option>
                </select>
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-1">Descrição *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Abastecimento 45L Gasolina Posto Bandeirantes"
                  value={logForm.description}
                  onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={logForm.cost}
                    onChange={(e) => setLogForm({ ...logForm, cost: e.target.value })}
                    placeholder="0,00"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">KM Atual</label>
                  <input
                    type="number"
                    value={logForm.km_recorded}
                    onChange={(e) => setLogForm({ ...logForm, km_recorded: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
              </div>
              <div>
                <label className="font-label-sm text-on-surface block mb-1">
                  Nível do Tanque ({logForm.fuel_level}%)
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={logForm.fuel_level}
                  onChange={(e) => setLogForm({ ...logForm, fuel_level: e.target.value })}
                  className="w-full accent-secondary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 h-10 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 h-10 rounded-xl bg-primary-container text-on-primary font-label-lg"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

