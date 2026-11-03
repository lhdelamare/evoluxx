import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'evoluxx_db';
const XAMPP_SOCKET = '/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock';

export let pool: mysql.Pool | null = null;
export let isMysqlConnected = false;

function getBaseConnectionConfig(): mysql.PoolOptions {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (dbUrl) {
    return {
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  const host = process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
  const socketPath =
    process.env.DB_SOCKET ||
    ((host === '127.0.0.1' || host === 'localhost') && fs.existsSync(XAMPP_SOCKET)
      ? XAMPP_SOCKET
      : undefined);

  const config: mysql.PoolOptions = {
    user: process.env.DB_USER || process.env.MYSQL_USER || 'root',
    password:
      process.env.DB_PASSWORD ??
      process.env.MYSQL_PASSWORD ??
      process.env.MYSQL_ROOT_PASSWORD ??
      '',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 5000,
  };

  if (socketPath) {
    config.socketPath = socketPath;
  } else {
    config.host = host;
    config.port = Number(process.env.DB_PORT || process.env.MYSQL_PORT) || 3306;
  }

  return config;
}

export async function initDatabase(): Promise<boolean> {
  const baseConfig = getBaseConnectionConfig();
  const candidateHosts = [
    baseConfig.host || '127.0.0.1',
    'host.docker.internal',
    '172.17.0.1',
    '127.0.0.1',
  ];

  // Try primary config first, and if EAI_AGAIN / ENOTFOUND, try Docker bridge hosts
  let connectedConfig: mysql.PoolOptions | null = null;

  if (baseConfig.uri || baseConfig.socketPath) {
    try {
      const testPool = mysql.createPool(
        baseConfig.uri ? baseConfig.uri : { ...baseConfig, database: DB_NAME }
      );
      await testPool.query('SELECT 1');
      pool = testPool;
      connectedConfig = baseConfig;
    } catch {
      // Fallback below
    }
  }

  if (!connectedConfig && !baseConfig.uri) {
    for (const host of Array.from(new Set(candidateHosts))) {
      try {
        const cfg = { ...baseConfig, host, socketPath: undefined };
        try {
          const tempConn = await mysql.createConnection(cfg);
          await tempConn.query(
            `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
          );
          await tempConn.end();
        } catch {
          // Database may already exist for restricted user
        }

        const testPool = mysql.createPool({ ...cfg, database: DB_NAME });
        await testPool.query('SELECT 1');
        pool = testPool;
        connectedConfig = cfg;
        console.log(`✅ Conectado ao MySQL no host "${host}" (banco: ${DB_NAME}).`);
        break;
      } catch (err: any) {
        console.warn(`ℹ️ Tentativa MySQL em "${host}" falhou: ${err.code || err.message}`);
      }
    }
  }

  if (!pool || !connectedConfig) {
    isMysqlConnected = false;
    console.warn(
      `⚠️ MySQL ainda não acessível. O sistema está ativo e operando com banco persistente integrado (fallback-store.json) até que a rede do MySQL seja liberada.`
    );
    return false;
  }

  try {

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
    isMysqlConnected = true;
    console.log('✅ Banco de dados MySQL (evoluxx_db) inicializado e sincronizado com sucesso.');
    return true;
  } catch (err: any) {
    isMysqlConnected = false;
    console.warn(
      `⚠️ MySQL ainda não acessível (${err.message}). O sistema continuará rodando normalmente usando persistência local até o MySQL conectar.`
    );
    return false;
  }
}

async function seedDatabase() {
  if (!pool) return;
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

  const [existingProducts]: any = await pool.query('SELECT COUNT(*) as count FROM products');
  if (existingProducts[0].count === 0) {
    for (const p of INITIAL_SEED.products) {
      await pool.query(
        `INSERT INTO products (code, name, category, packaging, dilution, description, unit_price, cost_price, warehouse_stock, min_stock, image_url, is_promo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          p.code,
          p.name,
          p.category,
          p.packaging,
          p.dilution,
          p.description,
          p.unit_price,
          p.cost_price,
          p.warehouse_stock,
          p.min_stock,
          p.image_url,
          p.is_promo,
        ]
      );
    }
  }

  const [existingClients]: any = await pool.query('SELECT COUNT(*) as count FROM clients');
  if (existingClients[0].count === 0) {
    for (const c of INITIAL_SEED.clients) {
      await pool.query(
        `INSERT INTO clients (person_type, company_name, trade_name, cnpj, state_registration, segment, tier, status, zip_code, street, address_number, complement, address, neighborhood, city, state, region, contact_name, contact_role, phone, whatsapp, email, credit_limit, credit_used, payment_terms, avg_monthly_ticket, last_purchase_date, last_purchase_value, image_url, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.person_type,
          c.company_name,
          c.trade_name,
          c.cnpj,
          c.state_registration,
          c.segment,
          c.tier,
          c.status,
          c.zip_code,
          c.street,
          c.address_number,
          c.complement,
          c.address,
          c.neighborhood,
          c.city,
          c.state,
          c.region,
          c.contact_name,
          c.contact_role,
          c.phone,
          c.whatsapp,
          c.email,
          c.credit_limit,
          c.credit_used,
          c.payment_terms,
          c.avg_monthly_ticket,
          c.last_purchase_date,
          c.last_purchase_value,
          c.image_url,
          c.notes,
        ]
      );
    }
  }

  const [existingVehicles]: any = await pool.query('SELECT COUNT(*) as count FROM vehicles');
  if (existingVehicles[0].count === 0) {
    for (const v of INITIAL_SEED.vehicles) {
      await pool.query(
        `INSERT INTO vehicles (plate, model, brand, year, type, driver_name, driver_phone, route_region, status, current_km, next_maintenance_km, fuel_level, max_load_kg, last_load_date, notes, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          v.plate,
          v.model,
          v.brand,
          v.year,
          v.type,
          v.driver_name,
          v.driver_phone,
          v.route_region,
          v.status,
          v.current_km,
          v.next_maintenance_km,
          v.fuel_level,
          v.max_load_kg,
          v.last_load_date,
          v.notes,
          v.image_url,
        ]
      );
    }

    for (const vs of INITIAL_SEED.vehicle_inventory) {
      await pool.query(
        `INSERT INTO vehicle_inventory (vehicle_id, product_id, quantity, min_quantity) VALUES (?, ?, ?, ?)`,
        [vs.vehicle_id, vs.product_id, vs.quantity, vs.min_quantity]
      );
    }

    for (const l of INITIAL_SEED.vehicle_logs) {
      await pool.query(
        `INSERT INTO vehicle_logs (vehicle_id, log_type, description, cost, km_recorded) VALUES (?, ?, ?, ?, ?)`,
        [l.vehicle_id, l.log_type, l.description, l.cost, l.km_recorded]
      );
    }
  }

  const [existingOrders]: any = await pool.query('SELECT COUNT(*) as count FROM orders');
  if (existingOrders[0].count === 0) {
    for (const o of INITIAL_SEED.orders) {
      const [res]: any = await pool.query(
        `INSERT INTO orders (order_number, client_id, vehicle_id, seller_name, status, sale_type, payment_method, subtotal, discount_percent, discount_value, shipping_cost, total, nfe_number, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          o.order_number,
          o.client_id,
          o.vehicle_id,
          o.seller_name,
          o.status,
          o.sale_type,
          o.payment_method,
          o.subtotal,
          o.discount_percent,
          o.discount_value,
          o.shipping_cost,
          o.total,
          o.nfe_number,
          o.notes,
        ]
      );
      for (const item of o.items) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)`,
          [res.insertId, item.product_id, item.quantity, item.unit_price, item.subtotal]
        );
      }
    }
  }

  const [existingVisits]: any = await pool.query('SELECT COUNT(*) as count FROM visits');
  if (existingVisits[0].count === 0) {
    for (const v of INITIAL_SEED.visits) {
      await pool.query(
        `INSERT INTO visits (client_id, vehicle_id, scheduled_date, scheduled_time, distance_km, status, purpose, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          v.client_id,
          v.vehicle_id,
          v.scheduled_date,
          v.scheduled_time,
          v.distance_km,
          v.status,
          v.purpose,
          v.notes,
        ]
      );
    }
  }
}

// Local JSON Fallback Store when MySQL is not reachable yet (e.g. during initial Coolify container boot)
export const INITIAL_SEED = {
  users: [
    {
      id: 1,
      username: 'administrador',
      email: 'administrador@evoluxx.com.br',
      password: 'admin123',
      name: 'Administrador Evoluxx',
      role: 'Diretor Comercial & Frota',
      region: 'Grande SP • Matriz Evoluxx',
      avatar:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCbRoaQsW4S2PhdU003UidO4IPoGYY1K59NTSKeYfk0bl57uy03kD07dWHoJdCx57Wp94H6pt7_QvE_g9CzBqZSWtheBwDFbRAvvqM5-nFWkdikzAU4Zw_tlWlwGJcTxNlexwZBB7sWFNndYnAYgaFUUToKRA3c3MOL1a0KSLR6UMpi3bQNy752feyqyruGS72lvkFDtXTUztfFdMID6xQzEZa-6CAIfA-L4XkVNeOLW9QkCMIpIQ',
      monthly_goal: 110000,
      commission_rate: 5,
    },
  ],
  products: [
    {
      id: 1,
      code: 'SH-500',
      name: 'Shampoo Automotivo pH Neutro Concentrado',
      category: 'Lavagem',
      packaging: 'Galão 5L',
      dilution: 'Diluição 1:400',
      description:
        'Shampoo automotivo super concentrado de pH neutro com alto poder de espuma e lubrificação para estética profissional.',
      unit_price: 68.5,
      cost_price: 32.0,
      warehouse_stock: 240,
      min_stock: 40,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA0gjhuxiyvefGU7HhuagSyBqGS248Wf0CPNugSN8HBfX1uWtEcJubGs_GzuGWzARo-LHROsx0tFSXVlTcngr85_8cP6ZbSXC78rElIxYlsK6medjOGtKMkwK8TX42LwZwQFYd4T7P55Q1LUmbQ4Z25q7N9XNY6LoMa6uUmLCGNOQg6X-bJ9aj9yDvrL-yzKNmyP6Fx5mFSOMcegbPPyTvc1Z5twBkfvf2eqA3kbDaxiXrh-sCnbQ',
      is_promo: 1,
    },
    {
      id: 2,
      code: 'CR-200',
      name: 'Cera Cristalizadora SiO2 Premium',
      category: 'Polimento & Proteção',
      packaging: 'Frasco 500ml',
      dilution: 'Pronto Uso',
      description:
        'Selante cerâmico spray com tecnologia SiO2, alta hidrorepelência, brilho profundo espelhado e proteção de até 6 meses.',
      unit_price: 89.9,
      cost_price: 41.5,
      warehouse_stock: 180,
      min_stock: 30,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAsC3kABJfKPiDtLkaxawuakFCpDSZ1y1MNX4GOynbt3d_2iB0Xwu1ww46ysu-9uqY5-LXcTtFfKjrSITskNypq_r5JHYMNvg9Orcqur5XqIorocOGEEmyimNKqCQaf_5korodBU-NHHQob4021JLynqChDeOsowmNYz18leUHzpT0mSfSqNdLn54jZNwNdKRjIXTnbsmvrhTKzraSvrZrvze_xm39AEp4byK-PEhVQfm19Q5XwSA',
      is_promo: 1,
    },
    {
      id: 3,
      code: 'PR-500',
      name: 'Pretinho Pneu Gel Brilho Molhado',
      category: 'Pneus & Plásticos',
      packaging: 'Galão 5L',
      dilution: 'Pronto Uso',
      description:
        'Gel revitalizador de pneus de longa duração, resistente à água e sem respingos, acabamento brilho molhado intenso.',
      unit_price: 74.0,
      cost_price: 35.0,
      warehouse_stock: 195,
      min_stock: 35,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDv8lomGLLhZzvdlblRLkcQR30Cj-tqLYBNRbv3yUoFvVd-8mauiLl8XEHGP0KgyjoT4XCP1U9-AUa8k6bcJZ7ALFxcOy3yX35-wbHS12XRhMZDZwFhQE2B5myIry9ynDYYaOhXGHy40cojuBEAOFtf-xrSh-qZ_jDMzCi1Tvg04MY_ui2Maom4F735TwAkt7Ssph6xPDXVkqXgAssEuGaP8uAphykL3GE7ZoKZ2fZ7_QpBMid77g',
      is_promo: 1,
    },
    {
      id: 4,
      code: 'DG-20L',
      name: 'Desengraxante Alcalino Solvente Chassis',
      category: 'Desengraxantes',
      packaging: 'Bombona 20L',
      dilution: 'Diluição 1:40',
      description:
        'Desengraxante alcalino pesado para lavagem de motores, caixas de roda e chassis de caminhões e utilitários.',
      unit_price: 145.0,
      cost_price: 68.0,
      warehouse_stock: 90,
      min_stock: 20,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCjMEXwotb8aKPnJOWFLhV7Yc-ZygNrH_E6SF3ZWgeXkukgGkw7ab8VDzvyE2i80u2LT0ROYSxbAm0OXpt8Hpszyotye5luy-Ae4Ew6ZI1lZHskrPFYO6-IQsBFYHosiHQHLWfUkpExxiuHhqYuwXf4uiv2Edna-bCblbTnhVmBJfx7XqyEegWo7xqGrcpj0AALdYpjWCPQclhtq6LKzDOerMOBqt_WioTw5Vk_opQTpGXv94q83g',
      is_promo: 0,
    },
    {
      id: 5,
      code: 'DC-20L',
      name: 'Desengraxante Citrus Ecológico 20L',
      category: 'Desengraxantes',
      packaging: 'Bombona 20L',
      dilution: 'Diluição 1:20',
      description:
        'Multiuso desengraxante biodegradável à base de D-Limoneno para motores e cofres delicados.',
      unit_price: 215.0,
      cost_price: 98.0,
      warehouse_stock: 65,
      min_stock: 15,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBg86PU6sVjqlHAr4Wm3uUZSlQlmNfWdWpX5n68AcyJ_JC3E4XVGdKRhKkPT25iQIOt6MpFucIXaPXy7r_42NhatM7rlJNfE-bkTZhNcZhlYZC7N09fueBh0Tw3LdozckrHwjH9Cz_RpS6tmEa99WG3UvkZXP9Ke7uXV2DVeFYYZ8IbJVxXBCnaB6ZTcPGOoxooOFn8CRo_cWyzU9gN_Y1jXSMaYtQ3GwJJQqoJm4ifviJnFTj2fA',
      is_promo: 0,
    },
    {
      id: 6,
      code: 'SN-20L',
      name: 'Snow Foam Shampoo Vermelho Intenso 20L',
      category: 'Lavagem',
      packaging: 'Bombona 20L',
      dilution: 'Diluição 1:300',
      description:
        'Espuma densa efeito neve para pré-lavagem técnica sem contato em estúdios de detalhamento.',
      unit_price: 198.0,
      cost_price: 89.0,
      warehouse_stock: 110,
      min_stock: 25,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuATh-U3hLBkZLFvlN84j6N4Ky_6wZEYlHwVbb1U03ye6QijK_haPR9vizY-flgfXEhlOzeMeT68ZonRmNZzsGBJAbs6XRLBHnYU7_r1w0DtaW_4wdEV-6tuL26w4_ygYXVTw44va29jUxqlliau-Yf66TaJofwgnRLMkFggoVi3Bjl6i6mDwxqJtxQ-gD3xO7kFCGrMxCxPsN_A3AUTDDgkdv_GZGhxo9DmmjXfnOTCEYgoxpG_uQ',
      is_promo: 1,
    },
    {
      id: 7,
      code: 'VT-9H',
      name: 'Vitrificador Cerâmico Nano 9H Evoluxx 50ml',
      category: 'Polimento & Proteção',
      packaging: 'Kit 50ml',
      dilution: 'Pronto Uso',
      description:
        'Coating cerâmico profissional 9H com proteção UV extrema de até 3 anos para vernizes automotivos.',
      unit_price: 289.0,
      cost_price: 130.0,
      warehouse_stock: 55,
      min_stock: 10,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuALxY_jgs8_KcVx8ZvezMf5cTyHAI_-ccDLU6C9vikRXXIXVuCcKw4RQPtwIKuhLyb_I7Ptt9ZklHYA8iqTXVutWgyNhh_LRtRhDpvVjmmsmXvVrQbmYzQ0zpYKDsw02GlB0AUxkOv0hK2SB7cRCWsyNjYC364bF11jAwzRxCk1P1CnZfHzxC_vODOXyDfy6n2awTrDk1fU8POSfhtoYFEuwkdApojLSvcth7ZVnkISGU7khLLiNw',
      is_promo: 1,
    },
    {
      id: 8,
      code: 'RV-500',
      name: 'Revitalizador de Plásticos Internos & Externos',
      category: 'Pneus & Plásticos',
      packaging: 'Galão 5L',
      dilution: 'Pronto Uso',
      description:
        'Restaura plásticos ressecados com toque seco acetinado e proteção contra raios solares.',
      unit_price: 118.0,
      cost_price: 52.0,
      warehouse_stock: 130,
      min_stock: 20,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDv8lomGLLhZzvdlblRLkcQR30Cj-tqLYBNRbv3yUoFvVd-8mauiLl8XEHGP0KgyjoT4XCP1U9-AUa8k6bcJZ7ALFxcOy3yX35-wbHS12XRhMZDZwFhQE2B5myIry9ynDYYaOhXGHy40cojuBEAOFtf-xrSh-qZ_jDMzCi1Tvg04MY_ui2Maom4F735TwAkt7Ssph6xPDXVkqXgAssEuGaP8uAphykL3GE7ZoKZ2fZ7_QpBMid77g',
      is_promo: 0,
    },
  ],
  clients: [
    {
      id: 1,
      person_type: 'PJ',
      company_name: 'Detailer Master Estética Automotiva LTDA',
      trade_name: 'Detailer Master Estética',
      cnpj: '34.892.110/0001-45',
      state_registration: '112.983.450.119',
      segment: 'Estética Automotiva',
      tier: 'VIP • Ouro',
      status: 'Ativo',
      zip_code: '04794-000',
      street: 'Av. das Nações Unidas',
      address_number: '14200',
      complement: 'Galpão 3',
      address: 'Av. das Nações Unidas, 14.200',
      neighborhood: 'Santo Amaro',
      city: 'São Paulo',
      state: 'SP',
      region: 'Zona Sul',
      contact_name: 'Marcos Oliveira',
      contact_role: 'Gerente de Compras • Decisor',
      phone: '11987654321',
      whatsapp: '5511987654321',
      email: 'compras@detailermaster.com.br',
      credit_limit: 15000,
      credit_used: 6840,
      payment_terms: '28 / 35 / 42 DDL',
      avg_monthly_ticket: 4250,
      last_purchase_date: '18/10/2024',
      last_purchase_value: 3840,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBu6T8Su23NzYXOyaWUTrmY6xMvD7EUSR-7gjaPpPK6lpFKuplVURqB0GsMGnV-Ar9mvJsEceZtvGp6xY9c-Ni4qiohy3VSEB2wqjM6C9nE0Mv3SNFOGsBmxJ7oYzn9HfKaP7kL3Rvs64PBebd_q1aQ9eVZsaIR5QE4Esq9NP9mr2EaFvlTafxZxsnZZ4wVjgKxBPdY0s3sYHbmmdXHMdSIn4OAghgcfQ4QZVMU_B8_2Gd06gE83A',
      notes:
        'Marcos relatou alta procura por vitrificadores e pretinho gel resistente à chuva. Demonstrado lote novo da linha SiO2.',
    },
    {
      id: 2,
      person_type: 'PJ',
      company_name: 'Lava-Rápido & Estética Ducha de Ouro LTDA',
      trade_name: 'Ducha de Ouro Lava-Rápido',
      cnpj: '19.450.882/0001-12',
      state_registration: '145.221.908.110',
      segment: 'Lava-Rápido',
      tier: 'Cliente Prata',
      status: 'Inativo +30d',
      zip_code: '03104-003',
      street: 'Rua da Mooca',
      address_number: '2840',
      complement: '',
      address: 'Rua da Mooca, 2.840',
      neighborhood: 'Mooca',
      city: 'São Paulo',
      state: 'SP',
      region: 'Zona Leste',
      contact_name: 'Roberto Mendes',
      contact_role: 'Proprietário',
      phone: '11988887777',
      whatsapp: '5511988887777',
      email: 'contato@duchadeouro.com.br',
      credit_limit: 8000,
      credit_used: 1950,
      payment_terms: 'Boleto 28 Dias',
      avg_monthly_ticket: 2100,
      last_purchase_date: '16/09/2024',
      last_purchase_value: 1950,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC9Xs7nDiPxRxy8mOxM3HWdjVVVeYSJPEB4HEN7Ie_PbrXCF7uQ9XG0OT8O4T38HMqAMvz7jdxJBqemOptvC7-krnpxR76pkCXxC_mx2R6MAxS7EUMk-mZN8QnuyGrrMWZtG1EbdU8Pa5T1lZYRTgFUyrtg5Q9GOgMkzKjvvajzGsASwid9Un4hkEtRm7sJcZNsgE4kosKbjz3CNJhYbxJ51a9D1W-Z1zYfbf76WOUeQBKh_lzUSg',
      notes: 'Giro estimado esgotado há 8 dias (Shampoo com Cera 20L + Pretinho Pneu).',
    },
    {
      id: 3,
      person_type: 'PJ',
      company_name: 'Centro Automotivo SpeedCar Concessionária S.A.',
      trade_name: 'SpeedCar Concessionária',
      cnpj: '08.123.456/0001-99',
      state_registration: '244.819.002.115',
      segment: 'Concessionária',
      tier: 'VIP • Ouro',
      status: 'Ativo',
      zip_code: '13025-320',
      street: 'Av. Norte-Sul',
      address_number: '1550',
      complement: 'Pátio B',
      address: 'Av. Norte-Sul, 1.550',
      neighborhood: 'Cambuí',
      city: 'Campinas',
      state: 'SP',
      region: 'Interior SP',
      contact_name: 'Fernanda Costa',
      contact_role: 'Suprimentos & Pátio',
      phone: '1932001122',
      whatsapp: '5519991234567',
      email: 'suprimentos@speedcar.com.br',
      credit_limit: 25000,
      credit_used: 7200,
      payment_terms: '28 / 42 / 56 DDL',
      avg_monthly_ticket: 7800,
      last_purchase_date: '21/10/2024',
      last_purchase_value: 7200,
      image_url:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuA64fFnbMsjs2Uu_jGxTh7z5xJz7YhBcRKYZ4UtnB5_S_CEX8-m0FGVpEaDBKARsVXemi8bAsOdBllZZpg5GgbZriL9cgi2NoDEoKuymubZezLkCD-oE_g1t1cEeurHIEzppUavsAIah9Jll5GmTBirUgqa2f6DM11rluxqJuFEsHDrM2sCERQEA3rw8GQVWlSUlmELw02yjC8Ejs2ZR_wY5eZ1JWlMRgwcl0-r7xrSpqwq_MtCSQ',
      notes: 'Concessionária de alto volume.',
    },
  ],
  vehicles: [
    {
      id: 1,
      plate: 'EVX-4A89',
      model: 'Fiat Fiorino Endurance 1.4 Flex',
      brand: 'Fiat',
      year: 2024,
      type: 'Furgão Pronta-Entrega',
      driver_name: 'Carlos Silva',
      driver_phone: '(11) 98765-4321',
      route_region: 'Grande SP • Zona Sul & Santo Amaro',
      status: 'Em Rota',
      current_km: 18420,
      next_maintenance_km: 20000,
      fuel_level: 88,
      max_load_kg: 650,
      last_load_date: 'Hoje às 07:30h',
      notes: 'Veículo equipado com prateleiras químicas homologadas para pronta-entrega.',
      image_url:
        'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 2,
      plate: 'EVX-9B21',
      model: 'Renault Master Furgão L2H2 2.3 dCi',
      brand: 'Renault',
      year: 2023,
      type: 'VUC Distribuição Pesada',
      driver_name: 'Marcos Rocha',
      driver_phone: '(11) 97654-3210',
      route_region: 'Interior SP • Campinas & Jundiaí',
      status: 'Em Rota',
      current_km: 42890,
      next_maintenance_km: 50000,
      fuel_level: 72,
      max_load_kg: 1500,
      last_load_date: 'Hoje às 06:45h',
      notes: 'Furgão de grande porte focado em bombonas de 20L e 50L.',
      image_url:
        'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 3,
      plate: 'EVX-2C77',
      model: 'VW Saveiro Robust Cabine Dupla 1.6',
      brand: 'Volkswagen',
      year: 2024,
      type: 'Utilitário Demonstração Técnica',
      driver_name: 'André Souza',
      driver_phone: '(11) 96543-2109',
      route_region: 'Grande SP • Zona Leste & ABC',
      status: 'Na Base',
      current_km: 12150,
      next_maintenance_km: 20000,
      fuel_level: 100,
      max_load_kg: 600,
      last_load_date: 'Ontem às 18:00h',
      notes: 'Utilitário com capota marítima e kit completo de polimento.',
      image_url:
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 4,
      plate: 'EVX-7D55',
      model: 'Chevrolet Montana Premier 1.2 Turbo',
      brand: 'Chevrolet',
      year: 2024,
      type: 'Carro Representante VIP',
      driver_name: 'Administrador Evoluxx',
      driver_phone: '(11) 99999-0000',
      route_region: 'Atendimento Contas Key Account',
      status: 'Na Base',
      current_km: 8340,
      next_maintenance_km: 10000,
      fuel_level: 95,
      max_load_kg: 500,
      last_load_date: 'Hoje às 08:00h',
      notes: 'Veículo da diretoria comercial com mostruário premium.',
      image_url:
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80',
    },
  ],
  vehicle_inventory: [
    { id: 1, vehicle_id: 1, product_id: 1, quantity: 24, min_quantity: 6 },
    { id: 2, vehicle_id: 1, product_id: 2, quantity: 18, min_quantity: 5 },
    { id: 3, vehicle_id: 1, product_id: 3, quantity: 20, min_quantity: 5 },
    { id: 4, vehicle_id: 1, product_id: 4, quantity: 8, min_quantity: 2 },
    { id: 5, vehicle_id: 1, product_id: 7, quantity: 10, min_quantity: 3 },
    { id: 6, vehicle_id: 2, product_id: 1, quantity: 45, min_quantity: 10 },
    { id: 7, vehicle_id: 2, product_id: 4, quantity: 25, min_quantity: 8 },
    { id: 8, vehicle_id: 2, product_id: 5, quantity: 20, min_quantity: 6 },
    { id: 9, vehicle_id: 2, product_id: 6, quantity: 30, min_quantity: 8 },
    { id: 10, vehicle_id: 3, product_id: 1, quantity: 15, min_quantity: 5 },
    { id: 11, vehicle_id: 3, product_id: 2, quantity: 12, min_quantity: 4 },
    { id: 12, vehicle_id: 4, product_id: 2, quantity: 15, min_quantity: 4 },
    { id: 13, vehicle_id: 4, product_id: 7, quantity: 20, min_quantity: 5 },
  ],
  vehicle_logs: [
    {
      id: 1,
      vehicle_id: 1,
      log_type: 'Carga de Estoque',
      description: 'Carregamento matinal no CD Matriz: +24 Galões Shampoo 5L e +18 Ceras SiO2',
      cost: 0,
      km_recorded: 18380,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      vehicle_id: 2,
      log_type: 'Saída em Rota',
      description: 'Saída para rota Campinas / Rod. Bandeirantes com carga pesada 20L',
      cost: 0,
      km_recorded: 42810,
      created_at: new Date().toISOString(),
    },
  ],
  orders: [
    {
      id: 1,
      order_number: '4782',
      client_id: 1,
      vehicle_id: 1,
      seller_name: 'Carlos Silva',
      status: 'Entregue',
      sale_type: 'Pronta-Entrega (Estoque Carro)',
      payment_method: 'Boleto Faturado 28 Dias',
      subtotal: 4042.1,
      discount_percent: 5,
      discount_value: 202.1,
      shipping_cost: 0,
      total: 3840.0,
      nfe_number: 'NF-e 89.201',
      notes: 'Pedido mensal linha estética pesada.',
      created_at: new Date().toISOString(),
      items: [
        { product_id: 1, quantity: 20, unit_price: 68.5, subtotal: 1370 },
        { product_id: 2, quantity: 12, unit_price: 89.9, subtotal: 1078.8 },
        { product_id: 3, quantity: 12, unit_price: 74.0, subtotal: 888 },
      ],
    },
    {
      id: 2,
      order_number: '4755',
      client_id: 3,
      vehicle_id: 2,
      seller_name: 'Administrador Evoluxx',
      status: 'Faturado',
      sale_type: 'Reposição Programada',
      payment_method: 'Boleto Faturado 14/28/42 Dias',
      subtotal: 7185.0,
      discount_percent: 0,
      discount_value: 0,
      shipping_cost: 0,
      total: 7185.0,
      nfe_number: 'NF-e 89.088',
      notes: 'Entrega com Renault Master EVX-9B21 em Campinas.',
      created_at: new Date().toISOString(),
      items: [
        { product_id: 5, quantity: 15, unit_price: 215.0, subtotal: 3225 },
        { product_id: 6, quantity: 20, unit_price: 198.0, subtotal: 3960 },
      ],
    },
  ],
  visits: [
    {
      id: 1,
      client_id: 1,
      vehicle_id: 1,
      scheduled_date: 'Hoje',
      scheduled_time: '10:30h • Em 45 min',
      distance_km: 3.2,
      status: 'Pendente',
      purpose: 'Reposição: Shampoo Neutro 5L, Cera SiO2 e Pretinho Gel direto da Fiorino EVX-4A89',
      notes: 'Levar amostras do Vitrificador 9H.',
      checked_in_at: '',
    },
    {
      id: 2,
      client_id: 2,
      vehicle_id: 3,
      scheduled_date: 'Hoje',
      scheduled_time: '14:00h • Tarde',
      distance_km: 5.7,
      status: 'Pendente',
      purpose: 'Reativação de cliente inativo (+30 dias) com oferta promocional de Galões 5L',
      notes: '',
      checked_in_at: '',
    },
  ],
};

const FALLBACK_FILE = path.resolve(process.cwd(), 'fallback-store.json');

export function getFallbackStore(): typeof INITIAL_SEED {
  try {
    if (fs.existsSync(FALLBACK_FILE)) {
      return JSON.parse(fs.readFileSync(FALLBACK_FILE, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return JSON.parse(JSON.stringify(INITIAL_SEED));
}

export function saveFallbackStore(store: typeof INITIAL_SEED) {
  try {
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}
