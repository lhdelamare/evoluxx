-- ==========================================================
-- EVOLUXX AUTOGEST B2B - SCRIPT DE CRIAÇÃO DO BANCO MYSQL
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `evoluxx_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `evoluxx_db`;

-- 1. Tabela de Usuários
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `role` VARCHAR(100) DEFAULT 'Administrador',
  `region` VARCHAR(100) DEFAULT 'Grande SP • Matriz Evoluxx',
  `avatar` TEXT,
  `monthly_goal` DECIMAL(12,2) DEFAULT 110000.00,
  `commission_rate` DECIMAL(5,2) DEFAULT 5.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabela de Clientes (PJ e PF + Endereço por CEP)
CREATE TABLE IF NOT EXISTS `clients` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `person_type` VARCHAR(10) DEFAULT 'PJ',
  `company_name` VARCHAR(200) NOT NULL,
  `trade_name` VARCHAR(200) NOT NULL,
  `cnpj` VARCHAR(30) NOT NULL,
  `state_registration` VARCHAR(40) DEFAULT 'Isento',
  `segment` VARCHAR(100) DEFAULT 'Estética Automotiva',
  `tier` VARCHAR(50) DEFAULT 'Cliente Ouro',
  `status` VARCHAR(50) DEFAULT 'Ativo',
  `zip_code` VARCHAR(20) DEFAULT '04794-000',
  `street` VARCHAR(200) DEFAULT '',
  `address_number` VARCHAR(30) DEFAULT '',
  `complement` VARCHAR(100) DEFAULT '',
  `address` VARCHAR(255) NOT NULL,
  `neighborhood` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(10) DEFAULT 'SP',
  `region` VARCHAR(100) DEFAULT 'Zona Sul',
  `contact_name` VARCHAR(150) NOT NULL,
  `contact_role` VARCHAR(100) DEFAULT 'Gerente de Compras',
  `phone` VARCHAR(30) NOT NULL,
  `whatsapp` VARCHAR(30) NOT NULL,
  `email` VARCHAR(150) DEFAULT '',
  `credit_limit` DECIMAL(12,2) DEFAULT 15000.00,
  `credit_used` DECIMAL(12,2) DEFAULT 0.00,
  `payment_terms` VARCHAR(100) DEFAULT '28 / 35 / 42 DDL',
  `avg_monthly_ticket` DECIMAL(12,2) DEFAULT 4250.00,
  `last_purchase_date` VARCHAR(30) DEFAULT '',
  `last_purchase_value` DECIMAL(12,2) DEFAULT 0.00,
  `image_url` TEXT,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabela de Produtos Automotivos
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `packaging` VARCHAR(80) NOT NULL,
  `dilution` VARCHAR(80) DEFAULT 'Pronto Uso',
  `description` TEXT,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `warehouse_stock` INT NOT NULL DEFAULT 100,
  `min_stock` INT NOT NULL DEFAULT 20,
  `image_url` TEXT,
  `is_promo` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabela de Veículos da Frota (Carros)
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plate` VARCHAR(20) NOT NULL UNIQUE,
  `model` VARCHAR(150) NOT NULL,
  `brand` VARCHAR(80) NOT NULL,
  `year` INT NOT NULL DEFAULT 2024,
  `type` VARCHAR(80) DEFAULT 'Furgão Pronta-Entrega',
  `driver_name` VARCHAR(150) NOT NULL,
  `driver_phone` VARCHAR(40) DEFAULT '(11) 99876-5432',
  `route_region` VARCHAR(100) DEFAULT 'Grande SP - Zona Sul',
  `status` VARCHAR(50) DEFAULT 'Em Rota',
  `current_km` INT DEFAULT 24500,
  `next_maintenance_km` INT DEFAULT 30000,
  `fuel_level` INT DEFAULT 85,
  `max_load_kg` INT DEFAULT 650,
  `last_load_date` VARCHAR(40) DEFAULT '',
  `notes` TEXT,
  `image_url` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabela de Estoque Embarcado em Cada Carro (Quais produtos estão em cada carro)
CREATE TABLE IF NOT EXISTS `vehicle_inventory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vehicle_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `min_quantity` INT NOT NULL DEFAULT 5,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_vehicle_product` (`vehicle_id`, `product_id`),
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabela de Histórico / Diário de Bordo dos Carros
CREATE TABLE IF NOT EXISTS `vehicle_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vehicle_id` INT NOT NULL,
  `log_type` VARCHAR(80) NOT NULL,
  `description` TEXT NOT NULL,
  `cost` DECIMAL(10,2) DEFAULT 0.00,
  `km_recorded` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Tabela de Pedidos B2B & Pronta-Entrega
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(40) NOT NULL,
  `client_id` INT NOT NULL,
  `vehicle_id` INT NULL,
  `seller_name` VARCHAR(150) DEFAULT 'Administrador',
  `status` VARCHAR(50) DEFAULT 'Faturado',
  `sale_type` VARCHAR(80) DEFAULT 'Venda Direta Externa',
  `payment_method` VARCHAR(120) DEFAULT 'Boleto Faturado 28 Dias',
  `subtotal` DECIMAL(12,2) NOT NULL,
  `discount_percent` DECIMAL(5,2) DEFAULT 0.00,
  `discount_value` DECIMAL(12,2) DEFAULT 0.00,
  `shipping_cost` DECIMAL(10,2) DEFAULT 0.00,
  `total` DECIMAL(12,2) NOT NULL,
  `nfe_number` VARCHAR(50) DEFAULT '',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Tabela de Rotas de Visita & Check-ins
CREATE TABLE IF NOT EXISTS `visits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `client_id` INT NOT NULL,
  `vehicle_id` INT NULL,
  `scheduled_date` VARCHAR(30) NOT NULL,
  `scheduled_time` VARCHAR(20) NOT NULL,
  `distance_km` DECIMAL(6,1) DEFAULT 3.5,
  `status` VARCHAR(50) DEFAULT 'Pendente',
  `purpose` VARCHAR(255) NOT NULL,
  `notes` TEXT,
  `checked_in_at` VARCHAR(40) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Criação do Usuário Administrador Padrão
INSERT IGNORE INTO `users` (`username`, `email`, `password`, `name`, `role`, `region`, `monthly_goal`, `commission_rate`)
VALUES (
  'administrador',
  'administrador@evoluxx.com.br',
  'admin123',
  'Administrador Evoluxx',
  'Diretor Comercial & Frota',
  'Grande SP • Matriz Evoluxx',
  110000.00,
  5.00
);
