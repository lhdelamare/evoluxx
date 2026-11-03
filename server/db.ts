import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'evoluxx_db';
const XAMPP_SOCKET = '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';

function getBaseConnectionConfig(): mysql.PoolOptions {
  const socketPath = process.env.DB_SOCKET || (fs.existsSync(XAMPP_SOCKET) ? XAMPP_SOCKET : undefined);
  const config: mysql.PoolOptions = {
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  if (socketPath && (!process.env.DB_HOST || process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost')) {
    config.socketPath = socketPath;
  } else {
    config.host = process.env.DB_HOST || '127.0.0.1';
    config.port = Number(process.env.DB_PORT) || 3306;
  }

  return config;
}

export let pool: mysql.Pool;

export async function initDatabase() {
  const baseConfig = getBaseConnectionConfig();

  // 1. Try to create database if not exists (safe if user is root; if Coolify already created DB for a restricted user, continues safely)
  try {
    const tempConn = await mysql.createConnection(baseConfig);
    await tempConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await tempConn.end();
  } catch (err: any) {
    console.warn(`ℹ️ Aviso ao verificar criação do banco (${DB_NAME}): ${err.message}. Conectando diretamente ao banco...`);
  }

  // 2. Initialize pool with database
  pool = mysql.createPool({
    ...baseConfig,
    database: DB_NAME,
  });

  // 3. Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(150) NOT NULL,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(150) NOT NULL,
      role VARCHAR(100) DEFAULT 'Administrador',
      region VARCHAR(100) DEFAULT 'Grande SP • Matriz Evoluxx',
      avatar TEXT,
      monthly_goal DECIMAL(12,2) DEFAULT 110000.00,
      commission_rate DECIMAL(5,2) DEFAULT 5.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      person_type VARCHAR(10) DEFAULT 'PJ',
      company_name VARCHAR(200) NOT NULL,
      trade_name VARCHAR(200) NOT NULL,
      cnpj VARCHAR(30) NOT NULL,
      state_registration VARCHAR(40) DEFAULT 'Isento',
      segment VARCHAR(100) DEFAULT 'Estética Automotiva',
      tier VARCHAR(50) DEFAULT 'Cliente Ouro',
      status VARCHAR(50) DEFAULT 'Ativo',
      zip_code VARCHAR(20) DEFAULT '04794-000',
      street VARCHAR(200) DEFAULT '',
      address_number VARCHAR(30) DEFAULT '',
      complement VARCHAR(100) DEFAULT '',
      address VARCHAR(255) NOT NULL,
      neighborhood VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(10) DEFAULT 'SP',
      region VARCHAR(100) DEFAULT 'Zona Sul',
      contact_name VARCHAR(150) NOT NULL,
      contact_role VARCHAR(100) DEFAULT 'Gerente de Compras',
      phone VARCHAR(30) NOT NULL,
      whatsapp VARCHAR(30) NOT NULL,
      email VARCHAR(150) DEFAULT '',
      credit_limit DECIMAL(12,2) DEFAULT 15000.00,
      credit_used DECIMAL(12,2) DEFAULT 0.00,
      payment_terms VARCHAR(100) DEFAULT '28 / 35 / 42 DDL',
      avg_monthly_ticket DECIMAL(12,2) DEFAULT 4250.00,
      last_purchase_date VARCHAR(30) DEFAULT '',
      last_purchase_value DECIMAL(12,2) DEFAULT 0.00,
      image_url TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Safe migration for existing clients table
  const alterColumns = [
    `ALTER TABLE clients ADD COLUMN person_type VARCHAR(10) DEFAULT 'PJ' AFTER id`,
    `ALTER TABLE clients ADD COLUMN street VARCHAR(200) DEFAULT '' AFTER zip_code`,
    `ALTER TABLE clients ADD COLUMN address_number VARCHAR(30) DEFAULT '' AFTER street`,
    `ALTER TABLE clients ADD COLUMN complement VARCHAR(100) DEFAULT '' AFTER address_number`,
  ];
  for (const sql of alterColumns) {
    try {
      await pool.query(sql);
    } catch {
      // Column already exists
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) NOT NULL,
      packaging VARCHAR(80) NOT NULL,
      dilution VARCHAR(80) DEFAULT 'Pronto Uso',
      description TEXT,
      unit_price DECIMAL(10,2) NOT NULL,
      cost_price DECIMAL(10,2) NOT NULL,
      warehouse_stock INT NOT NULL DEFAULT 100,
      min_stock INT NOT NULL DEFAULT 20,
      image_url TEXT,
      is_promo TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      plate VARCHAR(20) NOT NULL UNIQUE,
      model VARCHAR(150) NOT NULL,
      brand VARCHAR(80) NOT NULL,
      year INT NOT NULL DEFAULT 2024,
      type VARCHAR(80) DEFAULT 'Furgão Pronta-Entrega',
      driver_name VARCHAR(150) NOT NULL,
      driver_phone VARCHAR(40) DEFAULT '(11) 99876-5432',
      route_region VARCHAR(100) DEFAULT 'Grande SP - Zona Sul',
      status VARCHAR(50) DEFAULT 'Em Rota',
      current_km INT DEFAULT 24500,
      next_maintenance_km INT DEFAULT 30000,
      fuel_level INT DEFAULT 85,
      max_load_kg INT DEFAULT 650,
      last_load_date VARCHAR(40) DEFAULT '',
      notes TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      min_quantity INT NOT NULL DEFAULT 5,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_vehicle_product (vehicle_id, product_id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vehicle_id INT NOT NULL,
      log_type VARCHAR(80) NOT NULL,
      description TEXT NOT NULL,
      cost DECIMAL(10,2) DEFAULT 0.00,
      km_recorded INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_number VARCHAR(40) NOT NULL,
      client_id INT NOT NULL,
      vehicle_id INT NULL,
      seller_name VARCHAR(150) DEFAULT 'Administrador',
      status VARCHAR(50) DEFAULT 'Faturado',
      sale_type VARCHAR(80) DEFAULT 'Venda Direta Externa',
      payment_method VARCHAR(120) DEFAULT 'Boleto Faturado 28 Dias',
      subtotal DECIMAL(12,2) NOT NULL,
      discount_percent DECIMAL(5,2) DEFAULT 0.00,
      discount_value DECIMAL(12,2) DEFAULT 0.00,
      shipping_cost DECIMAL(10,2) DEFAULT 0.00,
      total DECIMAL(12,2) NOT NULL,
      nfe_number VARCHAR(50) DEFAULT '',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      vehicle_id INT NULL,
      scheduled_date VARCHAR(30) NOT NULL,
      scheduled_time VARCHAR(20) NOT NULL,
      distance_km DECIMAL(6,1) DEFAULT 3.5,
      status VARCHAR(50) DEFAULT 'Pendente',
      purpose VARCHAR(255) NOT NULL,
      notes TEXT,
      checked_in_at VARCHAR(40) DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await seedDatabase();
}

async function seedDatabase() {
  // Ensure 'administrador' user always exists
  const [users]: any = await pool.query('SELECT id FROM users WHERE username = ?', ['administrador']);
  if (users.length === 0) {
    await pool.query(
      `INSERT INTO users (username, email, password, name, role, region, avatar, monthly_goal, commission_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'administrador',
        'administrador@evoluxx.com.br',
        'admin123',
        'Administrador Evoluxx',
        'Diretor Comercial & Frota',
        'Grande SP • Matriz Evoluxx',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCbRoaQsW4S2PhdU003UidO4IPoGYY1K59NTSKeYfk0bl57uy03kD07dWHoJdCx57Wp94H6pt7_QvE_g9CzBqZSWtheBwDFbRAvvqM5-nFWkdikzAU4Zw_tlWlwGJcTxNlexwZBB7sWFNndYnAYgaFUUToKRA3c3MOL1a0KSLR6UMpi3bQNy752feyqyruGS72lvkFDtXTUztfFdMID6xQzEZa-6CAIfA-L4XkVNeOLW9QkCMIpIQ',
        110000.00,
        5.00,
      ]
    );
    await pool.query(
      `INSERT INTO users (username, email, password, name, role, region, avatar, monthly_goal, commission_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'carlos.silva',
        'carlos.vendas@evoluxx.com.br',
        '123456',
        'Carlos Silva',
        'Rep. SP • Evoluxx Brasil',
        'Grande SP • Zona Sul',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCbRoaQsW4S2PhdU003UidO4IPoGYY1K59NTSKeYfk0bl57uy03kD07dWHoJdCx57Wp94H6pt7_QvE_g9CzBqZSWtheBwDFbRAvvqM5-nFWkdikzAU4Zw_tlWlwGJcTxNlexwZBB7sWFNndYnAYgaFUUToKRA3c3MOL1a0KSLR6UMpi3bQNy752feyqyruGS72lvkFDtXTUztfFdMID6xQzEZa-6CAIfA-L4XkVNeOLW9QkCMIpIQ',
        90000.00,
        5.00,
      ]
    );
  }

  // Seed products if empty
  const [existingProducts]: any = await pool.query('SELECT COUNT(*) as count FROM products');
  if (existingProducts[0].count === 0) {
    const productsData = [
      [
        'SH-500',
        'Shampoo Automotivo pH Neutro Concentrado',
        'Lavagem',
        'Galão 5L',
        'Diluição 1:400',
        'Shampoo automotivo super concentrado de pH neutro com alto poder de espuma e lubrificação para estética profissional.',
        68.50,
        32.00,
        240,
        40,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA0gjhuxiyvefGU7HhuagSyBqGS248Wf0CPNugSN8HBfX1uWtEcJubGs_GzuGWzARo-LHROsx0tFSXVlTcngr85_8cP6ZbSXC78rElIxYlsK6medjOGtKMkwK8TX42LwZwQFYd4T7P55Q1LUmbQ4Z25q7N9XNY6LoMa6uUmLCGNOQg6X-bJ9aj9yDvrL-yzKNmyP6Fx5mFSOMcegbPPyTvc1Z5twBkfvf2eqA3kbDaxiXrh-sCnbQ',
        1,
      ],
      [
        'CR-200',
        'Cera Cristalizadora SiO2 Premium',
        'Polimento & Proteção',
        'Frasco 500ml',
        'Pronto Uso',
        'Selante cerâmico spray com tecnologia SiO2, alta hidrorepelência, brilho profundo espelhado e proteção de até 6 meses.',
        89.90,
        41.50,
        180,
        30,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAsC3kABJfKPiDtLkaxawuakFCpDSZ1y1MNX4GOynbt3d_2iB0Xwu1ww46ysu-9uqY5-LXcTtFfKjrSITskNypq_r5JHYMNvg9Orcqur5XqIorocOGEEmyimNKqCQaf_5korodBU-NHHQob4021JLynqChDeOsowmNYz18leUHzpT0mSfSqNdLn54jZNwNdKRjIXTnbsmvrhTKzraSvrZrvze_xm39AEp4byK-PEhVQfm19Q5XwSA',
        1,
      ],
      [
        'PR-500',
        'Pretinho Pneu Gel Brilho Molhado',
        'Pneus & Plásticos',
        'Galão 5L',
        'Pronto Uso',
        'Gel revitalizador de pneus de longa duração, resistente à água e sem respingos, acabamento brilho molhado intenso.',
        74.00,
        35.00,
        195,
        35,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDv8lomGLLhZzvdlblRLkcQR30Cj-tqLYBNRbv3yUoFvVd-8mauiLl8XEHGP0KgyjoT4XCP1U9-AUa8k6bcJZ7ALFxcOy3yX35-wbHS12XRhMZDZwFhQE2B5myIry9ynDYYaOhXGHy40cojuBEAOFtf-xrSh-qZ_jDMzCi1Tvg04MY_ui2Maom4F735TwAkt7Ssph6xPDXVkqXgAssEuGaP8uAphykL3GE7ZoKZ2fZ7_QpBMid77g',
        1,
      ],
      [
        'DG-20L',
        'Desengraxante Alcalino Solvente Chassis',
        'Desengraxantes',
        'Bombona 20L',
        'Diluição 1:40',
        'Desengraxante alcalino pesado para lavagem de motores, caixas de roda e chassis de caminhões e utilitários.',
        145.00,
        68.00,
        90,
        20,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCjMEXwotb8aKPnJOWFLhV7Yc-ZygNrH_E6SF3ZWgeXkukgGkw7ab8VDzvyE2i80u2LT0ROYSxbAm0OXpt8Hpszyotye5luy-Ae4Ew6ZI1lZHskrPFYO6-IQsBFYHosiHQHLWfUkpExxiuHhqYuwXf4uiv2Edna-bCblbTnhVmBJfx7XqyEegWo7xqGrcpj0AALdYpjWCPQclhtq6LKzDOerMOBqt_WioTw5Vk_opQTpGXv94q83g',
        0,
      ],
      [
        'DC-20L',
        'Desengraxante Citrus Ecológico 20L',
        'Desengraxantes',
        'Bombona 20L',
        'Diluição 1:20',
        'Multiuso desengraxante biodegradável à base de D-Limoneno para motores e cofres delicados.',
        215.00,
        98.00,
        65,
        15,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBg86PU6sVjqlHAr4Wm3uUZSlQlmNfWdWpX5n68AcyJ_JC3E4XVGdKRhKkPT25iQIOt6MpFucIXaPXy7r_42NhatM7rlJNfE-bkTZhNcZhlYZC7N09fueBh0Tw3LdozckrHwjH9Cz_RpS6tmEa99WG3UvkZXP9Ke7uXV2DVeFYYZ8IbJVxXBCnaB6ZTcPGOoxooOFn8CRo_cWyzU9gN_Y1jXSMaYtQ3GwJJQqoJm4ifviJnFTj2fA',
        0,
      ],
      [
        'SN-20L',
        'Snow Foam Shampoo Vermelho Intenso 20L',
        'Lavagem',
        'Bombona 20L',
        'Diluição 1:300',
        'Espuma densa efeito neve para pré-lavagem técnica sem contato em estúdios de detalhamento.',
        198.00,
        89.00,
        110,
        25,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuATh-U3hLBkZLFvlN84j6N4Ky_6wZEYlHwVbb1U03ye6QijK_haPR9vizY-flgfXEhlOzeMeT68ZonRmNZzsGBJAbs6XRLBHnYU7_r1w0DtaW_4wdEV-6tuL26w4_ygYXVTw44va29jUxqlliau-Yf66TaJofwgnRLMkFggoVi3Bjl6i6mDwxqJtxQ-gD3xO7kFCGrMxCxPsN_A3AUTDDgkdv_GZGhxo9DmmjXfnOTCEYgoxpG_uQ',
        1,
      ],
      [
        'VT-9H',
        'Vitrificador Cerâmico Nano 9H Evoluxx 50ml',
        'Polimento & Proteção',
        'Kit 50ml',
        'Pronto Uso',
        'Coating cerâmico profissional 9H com proteção UV extrema de até 3 anos para vernizes automotivos.',
        289.00,
        130.00,
        55,
        10,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuALxY_jgs8_KcVx8ZvezMf5cTyHAI_-ccDLU6C9vikRXXIXVuCcKw4RQPtwIKuhLyb_I7Ptt9ZklHYA8iqTXVutWgyNhh_LRtRhDpvVjmmsmXvVrQbmYzQ0zpYKDsw02GlB0AUxkOv0hK2SB7cRCWsyNjYC364bF11jAwzRxCk1P1CnZfHzxC_vODOXyDfy6n2awTrDk1fU8POSfhtoYFEuwkdApojLSvcth7ZVnkISGU7khLLiNw',
        1,
      ],
      [
        'RV-500',
        'Revitalizador de Plásticos Internos & Externos',
        'Pneus & Plásticos',
        'Galão 5L',
        'Pronto Uso',
        'Restaura plásticos ressecados com toque seco acetinado e proteção contra raios solares.',
        118.00,
        52.00,
        130,
        20,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDv8lomGLLhZzvdlblRLkcQR30Cj-tqLYBNRbv3yUoFvVd-8mauiLl8XEHGP0KgyjoT4XCP1U9-AUa8k6bcJZ7ALFxcOy3yX35-wbHS12XRhMZDZwFhQE2B5myIry9ynDYYaOhXGHy40cojuBEAOFtf-xrSh-qZ_jDMzCi1Tvg04MY_ui2Maom4F735TwAkt7Ssph6xPDXVkqXgAssEuGaP8uAphykL3GE7ZoKZ2fZ7_QpBMid77g',
        0,
      ],
    ];

    for (const p of productsData) {
      await pool.query(
        `INSERT INTO products (code, name, category, packaging, dilution, description, unit_price, cost_price, warehouse_stock, min_stock, image_url, is_promo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }
  }

  // Seed clients if empty
  const [existingClients]: any = await pool.query('SELECT COUNT(*) as count FROM clients');
  if (existingClients[0].count === 0) {
    const clientsData = [
      [
        'Detailer Master Estética Automotiva LTDA',
        'Detailer Master Estética',
        '34.892.110/0001-45',
        '112.983.450.119',
        'Estética Automotiva',
        'VIP • Ouro',
        'Ativo',
        'Av. das Nações Unidas, 14.200',
        'Santo Amaro',
        'São Paulo',
        'SP',
        '04794-000',
        'Zona Sul',
        'Marcos Oliveira',
        'Gerente de Compras • Decisor',
        '11987654321',
        '5511987654321',
        'compras@detailermaster.com.br',
        15000.00,
        6840.00,
        '28 / 35 / 42 DDL',
        4250.00,
        '18/10/2024',
        3840.00,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBu6T8Su23NzYXOyaWUTrmY6xMvD7EUSR-7gjaPpPK6lpFKuplVURqB0GsMGnV-Ar9mvJsEceZtvGp6xY9c-Ni4qiohy3VSEB2wqjM6C9nE0Mv3SNFOGsBmxJ7oYzn9HfKaP7kL3Rvs64PBebd_q1aQ9eVZsaIR5QE4Esq9NP9mr2EaFvlTafxZxsnZZ4wVjgKxBPdY0s3sYHbmmdXHMdSIn4OAghgcfQ4QZVMU_B8_2Gd06gE83A',
        'Marcos relatou alta procura por vitrificadores e pretinho gel resistente à chuva. Demonstrado lote novo da linha SiO2. Prometido prazo especial de 42 DDL para compras acima de R$ 5.000,00.',
      ],
      [
        'Lava-Rápido & Estética Ducha de Ouro LTDA',
        'Ducha de Ouro Lava-Rápido',
        '19.450.882/0001-12',
        '145.221.908.110',
        'Lava-Rápido',
        'Cliente Prata',
        'Inativo +30d',
        'Rua da Mooca, 2.840',
        'Mooca',
        'São Paulo',
        'SP',
        '03104-003',
        'Zona Leste',
        'Roberto Mendes',
        'Proprietário',
        '11988887777',
        '5511988887777',
        'contato@duchadeouro.com.br',
        8000.00,
        1950.00,
        'Boleto 28 Dias',
        2100.00,
        '16/09/2024',
        1950.00,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC9Xs7nDiPxRxy8mOxM3HWdjVVVeYSJPEB4HEN7Ie_PbrXCF7uQ9XG0OT8O4T38HMqAMvz7jdxJBqemOptvC7-krnpxR76pkCXxC_mx2R6MAxS7EUMk-mZN8QnuyGrrMWZtG1EbdU8Pa5T1lZYRTgFUyrtg5Q9GOgMkzKjvvajzGsASwid9Un4hkEtRm7sJcZNsgE4kosKbjz3CNJhYbxJ51a9D1W-Z1zYfbf76WOUeQBKh_lzUSg',
        'Giro estimado esgotado há 8 dias (Shampoo com Cera 20L + Pretinho Pneu). Priorizar visita com furgão de pronta-entrega.',
      ],
      [
        'Centro Automotivo SpeedCar Concessionária S.A.',
        'SpeedCar Concessionária',
        '08.123.456/0001-99',
        '244.819.002.115',
        'Concessionária',
        'VIP • Ouro',
        'Ativo',
        'Av. Norte-Sul, 1.550',
        'Cambuí',
        'Campinas',
        'SP',
        '13025-320',
        'Interior SP',
        'Fernanda Costa',
        'Suprimentos & Pátio',
        '1932001122',
        '5519991234567',
        'suprimentos@speedcar.com.br',
        25000.00,
        7200.00,
        '28 / 42 / 56 DDL',
        7800.00,
        '21/10/2024',
        7200.00,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA64fFnbMsjs2Uu_jGxTh7z5xJz7YhBcRKYZ4UtnB5_S_CEX8-m0FGVpEaDBKARsVXemi8bAsOdBllZZpg5GgbZriL9cgi2NoDEoKuymubZezLkCD-oE_g1t1cEeurHIEzppUavsAIah9Jll5GmTBirUgqa2f6DM11rluxqJuFEsHDrM2sCERQEA3rw8GQVWlSUlmELw02yjC8Ejs2ZR_wY5eZ1JWlMRgwcl0-r7xrSpqwq_MtCSQ',
        'Concessionária de alto volume. Compra bombonas de 20L e vitrificadores para o setor de preparação de veículos zero km.',
      ],
      [
        'Auto Posto & Lavagem Alvorada Premium LTDA',
        'Auto Posto Alvorada',
        '42.901.334/0001-71',
        '118.400.291.114',
        'Auto Posto',
        'VIP • Ouro',
        'Ativo',
        'Av. Paulista, 2.100',
        'Bela Vista',
        'São Paulo',
        'SP',
        '01310-300',
        'Centro / Sul',
        'Ricardo Alvorada',
        'Gerente de Pista',
        '11977776666',
        '5511977776666',
        'gerencia@postoalvorada.com.br',
        18000.00,
        4900.00,
        'Boleto 28 Dias',
        5400.00,
        '24/10/2024',
        2450.00,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAMPiMv4dPR2pAvoNspgc-LBvWBN7mNm_p57QBhY-CVI8sH5o9dp6zIeKjexbiCK2iVXJLcW6pwGd1wPz6LHhYMMyYVkZ-I106wn8odDXHPSR9C5B6CHWqPuN_2CBL59pqsi2nSiL3pASnGu18obsJ5qrvUpGq0vMw7ewG80KUSv2H_5V810e4q6IWZU4uB707ksZTnkPdCbn7Zoz2VD_RxaCCz--E2TTnysyDZuzMos3hrEvqT1g',
        'Túnel de lavagem automatizado com alto consumo de Snow Foam e Cera líquida.',
      ],
      [
        'EcoWash Estética & Detalhamento Automotivo LTDA',
        'EcoWash Estética',
        '51.309.774/0001-08',
        '192.441.800.111',
        'Estética Automotiva',
        'Potencial',
        'Potencial',
        'Av. Ibirapuera, 3.100',
        'Moema',
        'São Paulo',
        'SP',
        '04029-200',
        'Zona Sul',
        'Lucas Martins',
        'Sócio Diretor',
        '11966665555',
        '5511966665555',
        'lucas@ecowashsp.com.br',
        10000.00,
        1180.00,
        'PIX CNPJ à Vista',
        3100.00,
        '23/10/2024',
        1180.00,
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD94p7mtOtEKAmq6ey9JMDMiJIGK7XzuXiXISJ86OqpxyZUyHUZa6vHBriO6BK49Li6hbU9PqASdvllWRbbYxe5IldOEe3vm15a3-3vcIR7cJRi4_VHqtxF4QIBndT1NHejJaLQUxLMMUkdZhsa1PNQjhQuYsgQvlqmg2wBeSXYgzdO8k-aT4fc2cFNemfiXunVZXBvStCmOYzQIlxasNmx8zGtOY9n4ZL-JmFR6jSzc0dN3TgBlA',
        'Estúdio novo em Moema focado em carros esportivos e proteção cerâmica.',
      ],
    ];

    for (const c of clientsData) {
      await pool.query(
        `INSERT INTO clients (company_name, trade_name, cnpj, state_registration, segment, tier, status, address, neighborhood, city, state, zip_code, region, contact_name, contact_role, phone, whatsapp, email, credit_limit, credit_used, payment_terms, avg_monthly_ticket, last_purchase_date, last_purchase_value, image_url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        c
      );
    }
  }

  // Seed Fleet Vehicles & Vehicle Inventory if empty
  const [existingVehicles]: any = await pool.query('SELECT COUNT(*) as count FROM vehicles');
  if (existingVehicles[0].count === 0) {
    const vehiclesData = [
      [
        'EVX-4A89',
        'Fiat Fiorino Endurance 1.4 Flex',
        'Fiat',
        2024,
        'Furgão Pronta-Entrega',
        'Carlos Silva',
        '(11) 98765-4321',
        'Grande SP • Zona Sul & Santo Amaro',
        'Em Rota',
        18420,
        20000,
        88,
        650,
        'Hoje às 07:30h',
        'Veículo equipado com prateleiras químicas homologadas para pronta-entrega em estéticas e lava-rápidos.',
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
      ],
      [
        'EVX-9B21',
        'Renault Master Furgão L2H2 2.3 dCi',
        'Renault',
        2023,
        'VUC Distribuição Pesada',
        'Marcos Rocha',
        '(11) 97654-3210',
        'Interior SP • Campinas & Jundiaí',
        'Em Rota',
        42890,
        50000,
        72,
        1500,
        'Hoje às 06:45h',
        'Furgão de grande porte focado em bombonas de 20L e 50L para concessionárias e postos de lavagem.',
        'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80',
      ],
      [
        'EVX-2C77',
        'VW Saveiro Robust Cabine Dupla 1.6',
        'Volkswagen',
        2024,
        'Utilitário Demonstração Técnica',
        'André Souza',
        '(11) 96543-2109',
        'Grande SP • Zona Leste & ABC',
        'Na Base',
        12150,
        20000,
        100,
        600,
        'Ontem às 18:00h',
        'Utilitário com capota marítima e kit completo de polimento/demonstração técnica em campo.',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
      ],
      [
        'EVX-7D55',
        'Chevrolet Montana Premier 1.2 Turbo',
        'Chevrolet',
        2024,
        'Carro Representante VIP',
        'Administrador Evoluxx',
        '(11) 99999-0000',
        'Atendimento Contas Key Account',
        'Na Base',
        8340,
        10000,
        95,
        500,
        'Hoje às 08:00h',
        'Veículo da diretoria comercial com mostruário premium de vitrificadores 9H e linha SiO2.',
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80',
      ],
    ];

    for (const v of vehiclesData) {
      await pool.query(
        `INSERT INTO vehicles (plate, model, brand, year, type, driver_name, driver_phone, route_region, status, current_km, next_maintenance_km, fuel_level, max_load_kg, last_load_date, notes, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        v
      );
    }

    // Seed Vehicle Inventory (Quais produtos estão em cada carro)
    const vehicleStock = [
      // Carro 1: Fiorino (Carlos Silva)
      [1, 1, 24, 6], // Shampoo 5L
      [1, 2, 18, 5], // Cera SiO2
      [1, 3, 20, 5], // Pretinho 5L
      [1, 4, 8, 2],  // Desengraxante 20L
      [1, 7, 10, 3], // Vitrificador 9H
      // Carro 2: Renault Master (Marcos Rocha)
      [2, 1, 45, 10],
      [2, 4, 25, 8],
      [2, 5, 20, 6],
      [2, 6, 30, 8],
      [2, 3, 35, 10],
      // Carro 3: Saveiro (André Souza)
      [3, 1, 15, 5],
      [3, 2, 12, 4],
      [3, 3, 14, 5],
      [3, 8, 10, 3],
      // Carro 4: Montana (Administrador)
      [4, 2, 15, 4],
      [4, 7, 20, 5],
      [4, 1, 10, 3],
      [4, 6, 8, 2],
    ];

    for (const vs of vehicleStock) {
      await pool.query(
        `INSERT INTO vehicle_inventory (vehicle_id, product_id, quantity, min_quantity) VALUES (?, ?, ?, ?)`,
        vs
      );
    }

    // Seed Vehicle Logs
    const logsData = [
      [1, 'Carga de Estoque', 'Carregamento matinal no CD Matriz: +24 Galões Shampoo 5L e +18 Ceras SiO2', 0, 18380],
      [1, 'Abastecimento', 'Tanque cheio Etanol/Gasolina - Posto Alvorada', 285.50, 18395],
      [2, 'Saída em Rota', 'Saída para rota Campinas / Rod. Bandeirantes com carga pesada 20L', 0, 42810],
      [3, 'Manutenção', 'Revisão preventiva de freios e alinhamento na oficina credenciada', 640.00, 12100],
      [4, 'Carga de Estoque', 'Abastecimento de kits Vitrificador 9H para demonstração VIP', 0, 8300],
    ];
    for (const l of logsData) {
      await pool.query(
        `INSERT INTO vehicle_logs (vehicle_id, log_type, description, cost, km_recorded) VALUES (?, ?, ?, ?, ?)`,
        l
      );
    }
  }

  // Seed Orders if empty
  const [existingOrders]: any = await pool.query('SELECT COUNT(*) as count FROM orders');
  if (existingOrders[0].count === 0) {
    // Order 1: #4821
    const [res1]: any = await pool.query(
      `INSERT INTO orders (order_number, client_id, vehicle_id, seller_name, status, sale_type, payment_method, subtotal, discount_percent, discount_value, shipping_cost, total, nfe_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '4821',
        4,
        1,
        'Carlos Silva',
        'Faturado',
        'Pronta-Entrega (Estoque Carro)',
        'Boleto Faturado 28 Dias',
        2578.95,
        5.0,
        128.95,
        0,
        2450.00,
        'NF-e 89.412',
        'Entrega realizada direto do Furgão EVX-4A89 em rota.',
      ]
    );
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
       (?, 1, 10, 68.50, 685.00),
       (?, 6, 6, 198.00, 1188.00),
       (?, 3, 10, 74.00, 740.00)`,
      [res1.insertId, res1.insertId, res1.insertId]
    );

    // Order 2: #4820
    const [res2]: any = await pool.query(
      `INSERT INTO orders (order_number, client_id, vehicle_id, seller_name, status, sale_type, payment_method, subtotal, discount_percent, discount_value, shipping_cost, total, nfe_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '4820',
        5,
        4,
        'Administrador Evoluxx',
        'Em Separação',
        'Venda Direta Externa',
        'Pix CNPJ à Vista (Desconto Extra 2%)',
        1180.00,
        0,
        0,
        0,
        1180.00,
        'NF-e 89.410',
        'Box A-14 • Expedição Expressa Zona Sul',
      ]
    );
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
       (?, 7, 3, 289.00, 867.00),
       (?, 2, 4, 89.90, 359.60)`,
      [res2.insertId, res2.insertId]
    );

    // Order 3: #4782 (Detailer Master)
    const [res3]: any = await pool.query(
      `INSERT INTO orders (order_number, client_id, vehicle_id, seller_name, status, sale_type, payment_method, subtotal, discount_percent, discount_value, shipping_cost, total, nfe_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '4782',
        1,
        1,
        'Carlos Silva',
        'Entregue',
        'Venda Direta Externa',
        'Boleto Faturado 28 Dias',
        4042.10,
        5.0,
        202.10,
        0,
        3840.00,
        'NF-e 89.201',
        'Pedido mensal linha estética pesada.',
      ]
    );
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
       (?, 1, 20, 68.50, 1370.00),
       (?, 2, 12, 89.90, 1078.80),
       (?, 3, 12, 74.00, 888.00),
       (?, 4, 5, 145.00, 725.00)`,
      [res3.insertId, res3.insertId, res3.insertId, res3.insertId]
    );

    // Order 4: #4755 (SpeedCar)
    const [res4]: any = await pool.query(
      `INSERT INTO orders (order_number, client_id, vehicle_id, seller_name, status, sale_type, payment_method, subtotal, discount_percent, discount_value, shipping_cost, total, nfe_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        '4755',
        3,
        2,
        'Administrador Evoluxx',
        'Entregue',
        'Reposição Programada',
        'Boleto Faturado 14/28/42 Dias',
        7200.00,
        0,
        0,
        0,
        7200.00,
        'NF-e 89.088',
        'Entrega com Renault Master EVX-9B21 em Campinas.',
      ]
    );
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
       (?, 5, 15, 215.00, 3225.00),
       (?, 6, 20, 198.00, 3960.00)`,
      [res4.insertId, res4.insertId]
    );
  }

  // Seed Visits if empty
  const [existingVisits]: any = await pool.query('SELECT COUNT(*) as count FROM visits');
  if (existingVisits[0].count === 0) {
    const visitsData = [
      [
        1,
        1,
        'Hoje',
        '10:30h • Em 45 min',
        3.2,
        'Pendente',
        'Reposição: Shampoo Neutro 5L, Cera SiO2 e Pretinho Gel direto da Fiorino EVX-4A89',
        'Levar amostras do Vitrificador 9H.',
      ],
      [
        5,
        4,
        'Hoje',
        '14:00h • Tarde',
        8.4,
        'Pendente',
        'Demonstração técnica da Cera Cristalizadora Ceramic e Vitrificador Nano 9H',
        'Cliente potencial VIP em Moema.',
      ],
      [
        2,
        3,
        'Hoje',
        '16:15h • Tarde',
        5.7,
        'Pendente',
        'Reativação de cliente inativo (+30 dias) com oferta promocional de Galões 5L',
        'Oferecer condição especial no boleto.',
      ],
    ];
    for (const v of visitsData) {
      await pool.query(
        `INSERT INTO visits (client_id, vehicle_id, scheduled_date, scheduled_time, distance_km, status, purpose, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        v
      );
    }
  }
}

