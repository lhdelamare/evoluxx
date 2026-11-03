export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  region: string;
  avatar: string;
  monthly_goal: number;
  commission_rate: number;
}

export interface Client {
  id: number;
  person_type?: 'PJ' | 'PF';
  company_name: string;
  trade_name: string;
  cnpj: string;
  state_registration: string;
  segment: string;
  tier: string;
  status: string;
  zip_code: string;
  street?: string;
  address_number?: string;
  complement?: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  region: string;
  contact_name: string;
  contact_role: string;
  phone: string;
  whatsapp: string;
  email: string;
  credit_limit: number;
  credit_used: number;
  payment_terms: string;
  avg_monthly_ticket: number;
  last_purchase_date: string;
  last_purchase_value: number;
  image_url: string;
  notes: string;
  orders?: Order[];
  topProducts?: (Product & { total_bought: number })[];
  visits?: Visit[];
}

export interface Product {
  id: number;
  code: string;
  name: string;
  category: string;
  packaging: string;
  dilution: string;
  description: string;
  unit_price: number;
  cost_price: number;
  warehouse_stock: number;
  fleet_stock?: number;
  min_stock: number;
  image_url: string;
  is_promo: number;
}

export interface VehicleInventoryItem {
  id: number;
  vehicle_id: number;
  product_id: number;
  quantity: number;
  min_quantity: number;
  code: string;
  product_name: string;
  category: string;
  packaging: string;
  unit_price: number;
  image_url: string;
  warehouse_stock: number;
  updated_at?: string;
}

export interface VehicleLog {
  id: number;
  vehicle_id: number;
  log_type: string;
  description: string;
  cost: number;
  km_recorded: number;
  created_at: string;
}

export interface Vehicle {
  id: number;
  plate: string;
  model: string;
  brand: string;
  year: number;
  type: string;
  driver_name: string;
  driver_phone: string;
  route_region: string;
  status: 'Em Rota' | 'Na Base' | 'Manutenção' | string;
  current_km: number;
  next_maintenance_km: number;
  fuel_level: number;
  max_load_kg: number;
  last_load_date: string;
  notes: string;
  image_url: string;
  inventory: VehicleInventoryItem[];
  logs: VehicleLog[];
  total_items: number;
  total_value: number;
}

export interface OrderItem {
  id?: number;
  product_id: number;
  product_code?: string;
  product_name?: string;
  packaging?: string;
  image_url?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  client_id: number;
  client_name?: string;
  company_name?: string;
  client_cnpj?: string;
  neighborhood?: string;
  vehicle_id?: number | null;
  vehicle_plate?: string;
  vehicle_model?: string;
  driver_name?: string;
  seller_name: string;
  status: string;
  sale_type: string;
  payment_method: string;
  subtotal: number;
  discount_percent: number;
  discount_value: number;
  shipping_cost: number;
  total: number;
  total_items?: number;
  nfe_number: string;
  notes: string;
  created_at: string;
  items?: OrderItem[];
}

export interface Visit {
  id: number;
  client_id: number;
  client_name?: string;
  neighborhood?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  client_image?: string;
  vehicle_id?: number | null;
  vehicle_plate?: string;
  vehicle_model?: string;
  scheduled_date: string;
  scheduled_time: string;
  distance_km: number;
  status: string;
  purpose: string;
  notes: string;
  checked_in_at: string;
}

export type AppRoute =
  | 'dashboard'
  | 'clientes'
  | 'cliente-detalhe'
  | 'novo-pedido'
  | 'pedidos'
  | 'produtos'
  | 'frota'
  | 'rotas'
  | 'relatorios';

