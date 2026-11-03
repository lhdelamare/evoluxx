export function formatCurrency(value: number | string | undefined | null): string {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: number | string | undefined | null): string {
  const num = Number(value) || 0;
  return num.toLocaleString('pt-BR');
}

export function formatCep(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCpf(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCnpj(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function formatDocument(value: string, personType?: 'PJ' | 'PF'): string {
  if (personType === 'PF') return formatCpf(value);
  if (personType === 'PJ') return formatCnpj(value);
  const digits = (value || '').replace(/\D/g, '');
  return digits.length <= 11 ? formatCpf(value) : formatCnpj(value);
}

export function getDocumentLabel(doc?: string, personType?: 'PJ' | 'PF'): 'CPF' | 'CNPJ' {
  if (personType === 'PF') return 'CPF';
  if (personType === 'PJ') return 'CNPJ';
  const digits = (doc || '').replace(/\D/g, '');
  return digits.length === 11 ? 'CPF' : 'CNPJ';
}

export interface CepResult {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
}

export async function fetchAddressByCep(cep: string): Promise<CepResult | null> {
  const cleanCep = (cep || '').replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || 'SP',
          complement: data.complemento || '',
        };
      }
    }
  } catch {
    // Fallback to BrasilAPI below
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
    if (res.ok) {
      const data = await res.json();
      return {
        street: data.street || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || 'SP',
      };
    }
  } catch {
    // Ignore error
  }

  return null;
}
