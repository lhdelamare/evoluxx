import React, { useState } from 'react';
import { AppRoute, Order } from '../types';
import { formatCurrency, getDocumentLabel } from '../utils/format';

interface OrdersListViewProps {
  orders: Order[];
  onRefresh: () => void;
  onNavigate: (route: AppRoute, paramId?: number) => void;
}

export const OrdersListView: React.FC<OrdersListViewProps> = ({
  orders,
  onRefresh,
  onNavigate,
}) => {
  const [statusFilter, setStatusFilter] = useState('Todos');

  const handleStatusChange = async (orderId: number, status: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  };

  const filtered = orders.filter((o) =>
    statusFilter === 'Todos' ? true : o.status === statusFilter
  );

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-space-md py-space-md gap-space-md pb-24">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-label-md text-secondary uppercase tracking-wide block">
            Faturamento &amp; Expedição
          </span>
          <h1 className="font-headline-md text-on-surface">
            Pedidos &amp; Orçamentos B2B ({orders.length})
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('novo-pedido')}
          className="h-10 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg shadow-sm flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
          <span>Novo Pedido</span>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {['Todos', 'Faturado', 'Em Separação', 'Entregue', 'Orçamento'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 h-8 rounded-full font-label-sm whitespace-nowrap ${
              statusFilter === st
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-space-md">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between border-b border-surface-container pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-on-surface">
                  Pedido #{order.order_number}
                </span>
                <span className="font-label-sm text-[11px] bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                  {order.nfe_number}
                </span>
              </div>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                className="h-8 px-2.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[11px] focus:outline-none"
              >
                <option value="Faturado">Faturado</option>
                <option value="Em Separação">Em Separação</option>
                <option value="Entregue">Entregue</option>
                <option value="Orçamento">Orçamento</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3
                  onClick={() => onNavigate('cliente-detalhe', order.client_id)}
                  className="font-headline-sm text-on-surface hover:text-primary cursor-pointer"
                >
                  {order.client_name}
                </h3>
                <p className="font-body-sm text-on-surface-variant">
                  {getDocumentLabel(order.client_cnpj)}: {order.client_cnpj} • {order.sale_type} • Vendedor: {order.seller_name}
                </p>
                {order.vehicle_plate && (
                  <p className="font-label-sm text-secondary mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                    Veículo: {order.vehicle_plate} ({order.vehicle_model})
                  </p>
                )}
              </div>

              <div className="sm:text-right">
                <span className="font-data-currency text-primary block">
                  {formatCurrency(order.total)}
                </span>
                <span className="font-label-sm text-[11px] text-on-surface-variant">
                  {order.payment_method}
                </span>
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="bg-surface-container-low rounded-xl p-2.5 space-y-1.5">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-body-sm">
                    <span className="text-on-surface">
                      <strong>{item.quantity}x</strong> {item.product_name} ({item.packaging})
                    </span>
                    <span className="font-semibold text-on-surface">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

