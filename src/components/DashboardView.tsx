import React, { useState } from 'react';
import { AppRoute, Order, User, Visit } from '../types';
import { formatCurrency } from '../utils/format';

interface DashboardViewProps {
  user: User;
  kpis: any;
  recentOrders: Order[];
  visits: Visit[];
  onNavigate: (route: AppRoute, paramId?: number) => void;
  onOpenNewClientModal: () => void;
  onCheckInVisit: (visitId: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  kpis,
  recentOrders,
  visits,
  onNavigate,
  onOpenNewClientModal,
  onCheckInVisit,
}) => {
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes'>('mes');

  const multiplier = period === 'hoje' ? 0.08 : period === 'semana' ? 0.32 : 1;
  const salesValue = (kpis?.monthlySales || 84650) * multiplier;
  const ordersCount = Math.max(1, Math.round((kpis?.ordersCount || 48) * multiplier));
  const commissionValue = (kpis?.commissionEstimated || 4232.5) * multiplier;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-space-lg px-margin pb-space-2xl pt-space-sm">
      {/* Top Greeting & Context Bar */}
      <section className="flex flex-col gap-space-xs mt-space-xs">
        <div className="flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                Conectado • {user.region || 'Grande SP'}
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface truncate">
              Olá, {user.name}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rotas')}
            className="p-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center shadow-sm transition-colors"
            title="Ver Agenda e Rotas"
          >
            <span className="material-symbols-outlined text-[24px]">calendar_today</span>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {new Date().toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <span className="font-label-sm text-label-sm bg-secondary-fixed text-on-secondary-fixed px-2.5 py-0.5 rounded-full font-bold">
            Frota Ativa: {kpis?.fleetInRoute || 2} de {kpis?.fleetCount || 4} carros em rota
          </span>
        </div>
      </section>

      {/* Period Selector Pills */}
      <div className="flex items-center gap-space-sm overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => setPeriod('hoje')}
          className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all active:scale-95 ${
            period === 'hoje'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => setPeriod('semana')}
          className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all active:scale-95 ${
            period === 'semana'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          Esta Semana
        </button>
        <button
          type="button"
          onClick={() => setPeriod('mes')}
          className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all active:scale-95 ${
            period === 'mes'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          Este Mês
        </button>
        <button
          type="button"
          onClick={() => onNavigate('relatorios')}
          className="px-4 py-2 rounded-full font-label-md text-label-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95 flex items-center gap-1 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[16px]">bar_chart</span> Relatórios B2B
        </button>
      </div>

      {/* Monthly Goal Progress Banner (Bento Highlight) */}
      <section className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-secondary/5 rounded-full pointer-events-none" />
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
              Atingimento de Meta Mensal
            </span>
            <div className="flex items-baseline gap-space-xs mt-0.5">
              <span className="font-display-lg text-display-lg text-on-surface">
                {kpis?.goalPercentage || 78}%
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">alcançado</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">trending_up</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-primary-container h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${kpis?.goalPercentage || 78}%` }}
            />
          </div>
          <div className="flex justify-between font-label-sm text-label-sm">
            <span className="text-primary font-bold">{formatCurrency(kpis?.monthlySales || 84650)}</span>
            <span className="text-on-surface-variant">
              Meta: {formatCurrency(kpis?.monthlyGoal || 110000)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-space-sm rounded-lg bg-surface-container-low text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-tertiary">bolt</span>
          <span className="font-body-sm text-body-sm">
            Faltam <strong>{formatCurrency(kpis?.remainingGoal || 25350)}</strong> em 7 dias úteis para fechar 100%.
          </span>
        </div>
      </section>

      {/* KPI Grid (2x2 Mobile / 4x1 Desktop) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
        {/* Card 1: Vendas Totais */}
        <div
          onClick={() => onNavigate('pedidos')}
          className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Vendas Totais</span>
            <span className="material-symbols-outlined text-[20px] text-primary">point_of_sale</span>
          </div>
          <div className="my-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              {formatCurrency(salesValue)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[10px] font-bold">
              +14,2% meta
            </span>
          </div>
        </div>

        {/* Card 2: Pedidos Realizados */}
        <div
          onClick={() => onNavigate('pedidos')}
          className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Pedidos</span>
            <span className="material-symbols-outlined text-[20px] text-tertiary">receipt_long</span>
          </div>
          <div className="my-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">{ordersCount} feitos</span>
          </div>
          <p className="font-body-sm text-[11px] text-on-surface-variant truncate">
            Méd: {formatCurrency(kpis?.avgTicket || 1763.5)}
          </p>
        </div>

        {/* Card 3: Clientes Atendidos */}
        <div
          onClick={() => onNavigate('clientes')}
          className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Clientes</span>
            <span className="material-symbols-outlined text-[20px] text-secondary">store</span>
          </div>
          <div className="my-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              {kpis?.activeClientsCount || 4} de {kpis?.totalClientsCount || 5}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-[10px]">
              Carteira Ativa
            </span>
          </div>
        </div>

        {/* Card 4: Comissões Previstas */}
        <div
          onClick={() => onNavigate('relatorios')}
          className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Comissões</span>
            <span className="material-symbols-outlined text-[20px] text-on-primary-fixed-variant">payments</span>
          </div>
          <div className="my-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              {formatCurrency(commissionValue)}
            </span>
          </div>
          <p className="font-body-sm text-[11px] text-secondary font-semibold">Prev. 5% faturamento</p>
        </div>
      </section>

      {/* Fleet & Mobile Stock Summary Banner */}
      <section
        onClick={() => onNavigate('frota')}
        className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border-l-4 border-secondary flex flex-col sm:flex-row sm:items-center justify-between gap-space-md cursor-pointer hover:bg-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[26px]">local_shipping</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Controle de Frota &amp; Estoque nos Carros
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-[10px]">
                {kpis?.fleetCount || 4} Veículos
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
              <strong>{kpis?.totalItemsInCars || 0} produtos</strong> embarcados nos carros prontos para entrega (
              <strong className="text-secondary">{formatCurrency(kpis?.totalValueInCars || 0)}</strong> em mercadoria).
            </p>
          </div>
        </div>
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md whitespace-nowrap flex items-center justify-center gap-1.5 shadow-sm"
        >
          <span>Gerenciar Carros</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </section>

      {/* Quick Action Hub */}
      <section className="flex flex-col gap-space-xs">
        <h2 className="font-label-lg text-label-lg text-on-surface">Ações Rápidas em Campo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm mt-1">
          <button
            type="button"
            onClick={() => onNavigate('novo-pedido')}
            className="h-14 px-space-md rounded-xl bg-primary-container hover:bg-primary text-on-primary shadow-md active:scale-95 transition-all flex items-center justify-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[22px]">add_circle</span>
            <span className="font-label-lg text-label-lg">Novo Pedido</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewClientModal}
            className="h-14 px-space-md rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[22px] text-secondary">person_add</span>
            <span className="font-label-lg text-label-lg">Novo Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('frota')}
            className="h-14 px-space-md rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[20px] text-tertiary">directions_car</span>
            <span className="font-label-md text-label-md">Frota &amp; Carros</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('produtos')}
            className="h-14 px-space-md rounded-xl bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[20px] text-primary">menu_book</span>
            <span className="font-label-md text-label-md">Catálogo Geral</span>
          </button>
        </div>
      </section>

      {/* Upcoming Visits & Route Section */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[22px]">alt_route</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Próximas Visitas &amp; Rotas</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('rotas')}
            className="font-label-md text-label-md text-primary hover:underline"
          >
            Ver todas ({visits.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          {visits.slice(0, 4).map((visit) => (
            <div
              key={visit.id}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex gap-space-md items-start"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-sm relative bg-surface-container">
                <img
                  className="w-full h-full object-cover"
                  src={
                    visit.client_image ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuAMPiMv4dPR2pAvoNspgc-LBvWBN7mNm_p57QBhY-CVI8sH5o9dp6zIeKjexbiCK2iVXJLcW6pwGd1wPz6LHhYMMyYVkZ-I106wn8odDXHPSR9C5B6CHWqPuN_2CBL59pqsi2nSiL3pASnGu18obsJ5qrvUpGq0vMw7ewG80KUSv2H_5V810e4q6IWZU4uB707ksZTnkPdCbn7Zoz2VD_RxaCCz--E2TTnysyDZuzMos3hrEvqT1g'
                  }
                  alt={visit.client_name}
                />
                <div
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ${
                    visit.status === 'Check-in Realizado' ? 'bg-green-600' : 'bg-secondary'
                  }`}
                />
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm text-[10px] ${
                      visit.status === 'Check-in Realizado'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-secondary-fixed text-on-secondary-fixed'
                    }`}
                  >
                    {visit.status === 'Check-in Realizado'
                      ? `Visitado às ${visit.checked_in_at}`
                      : visit.scheduled_time}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">navigation</span>{' '}
                    {visit.distance_km} km
                  </span>
                </div>

                <h3
                  onClick={() => onNavigate('cliente-detalhe', visit.client_id)}
                  className="font-headline-sm text-headline-sm text-on-surface truncate mt-1 cursor-pointer hover:text-primary"
                >
                  {visit.client_name}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 mt-0.5">
                  {visit.purpose}
                </p>
                {visit.vehicle_plate && (
                  <span className="font-label-sm text-[10px] text-secondary mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">local_shipping</span>
                    Carro: {visit.vehicle_plate} ({visit.vehicle_model})
                  </span>
                )}

                <div className="flex items-center gap-space-sm mt-space-sm">
                  <a
                    href={`tel:${visit.phone || '11999999999'}`}
                    className="flex-1 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">call</span> Ligar
                  </a>
                  {visit.status === 'Check-in Realizado' ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('novo-pedido', visit.client_id)}
                      className="flex-1 h-9 rounded-lg bg-secondary text-on-secondary font-label-sm text-label-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span> Pedido
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCheckInVisit(visit.id)}
                      className="flex-1 h-9 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Check-in
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Orders Section */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[22px]">receipt</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Últimos Pedidos Emitidos</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pedidos')}
            className="font-label-md text-label-md text-primary hover:underline"
          >
            Ver todos
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-bold text-on-surface">
                  Pedido #{order.order_number}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold ${
                    order.status === 'Faturado' || order.status === 'Entregue'
                      ? 'bg-secondary-fixed text-on-secondary-fixed'
                      : 'bg-surface-container-highest text-on-surface'
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="min-w-0 pr-2">
                  <h4
                    onClick={() => onNavigate('cliente-detalhe', order.client_id)}
                    className="font-headline-sm text-headline-sm text-on-surface truncate cursor-pointer hover:text-primary"
                  >
                    {order.client_name}
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {order.total_items || 1} volumes • {order.sale_type}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    {formatCurrency(order.total)}
                  </span>
                  <span className="block font-label-sm text-[10px] text-secondary font-semibold truncate max-w-[130px]">
                    {order.payment_method}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 mt-1 border-t border-surface-container">
                <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-[12px]">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">local_shipping</span>
                  {order.vehicle_plate
                    ? `Carro: ${order.vehicle_plate} (${order.vehicle_model?.split(' ')[0]})`
                    : 'Expedição CD Matriz'}
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('pedidos')}
                  className="font-label-sm text-label-sm text-primary font-bold hover:underline"
                >
                  Detalhes →
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Inventory Highlight Banner */}
      <section className="bg-surface-container p-space-md rounded-xl flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
          </div>
          <div>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Estoque Promocional Ativo</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Galões 5L e Vitrificador 9H com margem extra para pronta-entrega nos carros da frota.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('produtos')}
          className="px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-sm text-label-sm whitespace-nowrap shadow-sm hover:bg-surface-container-high active:scale-95 transition-all"
        >
          Ver SKUs
        </button>
      </section>
    </div>
  );
};

