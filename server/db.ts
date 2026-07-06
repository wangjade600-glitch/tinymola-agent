import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcryptjs from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "tinymola.db");
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ======================== 初始化数据库表 ========================
db.exec(`
  -- 用户表（商家管理员 + 经销商客户）
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
    display_name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- 经销商客户扩展信息
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    company_name TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    address TEXT,
    prepaid_balance REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 产品表
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    weight REAL DEFAULT 0,
    unit_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- 运费模板表
  CREATE TABLE IF NOT EXISTS shipping_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name TEXT NOT NULL,
    zone_label TEXT NOT NULL,
    provinces TEXT NOT NULL,
    first_weight REAL NOT NULL DEFAULT 1,
    first_price REAL NOT NULL,
    additional_price REAL NOT NULL,
    packing_fee REAL NOT NULL DEFAULT 2,
    is_default INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- 订单主表
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    recipient_province TEXT NOT NULL,
    recipient_city TEXT NOT NULL DEFAULT '',
    recipient_district TEXT NOT NULL DEFAULT '',
    recipient_address TEXT NOT NULL,
    shipping_zone TEXT NOT NULL,
    shipping_method TEXT NOT NULL CHECK (shipping_method IN ('standard', 'sf_air')),
    total_weight REAL DEFAULT 0,
    shipping_fee REAL DEFAULT 0,
    packing_fee REAL DEFAULT 0,
    product_total REAL DEFAULT 0,
    order_total REAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    tracking_number TEXT DEFAULT '',
    logistics_company TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  -- 订单明细行
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    unit_weight REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  -- 预存款流水台账
  CREATE TABLE IF NOT EXISTS prepaid_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('recharge', 'deduct', 'refund', 'adjust')),
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    order_id INTEGER,
    note TEXT DEFAULT '',
    operator_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (operator_id) REFERENCES users(id)
  );

  -- 库存变动日志
  CREATE TABLE IF NOT EXISTS inventory_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    product_code TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('in', 'out', 'adjust', 'init')),
    change_quantity INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    order_id INTEGER,
    note TEXT DEFAULT '',
    operator_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (operator_id) REFERENCES users(id)
  );

  -- 创建索引
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
  CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
  CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_prepaid_customer_id ON prepaid_transactions(customer_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_logs(product_id);
`);

// ======================== 类型定义 ========================
export interface User {
  id: number;
  username: string;
  password_hash: string;
  role: "admin" | "customer";
  display_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  user_id: number;
  company_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  address: string | null;
  prepaid_balance: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  weight: number;
  unit_price: number;
  cost_price: number;
  stock: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ShippingTemplate {
  id: number;
  zone_name: string;
  zone_label: string;
  provinces: string;
  first_weight: number;
  first_price: number;
  additional_price: number;
  packing_fee: number;
  is_default: number;
  sort_order: number;
  updated_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_province: string;
  recipient_city: string;
  recipient_district: string;
  recipient_address: string;
  shipping_zone: string;
  shipping_method: "standard" | "sf_air";
  total_weight: number;
  shipping_fee: number;
  packing_fee: number;
  product_total: number;
  order_total: number;
  status: string;
  tracking_number: string;
  logistics_company: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_weight: number;
  subtotal: number;
}

export interface PrepaidTransaction {
  id: number;
  customer_id: number;
  type: "recharge" | "deduct" | "refund" | "adjust";
  amount: number;
  balance_after: number;
  order_id: number | null;
  note: string;
  operator_id: number | null;
  created_at: string;
}

export interface InventoryLog {
  id: number;
  product_id: number;
  product_code: string;
  change_type: "in" | "out" | "adjust" | "init";
  change_quantity: number;
  stock_after: number;
  order_id: number | null;
  note: string;
  operator_id: number | null;
  created_at: string;
}

// ======================== 用户操作 ========================
export function getUserByUsername(username: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function createUser(user: Omit<User, "id" | "created_at" | "updated_at">): User {
  const stmt = db.prepare(
    "INSERT INTO users (username, password_hash, role, display_name, phone, status) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const result = stmt.run(user.username, user.password_hash, user.role, user.display_name, user.phone || null, user.status || "active");
  return getUserById(result.lastInsertRowid as number)!;
}

export function updateUserStatus(id: number, status: string): boolean {
  const r = db.prepare("UPDATE users SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(status, id);
  return r.changes > 0;
}

export function getAllCustomers(): any[] {
  return db.prepare(`
    SELECT c.*, u.username, u.display_name, u.phone, u.status as user_status
    FROM customers c JOIN users u ON c.user_id = u.id
    WHERE u.role = 'customer'
    ORDER BY c.created_at DESC
  `).all();
}

export function getCustomerByUserId(userId: number): any | undefined {
  return db.prepare(`
    SELECT c.*, u.username, u.display_name, u.phone, u.status as user_status
    FROM customers c JOIN users u ON c.user_id = u.id
    WHERE c.user_id = ?
  `).get(userId);
}

export function getCustomerById(id: number): Customer | undefined {
  return db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as Customer | undefined;
}

export function createCustomer(data: {
  user_id: number;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  address: string;
  prepaid_balance?: number;
}): Customer {
  const stmt = db.prepare(
    "INSERT INTO customers (user_id, company_name, contact_name, contact_phone, address, prepaid_balance) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const r = stmt.run(data.user_id, data.company_name, data.contact_name, data.contact_phone, data.address, data.prepaid_balance || 0);
  return getCustomerById(r.lastInsertRowid as number)!;
}

export function updateCustomerBalance(customerId: number, amount: number): boolean {
  const r = db.prepare("UPDATE customers SET prepaid_balance = prepaid_balance + ?, updated_at = datetime('now','localtime') WHERE id = ?").run(amount, customerId);
  return r.changes > 0;
}

export function updateCustomer(id: number, data: Partial<Pick<Customer, "company_name" | "contact_name" | "contact_phone" | "address">>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.company_name !== undefined) { fields.push("company_name = ?"); values.push(data.company_name); }
  if (data.contact_name !== undefined) { fields.push("contact_name = ?"); values.push(data.contact_name); }
  if (data.contact_phone !== undefined) { fields.push("contact_phone = ?"); values.push(data.contact_phone); }
  if (data.address !== undefined) { fields.push("address = ?"); values.push(data.address); }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now','localtime')");
  values.push(id);
  const r = db.prepare(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return r.changes > 0;
}

// ======================== 产品操作 ========================
export function getAllProducts(search?: string): Product[] {
  let sql = "SELECT * FROM products WHERE status = 'active'";
  if (search) sql += " AND (code LIKE ? OR name LIKE ?)";
  sql += " ORDER BY code ASC";
  if (search) {
    const q = `%${search}%`;
    return db.prepare(sql).all(q, q) as Product[];
  }
  return db.prepare(sql).all() as Product[];
}

export function getProductById(id: number): Product | undefined {
  return db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;
}

export function getProductByCode(code: string): Product | undefined {
  return db.prepare("SELECT * FROM products WHERE code = ?").get(code) as Product | undefined;
}

export function createProduct(data: Omit<Product, "id" | "created_at" | "updated_at">): Product {
  const stmt = db.prepare(
    "INSERT INTO products (code, name, weight, unit_price, cost_price, stock, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const r = stmt.run(data.code, data.name, data.weight, data.unit_price, data.cost_price, data.stock, data.status || "active");
  const product = getProductById(r.lastInsertRowid as number)!;

  // 库存初始化日志
  if (data.stock > 0) {
    db.prepare("INSERT INTO inventory_logs (product_id, product_code, change_type, change_quantity, stock_after, note) VALUES (?, ?, 'init', ?, ?, '初始库存')")
      .run(product.id, product.code, data.stock, data.stock);
  }
  return product;
}

export function updateProduct(id: number, data: Partial<Pick<Product, "name" | "weight" | "unit_price" | "cost_price" | "stock" | "status">>): boolean {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
  if (data.weight !== undefined) { fields.push("weight = ?"); values.push(data.weight); }
  if (data.unit_price !== undefined) { fields.push("unit_price = ?"); values.push(data.unit_price); }
  if (data.cost_price !== undefined) { fields.push("cost_price = ?"); values.push(data.cost_price); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if (fields.length === 0 && data.stock === undefined) return false;
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now','localtime')");
    values.push(id);
    db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }
  return true;
}

export function updateProductStock(productId: number, changeQuantity: number, changeType: string, orderId?: number, note?: string): boolean {
  const r = db.prepare("UPDATE products SET stock = stock + ?, updated_at = datetime('now','localtime') WHERE id = ?").run(changeQuantity, productId);
  if (r.changes === 0) return false;

  const product = getProductById(productId)!;
  db.prepare(
    "INSERT INTO inventory_logs (product_id, product_code, change_type, change_quantity, stock_after, order_id, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(productId, product.code, changeType, changeQuantity, product.stock, orderId || null, note || "");
  return true;
}

// ======================== 运费模板 ========================
export function getShippingTemplates(): ShippingTemplate[] {
  return db.prepare("SELECT * FROM shipping_templates ORDER BY sort_order ASC").all() as ShippingTemplate[];
}

export function updateShippingTemplate(id: number, data: { first_price: number; additional_price: number; packing_fee: number }): boolean {
  const r = db.prepare(
    "UPDATE shipping_templates SET first_price = ?, additional_price = ?, packing_fee = ?, updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(data.first_price, data.additional_price, data.packing_fee, id);
  return r.changes > 0;
}

// 根据省份查找运费分区
export function findShippingZone(province: string, method: "standard" | "sf_air"): ShippingTemplate | undefined {
  if (method === "sf_air") {
    return {
      id: 0, zone_name: "sf_air", zone_label: "顺丰空运", provinces: "全部",
      first_weight: 1, first_price: 23, additional_price: 15, packing_fee: 2, is_default: 1, sort_order: 99,
      updated_at: ""
    };
  }
  const templates = db.prepare("SELECT * FROM shipping_templates WHERE is_default = 0 AND zone_name != 'sf_air' ORDER BY sort_order ASC").all() as ShippingTemplate[];
  for (const t of templates) {
    const provs = t.provinces.split(" / ").map(s => s.trim());
    for (const p of provs) {
      if (province.includes(p) || p.includes(province)) return t;
    }
  }
  return undefined;
}

// ======================== 订单操作 ========================
export function createOrderNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(2);
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const count = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE created_at LIKE ?").get(`${date.getFullYear()}-${m}-${d}%`) as any).cnt + 1;
  return `TM${y}${m}${d}${count.toString().padStart(4, "0")}`;
}

export function createOrder(data: {
  customer_id: number;
  customer_name: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_province: string;
  recipient_city: string;
  recipient_district: string;
  recipient_address: string;
  shipping_zone: string;
  shipping_method: "standard" | "sf_air";
  total_weight: number;
  shipping_fee: number;
  packing_fee: number;
  product_total: number;
  order_total: number;
  note?: string;
  items: { product_code: string; product_name: string; quantity: number; unit_price: number; unit_weight: number }[];
}): Order {
  const orderNumber = createOrderNumber();

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_number, customer_id, customer_name, recipient_name, recipient_phone,
      recipient_province, recipient_city, recipient_district, recipient_address,
      shipping_zone, shipping_method, total_weight, shipping_fee, packing_fee,
      product_total, order_total, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = insertOrder.run(
    orderNumber, data.customer_id, data.customer_name,
    data.recipient_name, data.recipient_phone,
    data.recipient_province, data.recipient_city, data.recipient_district, data.recipient_address,
    data.shipping_zone, data.shipping_method,
    data.total_weight, data.shipping_fee, data.packing_fee,
    data.product_total, data.order_total, data.note || ""
  );

  const orderId = result.lastInsertRowid as number;

  // 插入明细
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_code, product_name, quantity, unit_price, unit_weight, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  for (const item of data.items) {
    insertItem.run(orderId, item.product_code, item.product_name, item.quantity, item.unit_price, item.unit_weight, item.quantity * item.unit_price);
  }

  return getOrderById(orderId)!;
}

export function getOrderById(id: number): (Order & { items: OrderItem[] }) | undefined {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Order | undefined;
  if (!order) return undefined;
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(id) as OrderItem[];
  return { ...order, items };
}

export function getOrdersByCustomer(customerId: number, filters?: { status?: string; keyword?: string; startDate?: string; endDate?: string }): Order[] {
  let sql = "SELECT * FROM orders WHERE customer_id = ?";
  const params: any[] = [customerId];

  if (filters?.status && filters.status !== "all") { sql += " AND status = ?"; params.push(filters.status); }
  if (filters?.keyword) { sql += " AND (order_number LIKE ? OR recipient_name LIKE ?)"; params.push(`%${filters.keyword}%`, `%${filters.keyword}%`); }
  if (filters?.startDate) { sql += " AND created_at >= ?"; params.push(filters.startDate); }
  if (filters?.endDate) { sql += " AND created_at <= ?"; params.push(filters.endDate + " 23:59:59"); }

  sql += " ORDER BY created_at DESC";
  return db.prepare(sql).all(...params) as Order[];
}

export function getAllOrders(filters?: {
  customer_id?: number; status?: string; keyword?: string; startDate?: string; endDate?: string;
  province?: string; page?: number; pageSize?: number;
}): { orders: Order[]; total: number } {
  let where = "WHERE 1=1";
  const params: any[] = [];

  if (filters?.customer_id) { where += " AND customer_id = ?"; params.push(filters.customer_id); }
  if (filters?.status && filters.status !== "all") { where += " AND status = ?"; params.push(filters.status); }
  if (filters?.keyword) { where += " AND (order_number LIKE ? OR recipient_name LIKE ? OR customer_name LIKE ?)"; const q = `%${filters.keyword}%`; params.push(q, q, q); }
  if (filters?.startDate) { where += " AND created_at >= ?"; params.push(filters.startDate); }
  if (filters?.endDate) { where += " AND created_at <= ?"; params.push(filters.endDate + " 23:59:59"); }
  if (filters?.province) { where += " AND recipient_province LIKE ?"; params.push(`%${filters.province}%`); }

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM orders ${where}`).get(...params) as any).cnt;

  let sql = `SELECT * FROM orders ${where} ORDER BY created_at DESC`;
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  sql += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;

  const orders = db.prepare(sql).all(...params) as Order[];
  return { orders, total };
}

export function updateOrderStatus(id: number, status: string): boolean {
  const r = db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?").run(status, id);
  return r.changes > 0;
}

export function updateOrderLogistics(id: number, trackingNumber: string, company: string): boolean {
  const r = db.prepare(
    "UPDATE orders SET tracking_number = ?, logistics_company = ?, status = 'shipped', updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(trackingNumber, company, id);
  return r.changes > 0;
}

// ======================== 预存款操作 ========================
export function getPrepaidTransactions(customerId: number): PrepaidTransaction[] {
  return db.prepare(
    "SELECT * FROM prepaid_transactions WHERE customer_id = ? ORDER BY created_at DESC"
  ).all(customerId) as PrepaidTransaction[];
}

export function createPrepaidTransaction(data: {
  customer_id: number; type: string; amount: number; balance_after: number;
  order_id?: number; note?: string; operator_id?: number;
}): PrepaidTransaction {
  const stmt = db.prepare(
    "INSERT INTO prepaid_transactions (customer_id, type, amount, balance_after, order_id, note, operator_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const r = stmt.run(data.customer_id, data.type, data.amount, data.balance_after, data.order_id || null, data.note || "", data.operator_id || null);
  return db.prepare("SELECT * FROM prepaid_transactions WHERE id = ?").get(r.lastInsertRowid) as PrepaidTransaction;
}

// ======================== 库存日志 ========================
export function getInventoryLogs(productId?: number): InventoryLog[] {
  if (productId) {
    return db.prepare("SELECT * FROM inventory_logs WHERE product_id = ? ORDER BY created_at DESC").all(productId) as InventoryLog[];
  }
  return db.prepare("SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 500").all() as InventoryLog[];
}

// ======================== 仪表盘统计 ========================
export function getDashboardStats() {
  const stats: any = {};

  stats.totalCustomers = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'customer' AND status = 'active'").get() as any).cnt;
  stats.totalProducts = (db.prepare("SELECT COUNT(*) as cnt FROM products WHERE status = 'active'").get() as any).cnt;
  stats.totalOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders").get() as any).cnt;
  stats.pendingOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'pending'").get() as any).cnt;
  stats.shippedOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'shipped'").get() as any).cnt;
  
  const today = new Date().toISOString().slice(0, 10);
  stats.todayOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE created_at LIKE ?").get(`${today}%`) as any).cnt;
  stats.todayRevenue = (db.prepare("SELECT COALESCE(SUM(order_total), 0) as total FROM orders WHERE created_at LIKE ? AND status != 'cancelled'").get(`${today}%`) as any).total;
  stats.totalRevenue = (db.prepare("SELECT COALESCE(SUM(order_total), 0) as total FROM orders WHERE status != 'cancelled'").get() as any).total;
  
  const lowStock = db.prepare("SELECT COUNT(*) as cnt FROM products WHERE stock < 10 AND status = 'active'").get() as any;
  stats.lowStockCount = lowStock.cnt;

  return stats;
}

export function getCustomerDashboardStats(customerId: number) {
  const stats: any = {};
  stats.totalOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ?").get(customerId) as any).cnt;
  stats.pendingOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ? AND status = 'pending'").get(customerId) as any).cnt;
  stats.shippedOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ? AND status IN ('shipped', 'delivered')").get(customerId) as any).cnt;
  const today = new Date().toISOString().slice(0, 10);
  stats.todayOrders = (db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ? AND created_at LIKE ?").get(customerId, `${today}%`) as any).cnt;
  stats.totalSpent = (db.prepare("SELECT COALESCE(SUM(order_total), 0) as total FROM orders WHERE customer_id = ? AND status != 'cancelled'").get(customerId) as any).total;
  return stats;
}

// ======================== 初始化种子数据 ========================
export function seedDefaultData() {
  const hasUsers = (db.prepare("SELECT COUNT(*) as cnt FROM users").get() as any).cnt;
  if (hasUsers > 0) return;

  // 创建默认管理员
  const adminHash = bcryptjs.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role, display_name, phone) VALUES (?, ?, 'admin', ?, ?)").run("admin", adminHash, "管理员", "13800138000");

  // 创建示例经销商客户
  const customerHash = bcryptjs.hashSync("customer123", 10);
  db.prepare("INSERT INTO users (username, password_hash, role, display_name, phone) VALUES (?, ?, 'customer', ?, ?)").run("customer1", customerHash, "张三潜店", "13900139000");
  const custUser = getUserByUsername("customer1")!;
  db.prepare("INSERT INTO customers (user_id, company_name, contact_name, contact_phone, prepaid_balance) VALUES (?, ?, ?, ?, ?)").run(custUser.id, "三亚海豚潜水中心", "张三", "13900139000", 5000);

  // 运费模板种子数据
  const shippingData = [
    { zone_name: "zone1", zone_label: "一区（普通陆运）", provinces: "广东 / 江苏 / 浙江 / 上海 / 安徽 / 福建 / 广西 / 湖北 / 江西 / 湖南 / 山东 / 北京 / 天津 / 重庆 / 海南 / 贵州 / 河南 / 陕西 / 云南 / 四川 / 河北 / 山西", first_weight: 1, first_price: 8, additional_price: 4, packing_fee: 2, sort_order: 1 },
    { zone_name: "zone2", zone_label: "二区（普通陆运）", provinces: "黑龙江 / 吉林 / 辽宁", first_weight: 1, first_price: 13, additional_price: 7, packing_fee: 2, sort_order: 2 },
    { zone_name: "zone3", zone_label: "三区（普通陆运）", provinces: "内蒙古 / 宁夏 / 甘肃 / 青海 / 西藏 / 新疆", first_weight: 1, first_price: 15, additional_price: 10, packing_fee: 2, sort_order: 3 },
  ];

  const insertShipping = db.prepare(
    "INSERT INTO shipping_templates (zone_name, zone_label, provinces, first_weight, first_price, additional_price, packing_fee, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const s of shippingData) {
    insertShipping.run(s.zone_name, s.zone_label, s.provinces, s.first_weight, s.first_price, s.additional_price, s.packing_fee, s.sort_order);
  }

  // 示例产品
  const products = [
    { code: "AF-001", name: "Peletty 防雾贴（通用款）", weight: 0.05, unit_price: 28, cost_price: 12, stock: 500 },
    { code: "AF-002", name: "Peletty 防雾贴（加大款）", weight: 0.06, unit_price: 35, cost_price: 15, stock: 300 },
    { code: "MC-001", name: "磁吸扣套装（黑色）", weight: 0.15, unit_price: 68, cost_price: 32, stock: 200 },
    { code: "MC-002", name: "磁吸扣套装（彩色）", weight: 0.15, unit_price: 75, cost_price: 35, stock: 150 },
    { code: "MS-001", name: "近视镜片 -2.0", weight: 0.08, unit_price: 45, cost_price: 20, stock: 100 },
    { code: "MS-002", name: "近视镜片 -3.0", weight: 0.08, unit_price: 45, cost_price: 20, stock: 100 },
    { code: "MB-001", name: "面镜包（小号）", weight: 0.2, unit_price: 38, cost_price: 18, stock: 250 },
    { code: "MB-002", name: "面镜包（大号）", weight: 0.25, unit_price: 48, cost_price: 22, stock: 200 },
    { code: "RB-001", name: "调节器包", weight: 0.3, unit_price: 88, cost_price: 45, stock: 120 },
    { code: "NB-001", name: "网袋包（标准款）", weight: 0.35, unit_price: 58, cost_price: 28, stock: 180 },
  ];

  const insertProduct = db.prepare(
    "INSERT INTO products (code, name, weight, unit_price, cost_price, stock) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const p of products) {
    const r = insertProduct.run(p.code, p.name, p.weight, p.unit_price, p.cost_price, p.stock);
    if (p.stock > 0) {
      db.prepare("INSERT INTO inventory_logs (product_id, product_code, change_type, change_quantity, stock_after, note) VALUES (?, ?, 'init', ?, ?, '初始库存')")
        .run(r.lastInsertRowid, p.code, p.stock, p.stock);
    }
  }
}

export default db;
