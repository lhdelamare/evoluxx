import React, { useState } from 'react';
import { AppRoute, Product } from '../types';
import { formatCurrency } from '../utils/format';

interface ProductsViewProps {
  products: Product[];
  onRefresh: () => void;
  onNavigate: (route: AppRoute) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ products, onRefresh, onNavigate }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Lavagem',
    packaging: 'Galão 5L',
    dilution: 'Diluição 1:400',
    description: '',
    unit_price: '',
    cost_price: '',
    warehouse_stock: '100',
    is_promo: false,
  });

  const categories = [
    'Todos',
    'Lavagem',
    'Polimento & Proteção',
    'Pneus & Plásticos',
    'Desengraxantes',
  ];

  const handleOpenNew = () => {
    setEditingProduct(null);
    setFormData({
      code: `EVX-${Math.floor(100 + Math.random() * 899)}`,
      name: '',
      category: 'Lavagem',
      packaging: 'Galão 5L',
      dilution: 'Pronto Uso',
      description: '',
      unit_price: '79.90',
      cost_price: '35.00',
      warehouse_stock: '120',
      is_promo: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      code: prod.code,
      name: prod.name,
      category: prod.category,
      packaging: prod.packaging,
      dilution: prod.dilution,
      description: prod.description || '',
      unit_price: String(prod.unit_price),
      cost_price: String(prod.cost_price),
      warehouse_stock: String(prod.warehouse_stock),
      is_promo: Boolean(prod.is_promo),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          unit_price: Number(formData.unit_price),
          cost_price: Number(formData.cost_price),
          warehouse_stock: Number(formData.warehouse_stock),
          is_promo: formData.is_promo ? 1 : 0,
        }),
      });
      setShowModal(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja excluir este produto do catálogo?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const filtered = products.filter((p) => {
    const matchText =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    if (!matchText) return false;
    if (categoryFilter !== 'Todos' && p.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-space-md py-space-md gap-space-md pb-24">
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="font-label-md text-secondary uppercase tracking-wide block">
            Linha Automotiva Evoluxx
          </span>
          <h1 className="font-headline-md text-on-surface">
            Catálogo de Produtos &amp; Estoque ({products.length} SKUs)
          </h1>
        </div>
        <button
          type="button"
          onClick={handleOpenNew}
          className="h-10 px-4 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-lg shadow-sm flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[20px]">add_box</span>
          <span>Novo Produto</span>
        </button>
      </div>

      {/* Search & Category Chips */}
      <div className="relative w-full">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto por nome, código SKU ou linha..."
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-lowest text-on-surface shadow-sm focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3.5 h-8 rounded-full font-label-sm whitespace-nowrap transition-all ${
              categoryFilter === cat
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {filtered.map((product) => {
          const margin =
            Number(product.unit_price) > 0
              ? Math.round(
                  ((Number(product.unit_price) - Number(product.cost_price)) /
                    Number(product.unit_price)) *
                    100
                )
              : 50;

          return (
            <div
              key={product.id}
              className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-space-md">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover bg-surface-container shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-[10px]">
                        {product.code}
                      </span>
                      {Boolean(product.is_promo) && (
                        <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-[10px]">
                          Promo VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(product)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-error"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <h3 className="font-headline-sm text-on-surface mt-1 leading-snug">
                    {product.name}
                  </h3>
                  <p className="font-body-sm text-on-surface-variant mt-0.5">
                    {product.packaging} • {product.dilution} • {product.category}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-surface-container-low p-2.5 rounded-xl text-center">
                <div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant block">
                    Preço B2B
                  </span>
                  <span className="font-headline-sm text-primary">
                    {formatCurrency(product.unit_price)}
                  </span>
                  <span className="block text-[10px] text-secondary font-bold">
                    Margem {margin}%
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-[10px] text-on-surface-variant block">
                    Galpão Matriz
                  </span>
                  <span className="font-headline-sm text-on-surface">
                    {product.warehouse_stock} un.
                  </span>
                </div>
                <div
                  onClick={() => onNavigate('frota')}
                  className="cursor-pointer hover:bg-surface-container rounded-lg transition-colors"
                >
                  <span className="font-label-sm text-[10px] text-secondary block">
                    Nos Carros →
                  </span>
                  <span className="font-headline-sm text-secondary">
                    {product.fleet_stock || 0} un.
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Novo / Editar Produto */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-headline-md text-on-surface">
                {editingProduct ? 'Editar Produto Automotivo' : 'Cadastrar Novo Produto Evoluxx'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">Código SKU *</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  >
                    <option>Lavagem</option>
                    <option>Polimento &amp; Proteção</option>
                    <option>Pneus &amp; Plásticos</option>
                    <option>Desengraxantes</option>
                    <option>Acessórios &amp; Equipamentos</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="font-label-sm text-on-surface block mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Limpa Rodas e Motores Ácido Controlado 5L"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">Embalagem</label>
                  <select
                    value={formData.packaging}
                    onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  >
                    <option>Galão 5L</option>
                    <option>Frasco 500ml</option>
                    <option>Bombona 20L</option>
                    <option>Bombona 50L</option>
                    <option>Kit 50ml</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">Diluição</label>
                  <input
                    type="text"
                    value={formData.dilution}
                    onChange={(e) => setFormData({ ...formData, dilution: e.target.value })}
                    placeholder="Diluição 1:100 ou Pronto Uso"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">
                    Preço de Venda B2B (R$) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-on-surface block mb-1">
                    Estoque no Galpão Central
                  </label>
                  <input
                    type="number"
                    value={formData.warehouse_stock}
                    onChange={(e) => setFormData({ ...formData, warehouse_stock: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 h-10 rounded-xl bg-surface-container text-on-surface font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 h-10 rounded-xl bg-primary-container text-on-primary font-label-lg"
                >
                  {saving ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

