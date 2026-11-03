import React, { useState } from 'react';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('administrador');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Credenciais não confirmadas.');
      } else {
        onLoginSuccess(data.user);
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setBiometricLoading(true);
    setError(null);
    setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ biometric: true }),
        });
        const data = await res.json();
        if (res.ok) {
          onLoginSuccess(data.user);
        }
      } finally {
        setBiometricLoading(false);
      }
    }, 650);
  };

  return (
    <main className="flex flex-col relative w-full bg-surface min-h-screen items-center justify-center">
      <div className="flex flex-col w-full max-w-md px-space-lg py-space-lg pb-space-2xl">
        {/* Top Hero Image Banner */}
        <div className="relative w-full rounded-xl overflow-hidden mb-space-lg shadow-sm">
          <div
            className="bg-cover bg-center w-full h-40"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA3W99z_pkA_65FI4UuMIpSYMZYbb35zKKgRJm6_gDhE3w7PLlNIlXHoZ0giLvIxxeTRHY0TboEWDMxTsYpnTfu2ak2pxUqQ5OpbTkjA9BtX_KZrGR5qAE8Vp17YMdpLuLbx5iwzlbIqr_wKE0BuXAqTUKBGw1-kV80hpvQCPGBd-T8H1yTA70K-hOUrwUoDFNLEp4LYhBzxXtDIR0rPByHA3dHE9XgeaENdwECThh8tgrJYPQEqA')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent flex flex-col justify-end p-space-md">
            <div className="flex items-center gap-space-xs bg-surface-container-lowest/90 backdrop-blur-md px-space-sm py-1 rounded-full w-fit shadow-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                Distribuidores Autorizados • Evoluxx
              </span>
            </div>
          </div>
        </div>

        {/* Brand Identity & Logo */}
        <div className="flex flex-col items-center text-center mb-space-xl">
          <img
            src="/LogoTransparente.png"
            alt="Evoluxx Produtos Automotivos"
            className="h-24 w-auto object-contain drop-shadow-md mb-space-xs"
          />
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-headline-lg text-headline-lg text-primary">AutoGest</span>
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
              B2B &amp; Frota
            </span>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant mt-1">
            Portal do Distribuidor, Vendas Externas &amp; Controle de Carros
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mt-space-xs">
            Acesse sua conta para gerenciar pedidos, clientes, carros da frota e estoque embarcado em tempo real.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm mb-space-lg">
          <form className="flex flex-col gap-space-md" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface" htmlFor="corporateEmail">
                  Usuário ou E-mail Corporativo
                </label>
                <span className="font-label-sm text-[10px] bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full">
                  Admin: administrador
                </span>
              </div>
              <div className="relative flex items-center bg-surface-container-low rounded-xl px-space-md h-11 focus-within:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-outline select-none mr-space-sm text-[20px]">
                  person
                </span>
                <input
                  id="corporateEmail"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="administrador ou seu.email@evoluxx.com.br"
                  className="w-full bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-md text-label-md text-on-surface" htmlFor="corporatePassword">
                Senha de acesso
              </label>
              <div className="relative flex items-center bg-surface-container-low rounded-xl px-space-md h-11 focus-within:bg-surface-container transition-colors">
                <span className="material-symbols-outlined text-outline select-none mr-space-sm text-[20px]">
                  lock
                </span>
                <input
                  id="corporatePassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Alternar exibição da senha"
                  className="absolute right-3 flex items-center justify-center text-outline hover:text-on-surface active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-space-sm cursor-pointer select-none">
                <input defaultChecked type="checkbox" className="w-4 h-4 accent-primary rounded cursor-pointer" />
                <span className="font-label-md text-label-md text-on-surface-variant">Lembrar acesso</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('administrador');
                  setPassword('admin123');
                }}
                className="font-label-md text-label-md text-secondary hover:underline"
              >
                Preencher Administrador
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-space-sm bg-error-container text-on-error-container p-space-sm rounded-xl">
                <span className="material-symbols-outlined text-[20px] text-error flex-shrink-0 mt-0.5">error</span>
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md font-semibold">Credenciais não confirmadas</span>
                  <span className="font-body-sm text-body-sm">{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || biometricLoading}
              className="w-full h-12 bg-primary-container hover:bg-primary text-on-primary rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-space-sm shadow-md active:scale-98 transition-all"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleBiometric}
              disabled={loading || biometricLoading}
              className="w-full h-11 bg-surface-container-low text-on-surface rounded-xl font-label-md text-label-md flex items-center justify-center gap-space-sm hover:bg-surface-container active:scale-98 transition-all"
            >
              <span
                className={`material-symbols-outlined text-secondary text-[22px] ${
                  biometricLoading ? 'animate-pulse' : ''
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                fingerprint
              </span>
              <span>
                {biometricLoading ? 'Validando Biometria...' : 'Acesso Rápido com Biometria (Administrador)'}
              </span>
            </button>
          </form>
        </div>

        {/* Sync Banner */}
        <div className="bg-surface-container-low rounded-xl p-space-md flex items-center gap-space-sm mb-space-xl">
          <div className="w-8 h-8 rounded-full bg-secondary-container/20 flex items-center justify-center flex-shrink-0 text-secondary">
            <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-md text-label-md text-on-surface">Banco MySQL Sincronizado</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
              Catálogo, carteira de clientes e estoque dos carros ativos em tempo real.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center justify-center text-center gap-1 mt-auto">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Evoluxx AutoGest v3.4.2 B2B</span>
            <span>•</span>
            <span>Frota &amp; Campo</span>
          </div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-[14px]">support_agent</span>
            <span>
              Suporte Operacional: <strong className="font-label-md text-on-surface">0800 722 4000</strong>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
};

