import React, { useEffect, useState } from 'react';
import { AppRoute, Client, Product, Vehicle } from '../types';
import { formatCurrency, getDocumentLabel } from '../utils/format';

interface NewOrderViewProps {
  clients: Client[];
  products: Product[];
  vehicles: Vehicle[];
  initialClientId?: number;
  initialVehicleId?: number;
  sellerName: string;
  onOrderCreated: () => void;
  onNavigate: (route: AppRoute, paramId?: number) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const NewOrderView: React.FC<NewOrderViewProps> = ({
  clients,
  products,
  vehicles,
  initialClientId,
  initialVehicleId,
  sellerName,
  onOrderCreated,
  onNavigate,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedClientId, setSelectedClientId] = useState<number>(
    initialClientId || clients[0]?.id || 1
  );
  const [saleType, setSaleType] = useState<string>(
    initialVehicleId ? 'Pronta-Entrega (Estoque Carro)' : 'Venda Direta Externa'
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<number>(
    initialVehicleId || vehicles[0]?.id || 1
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    'Boleto Faturado 28 Dias (Limite Aprovado)'
  );
  const [discountPercent, setDiscountPercent] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  // Default 4 items matching template 05
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    if (initialClientId) setSelectedClientId(initialClientId);
  }, [initialClientId]);

  useEffect(() => {
    if (initialVehicleId) {
      setSelectedVehicleId(initialVehicleId);
      setSaleType('Pronta-Entrega (Estoque Carro)');
    }
  }, [initialVehicleId]);

  useEffect(() => {
    if (products.length > 0 && cart.length === 0) {
      const defaultQtys: Record<string, number> = {
        'SH-500': 10,
        'CR-200': 6,
        'PR-500': 5,
        'DG-20L': 2,
      };
      const initialCart: CartItem[] = [];
      products.slice(0, 4).forEach((p) => {
        initialCart.push({
          product: p,
          quantity: defaultQtys[p.code] || 4,
        });
      });
      setCart(initialCart);
    }
  }, [products]);

  const selectedClient =
    clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0] || null;

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const addProductToCart = (product: Product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.product.id === product.id);
      if (exists) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 2 } : i
        );
      }
      return [...prev, { product, quantity: 2 }];
    });
    setShowAddProductModal(false);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.unit_price),
    0
  );
  const extraPixDiscount = paymentMethod.includes('Pix') ? 2 : 0;
  const totalDiscountPct = discountPercent + extraPixDiscount;
  const discountValue = +(subtotal * (totalDiscountPct / 100)).toFixed(2);
  const total = +(subtotal - discountValue).toFixed(2);

  const handleFinalizeOrder = async () => {
    if (!selectedClient || cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClient.id,
          vehicle_id: selectedVehicle ? selectedVehicle.id : null,
          seller_name: sellerName,
          status: saleType.includes('Carro') ? 'Entregue' : 'Faturado',
          sale_type: saleType,
          payment_method: paymentMethod,
          discount_percent: totalDiscountPct,
          shipping_cost: 0,
          notes,
          items: cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            unit_price: Number(i.product.unit_price),
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedOrder(data);
        setStep(3);
        onOrderCreated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const creditAvailable = selectedClient
    ? Math.max(0, Number(selectedClient.credit_limit) - Number(selectedClient.credit_used))
    : 8500;

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-space-md py-space-md space-y-space-md pb-24">
      {/* Stepper de Progresso do Pedido */}
      <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-surface-container-high -z-0" />
          {/* Etapa 1 */}
          <div
            onClick={() => step !== 3 && setStep(1)}
            className="flex flex-col items-center gap-1 z-10 cursor-pointer"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md shadow-sm ${
                step >= 1
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              1
            </div>
            <span
              className={`font-label-sm text-label-sm ${
                step >= 1 ? 'text-primary-container font-bold' : 'text-on-surface-variant'
              }`}
            >
              1. Itens
            </span>
          </div>

          {/* Etapa 2 */}
          <div
            onClick={() => step !== 3 && cart.length > 0 && setStep(2)}
            className="flex flex-col items-center gap-1 z-10 cursor-pointer"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md ${
                step >= 2
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              2
            </div>
            <span
              className={`font-label-sm text-label-sm ${
                step >= 2 ? 'text-primary-container font-bold' : 'text-on-surface-variant'
              }`}
            >
              2. Pagamento
            </span>
          </div>

          {/* Etapa 3 */}
          <div className="flex flex-col items-center gap-1 z-10">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-label-md text-label-md ${
                step === 3
                  ? 'bg-secondary text-on-secondary shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              3
            </div>
            <span
              className={`font-label-sm text-label-sm ${
                step === 3 ? 'text-secondary font-bold' : 'text-on-surface-variant'
              }`}
            >
              3. Confirmação
            </span>
          </div>
        </div>
      </section>

      {step === 3 && createdOrder ? (
        <section className="bg-surface-container-lowest rounded-2xl p-space-xl shadow-md text-center space-y-space-md">
          <div className="w-16 h-16 rounded-full bg-secondary-fixed text-secondary mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">check_circle</span>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm uppercase">
              Pedido Emitido com Sucesso
            </span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mt-2">
              Pedido #{createdOrder.order_number} • {createdOrder.nfe_number}
            </h2>
            <p className="font-body-md text-on-surface-variant mt-1">
              Cliente: <strong>{selectedClient?.company_name}</strong>
            </p>
          </div>

          <div className="bg-surface-container-low p-space-md rounded-xl text-left space-y-2">
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Modalidade / Estoque:</span>
              <strong className="text-on-surface">{saleType}</strong>
            </div>
            {selectedVehicle && (
              <div className="flex justify-between text-body-sm">
                <span className="text-on-surface-variant">Veículo Vinculado:</span>
                <strong className="text-secondary">
                  {selectedVehicle.plate} • {selectedVehicle.model}
                </strong>
              </div>
            )}
            <div className="flex justify-between text-body-sm">
              <span className="text-on-surface-variant">Condição de Pagamento:</span>
              <strong className="text-on-surface">{paymentMethod}</strong>
            </div>
            <div className="flex justify-between text-body-md pt-2 border-t border-surface-container">
              <span className="font-bold text-on-surface">Valor Líquido Faturado:</span>
              <strong className="font-data-currency text-primary">
                {formatCurrency(createdOrder.total)}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm pt-2">
            <button
              type="button"
              onClick={() => onNavigate('pedidos')}
              className="h-11 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span>Ver Todos os Pedidos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setCreatedOrder(null);
              }}
              className="h-11 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span>Emitir Outro Pedido</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Card do Cliente Selecionado */}
          {selectedClient && (
            <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[24px]">storefront</span>
                </div>
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                      {selectedClient.trade_name}
                    </span>
                    <span
                      className="material-symbols-outlined text-secondary text-[16px] shrink-0"
                      title="Verificado"
                    >
                      verified
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {getDocumentLabel(selectedClient.cnpj, selectedClient.person_type)}:{' '}
                    {selectedClient.cnpj} • CEP {selectedClient.zip_code}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-label-sm text-secondary mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Limite Disponível:{' '}
                    {formatCurrency(creditAvailable)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                className="shrink-0 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors active:scale-95 flex items-center gap-1"
              >
                <span>Trocar</span>
                <span className="material-symbols-outlined text-[16px]">sync_alt</span>
              </button>
            </section>
          )}

          {/* Origem do Estoque & Carro da Frota */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  local_shipping
                </span>
                <span>Modalidade de Saída &amp; Carro da Frota</span>
              </label>
              <span className="font-label-sm text-[11px] bg-surface-container text-secondary px-2 py-0.5 rounded-full">
                Baixa Automática de Estoque
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
                className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
              >
                <option value="Venda Direta Externa">
                  Venda Direta Externa (Sai do Galpão Central)
                </option>
                <option value="Pronta-Entrega (Estoque Carro)">
                  Pronta-Entrega (Sai do Estoque do Carro)
                </option>
                <option value="Reposição Programada">Reposição Programada de Rota</option>
              </select>

              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                className="h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md focus:outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    Carro: {v.plate} - {v.model} ({v.driver_name})
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Lista de Itens do Pedido */}
          <section className="space-y-space-sm">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Itens no Carrinho
                </h2>
                <span className="bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full">
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{saleType}</span>
            </div>

            {cart.map((item) => {
              const itemSubtotal = item.quantity * Number(item.product.unit_price);
              // Check how many units of this product are in the selected car
              const inCarItem = selectedVehicle?.inventory?.find(
                (vi) => vi.product_id === item.product.id
              );

              return (
                <div
                  key={item.product.id}
                  className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm"
                >
                  <div className="flex items-start gap-space-sm">
                    <img
                      className="w-16 h-16 rounded-xl object-cover bg-surface-container shrink-0"
                      src={item.product.image_url}
                      alt={item.product.name}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
                          {item.product.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          aria-label="Remover item"
                          className="text-on-surface-variant hover:text-error p-0.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
                          Cód. {item.product.code}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {item.product.packaging}
                        </span>
                        {inCarItem && (
                          <span className="font-label-sm text-[10px] text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded">
                            No carro {selectedVehicle?.plate}: {inCarItem.quantity} un.
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                        Un:{' '}
                        <strong className="text-on-surface">
                          {formatCurrency(item.product.unit_price)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-none bg-surface-container-low p-2 rounded-xl">
                    <div className="flex items-center gap-1 bg-surface-container-lowest rounded-lg p-0.5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, -1)}
                        className="w-7 h-7 rounded-md bg-surface-container flex items-center justify-center text-on-surface active:scale-95 font-label-lg"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        readOnly
                        value={item.quantity}
                        className="w-9 text-center font-headline-sm text-headline-sm text-on-surface bg-transparent focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, 1)}
                        className="w-7 h-7 rounded-md bg-surface-container flex items-center justify-center text-on-surface active:scale-95 font-label-lg"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">
                        Subtotal
                      </span>
                      <span className="font-headline-sm text-headline-sm text-on-surface">
                        {formatCurrency(itemSubtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Botão Adicionar Mais Produtos */}
            <button
              type="button"
              onClick={() => setShowAddProductModal(true)}
              className="w-full py-3.5 px-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-secondary font-label-lg text-label-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Adicionar Mais Produtos ao Carrinho</span>
            </button>
          </section>

          {/* Condição de Pagamento Faturado */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-space-sm">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  account_balance_wallet
                </span>
                <span>Condição de Pagamento B2B</span>
              </label>
              <span className="font-label-sm text-label-sm bg-secondary-container/20 text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
                Crédito OK
              </span>
            </div>

            <div className="relative">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-12 pl-3 pr-10 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md appearance-none focus:outline-none focus:bg-surface-container transition-colors"
              >
                <option>Boleto Faturado 28 Dias (Limite Aprovado)</option>
                <option>Boleto Faturado 14/28/42 Dias</option>
                <option>Pix CNPJ à Vista (Desconto Extra 2%)</option>
                <option>Cartão Corporativo em até 3x sem juros</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[20px]">
                unfold_more
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 text-[12px] font-body-sm text-on-surface-variant px-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified_user
                </span>
                <span>Vencimento estimado da 1ª parcela: 28 dias após faturamento</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-label-sm text-on-surface-variant">Desc. %:</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                  className="w-14 h-8 text-center rounded-lg bg-surface-container-low text-on-surface font-label-md"
                />
              </div>
            </div>
          </section>

          {/* Card de Resumo de Valores B2B */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b-0">
              <span className="font-headline-sm text-headline-sm text-on-surface">
                Resumo Financeiro
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                Tabela Distribuição SP/Sul
              </span>
            </div>

            <div className="space-y-2 text-body-md font-body-md">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal dos Produtos ({cart.length} itens)</span>
                <span className="font-label-lg text-label-lg text-on-surface">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-primary items-center">
                <span className="flex items-center gap-1 font-body-md text-body-md">
                  <span>Desconto Especial Distribuidor ({totalDiscountPct}%)</span>
                  <span className="material-symbols-outlined text-[15px]">local_offer</span>
                </span>
                <span className="font-label-lg text-label-lg text-primary font-bold">
                  - {formatCurrency(discountValue)}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant items-center">
                <span className="flex items-center gap-1 font-body-md text-body-md">
                  <span>Frete / Logística Própria</span>
                  <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-secondary font-medium">
                    {selectedVehicle ? `Frota ${selectedVehicle.plate}` : 'Rota Sul'}
                  </span>
                </span>
                <span className="font-label-lg text-label-lg text-secondary font-bold">Grátis</span>
              </div>
            </div>

            <div className="pt-3 bg-surface-container-low -mx-space-md -mb-space-md p-space-md rounded-b-xl flex items-center justify-between">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block">
                  Total Líquido B2B
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Impostos ICMS-ST inclusos
                </span>
              </div>
              <div className="text-right">
                <span className="font-data-currency text-data-currency text-primary-container block tracking-tight">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </section>

          {/* Botão de Ação Primário */}
          <div className="pt-2">
            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={() => {
                if (step === 1) {
                  setStep(2);
                } else {
                  handleFinalizeOrder();
                }
              }}
              className="w-full h-12 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>
                {submitting
                  ? 'Emitindo Pedido e NF-e...'
                  : step === 1
                  ? 'Avançar para Revisão e Faturamento'
                  : 'Confirmar e Emitir Pedido B2B'}
              </span>
              <span className="bg-black/15 px-2 py-0.5 rounded-lg text-on-primary font-headline-sm text-headline-sm">
                {formatCurrency(total)}
              </span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </>
      )}

      {/* Modal Trocar Cliente */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-xl space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <h3 className="font-headline-sm text-on-surface">Selecionar Cliente da Carteira</h3>
              <button
                type="button"
                onClick={() => setShowClientModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2">
              {clients.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedClientId(c.id);
                    setShowClientModal(false);
                  }}
                  className={`p-3 rounded-xl cursor-pointer flex items-center justify-between ${
                    c.id === selectedClientId
                      ? 'bg-primary-fixed/40 border border-primary'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div>
                    <p className="font-headline-sm text-on-surface">{c.trade_name}</p>
                    <p className="font-body-sm text-on-surface-variant">
                      {getDocumentLabel(c.cnpj, c.person_type)}: {c.cnpj} • {c.neighborhood}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary">chevron_right</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Produto */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-xl space-y-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-container pb-2">
              <h3 className="font-headline-sm text-on-surface">Adicionar Produto ao Pedido</h3>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2">
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addProductToCart(p)}
                  className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer flex items-center gap-3"
                >
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-12 h-12 rounded-lg object-cover bg-white shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-headline-sm text-on-surface truncate">{p.name}</p>
                    <p className="font-body-sm text-on-surface-variant">
                      {p.code} • {p.packaging} • Estoque Galpão: {p.warehouse_stock} un.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-headline-sm text-primary block">
                      {formatCurrency(p.unit_price)}
                    </span>
                    <span className="font-label-sm text-secondary">+ Adicionar</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

