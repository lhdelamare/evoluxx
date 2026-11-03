import React, { useEffect, useState } from 'react';
import { AppRoute, Client, Order, Product, User, Vehicle, Visit } from './types';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { ClientDetailView } from './components/ClientDetailView';
import { NewOrderView } from './components/NewOrderView';
import { FleetView } from './components/FleetView';
import { ProductsView } from './components/ProductsView';
import { OrdersListView } from './components/OrdersListView';
import { ReportsView, RoutesView } from './components/RoutesAndReportsView';

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('evoluxx_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentRoute, setCurrentRoute] = useState<AppRoute>('dashboard');
  const [selectedClientId, setSelectedClientId] = useState<number>(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openNewClientModal, setOpenNewClientModal] = useState(false);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const loadAllData = async () => {
    try {
      const [dashRes, cliRes, prodRes, vehRes, ordRes, visRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/clients'),
        fetch('/api/products'),
        fetch('/api/vehicles'),
        fetch('/api/orders'),
        fetch('/api/visits'),
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (cliRes.ok) setClients(await cliRes.json());
      if (prodRes.ok) setProducts(await prodRes.json());
      if (vehRes.ok) setVehicles(await vehRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
      if (visRes.ok) setVisits(await visRes.json());
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const handleLoginSuccess = (loggedUser: User) => {
    setUser(loggedUser);
    localStorage.setItem('evoluxx_user', JSON.stringify(loggedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('evoluxx_user');
    setDrawerOpen(false);
  };

  const handleNavigate = (route: AppRoute, paramId?: number, vehicleId?: number) => {
    if (paramId !== undefined) setSelectedClientId(paramId);
    setSelectedVehicleId(vehicleId);
    setCurrentRoute(route);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckInVisit = async (visitId: number) => {
    await fetch(`/api/visits/${visitId}/checkin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    loadAllData();
  };

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const routeSubtitleMap: Record<AppRoute, string> = {
    dashboard: 'Dashboard',
    clientes: 'Clientes',
    'cliente-detalhe': 'Ficha Cliente',
    'novo-pedido': 'Novo Pedido',
    pedidos: 'Pedidos B2B',
    produtos: 'Catálogo',
    frota: 'Frota & Carros',
    rotas: 'Rotas & Visitas',
    relatorios: 'Relatórios',
  };

  const navItems: { route: AppRoute; icon: string; label: string }[] = [
    { route: 'dashboard', icon: 'dashboard', label: 'Dashboard / Início' },
    { route: 'clientes', icon: 'store', label: 'Clientes (Carteira B2B)' },
    { route: 'frota', icon: 'local_shipping', label: 'Controle de Frota & Carros' },
    { route: 'produtos', icon: 'inventory_2', label: 'Catálogo de Estética' },
    { route: 'novo-pedido', icon: 'add_shopping_cart', label: 'Novo Pedido B2B' },
    { route: 'pedidos', icon: 'receipt_long', label: 'Pedidos & Orçamentos' },
    { route: 'rotas', icon: 'route', label: 'Rotas de Visita' },
    { route: 'relatorios', icon: 'bar_chart', label: 'Relatórios de Vendas' },
  ];

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface flex flex-col min-h-screen antialiased">
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-over App Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-surface-container-lowest shadow-[0_20px_25px_-5px_rgba(15,23,42,0.1)] flex flex-col transition-transform duration-300 ease-out pt-safe pb-safe ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-space-lg bg-surface-container-low flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm uppercase tracking-wider">
              Evoluxx B2B Distribuição
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-11 h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex items-center gap-space-md mt-space-xs">
            <img
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
              src={user.avatar}
            />
            <div className="min-w-0">
              <h2 className="font-headline-sm text-headline-sm text-on-surface leading-tight truncate">
                {user.name}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">
                @{user.username} • {user.role}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-space-md py-space-sm flex flex-col gap-1">
          {navItems.map((item) => {
            const active =
              currentRoute === item.route ||
              (item.route === 'clientes' && currentRoute === 'cliente-detalhe');
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNavigate(item.route)}
                className={`flex items-center gap-space-md px-space-md h-12 rounded-xl transition-colors text-left ${
                  active
                    ? 'bg-primary-container text-on-primary font-label-lg'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-label-lg'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                <span className="font-label-lg text-label-lg">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-space-md bg-surface-container-low/60">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full h-11 flex items-center justify-center gap-space-sm rounded-xl text-error hover:bg-error-container/40 transition-colors font-label-lg text-label-lg"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Sair da Conta</span>
          </button>
        </div>
      </aside>

      {/* Fixed Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 max-w-5xl mx-auto px-space-md flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            {currentRoute === 'novo-pedido' || currentRoute === 'cliente-detalhe' ? (
              <button
                type="button"
                aria-label="Voltar"
                onClick={() =>
                  handleNavigate(currentRoute === 'cliente-detalhe' ? 'clientes' : 'dashboard')
                }
                className="w-11 h-11 flex items-center justify-center rounded-xl text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">arrow_back</span>
              </button>
            ) : (
              <button
                type="button"
                aria-label="Abrir menu"
                onClick={() => setDrawerOpen(true)}
                className="w-11 h-11 flex items-center justify-center rounded-xl text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>
            )}

            <div
              onClick={() => handleNavigate('dashboard')}
              className="flex items-center gap-space-xs cursor-pointer"
            >
              <img
                alt="Evoluxx Logo"
                className="h-9 w-auto object-contain"
                src="/LogoTransparente.png"
              />
              <div className="flex flex-col ml-1">
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
                  AutoGest
                </span>
                <span className="font-label-sm text-[10px] uppercase text-primary font-bold -mt-1">
                  {routeSubtitleMap[currentRoute]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleNavigate('frota')}
              title="Controle de Frota e Produtos nos Carros"
              className="hidden sm:flex items-center gap-1 px-3 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-secondary font-label-sm transition-colors mr-1"
            >
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              <span>Frota ({vehicles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('clientes')}
              aria-label="Buscar cliente"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">search</span>
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('rotas')}
              aria-label="Notificações e Visitas"
              className="relative w-11 h-11 flex items-center justify-center rounded-xl text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-primary-container text-on-primary font-label-sm text-[10px] rounded-full flex items-center justify-center font-bold">
                {visits.filter((v) => v.status !== 'Check-in Realizado').length || 3}
              </span>
            </button>

            <div
              onClick={() => setDrawerOpen(true)}
              className="w-11 h-11 flex items-center justify-center pl-1 cursor-pointer"
            >
              <img
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover shadow-[0_1px_2px_rgba(15,23,42,0.15)]"
                src={user.avatar}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col relative w-full pt-16 pb-20 bg-surface min-h-screen">
        {currentRoute === 'dashboard' && (
          <DashboardView
            user={user}
            kpis={dashboardData?.kpis}
            recentOrders={dashboardData?.recentOrders || orders.slice(0, 4)}
            visits={dashboardData?.visits || visits}
            onNavigate={handleNavigate}
            onOpenNewClientModal={() => {
              setOpenNewClientModal(true);
              setCurrentRoute('clientes');
            }}
            onCheckInVisit={handleCheckInVisit}
          />
        )}

        {currentRoute === 'clientes' && (
          <ClientsView
            clients={clients}
            onNavigate={handleNavigate}
            onRefresh={loadAllData}
            openModalInitially={openNewClientModal}
            onModalClosed={() => setOpenNewClientModal(false)}
          />
        )}

        {currentRoute === 'cliente-detalhe' && (
          <ClientDetailView clientId={selectedClientId} onNavigate={handleNavigate} />
        )}

        {currentRoute === 'frota' && (
          <FleetView
            vehicles={vehicles}
            products={products}
            onRefresh={loadAllData}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'novo-pedido' && (
          <NewOrderView
            clients={clients}
            products={products}
            vehicles={vehicles}
            initialClientId={selectedClientId}
            initialVehicleId={selectedVehicleId}
            sellerName={user.name}
            onOrderCreated={loadAllData}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'produtos' && (
          <ProductsView products={products} onRefresh={loadAllData} onNavigate={handleNavigate} />
        )}

        {currentRoute === 'pedidos' && (
          <OrdersListView orders={orders} onRefresh={loadAllData} onNavigate={handleNavigate} />
        )}

        {currentRoute === 'rotas' && (
          <RoutesView
            visits={visits}
            clients={clients}
            vehicles={vehicles}
            onRefresh={loadAllData}
            onCheckIn={handleCheckInVisit}
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === 'relatorios' && (
          <ReportsView
            kpis={dashboardData?.kpis}
            orders={orders}
            vehicles={vehicles}
            products={products}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(15,23,42,0.06)]">
        <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-space-xs">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              currentRoute === 'dashboard'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">dashboard</span>
            <span className="font-label-sm text-label-sm mt-0.5">Início</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('clientes')}
            className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              currentRoute === 'clientes' || currentRoute === 'cliente-detalhe'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">store</span>
            <span className="font-label-sm text-label-sm mt-0.5">Clientes</span>
          </button>

          <div className="flex items-center justify-center -mt-5">
            <button
              type="button"
              onClick={() => handleNavigate('novo-pedido')}
              aria-label="Novo Pedido"
              className="w-14 h-14 rounded-full bg-primary-container hover:bg-primary text-on-primary shadow-[0_8px_16px_rgba(220,38,38,0.35)] flex items-center justify-center active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[28px]">add</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('frota')}
            className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              currentRoute === 'frota'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">local_shipping</span>
            <span className="font-label-sm text-label-sm mt-0.5">Frota</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate('produtos')}
            className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
              currentRoute === 'produtos'
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            <span className="font-label-sm text-label-sm mt-0.5">Produtos</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
            <span className="font-label-sm text-label-sm mt-0.5">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

