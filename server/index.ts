import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "tinymola-agent-secret-key-2026";

// db instance shortcut for raw queries
const dbc = db.default;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ======================== Auth 中间件 ========================
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未登录，请先登录" });
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

function adminOnly(req: any, res: any, next: any) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "无权限" });
  }
  next();
}

// ======================== 认证路由 ========================
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "请输入用户名和密码" });
  }

  const user = db.getUserByUsername(username);
  if (!user || user.status === "disabled") {
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  if (!bcryptjs.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  let customerInfo = null;
  if (user.role === "customer") {
    customerInfo = db.getCustomerByUserId(user.id);
  }

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
      phone: user.phone,
      ...(customerInfo ? { customer: customerInfo } : {}),
    },
  });
});

app.get("/api/auth/me", authMiddleware, (req: any, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "用户不存在" });

  let customerInfo = null;
  if (user.role === "customer") {
    customerInfo = db.getCustomerByUserId(user.id);
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      display_name: user.display_name,
      phone: user.phone,
      ...(customerInfo ? { customer: customerInfo } : {}),
    },
  });
});

// ======================== 客户路由 ========================
// 获取用户信息
app.get("/api/customer/profile", authMiddleware, (req: any, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "无权限" });
  const info = db.getCustomerByUserId(req.user.id);
  if (!info) return res.status(404).json({ error: "客户信息不存在" });
  res.json({ customer: info });
});

// 获取产品列表
app.get("/api/customer/products", authMiddleware, (req: any, res) => {
  const search = req.query.search as string || "";
  const products = db.getAllProducts(search);
  res.json({ products });
});

// 获取运费模板
app.get("/api/customer/shipping", authMiddleware, (req: any, res) => {
  const templates = db.getShippingTemplates();
  // 追加顺丰
  templates.push({
    id: 0, zone_name: "sf_air", zone_label: "顺丰空运（全国统一）",
    provinces: "全国",
    first_weight: 1, first_price: 23, additional_price: 15,
    packing_fee: 2, is_default: 1, sort_order: 99,
    updated_at: ""
  });
  res.json({ templates });
});

// 运费计算
app.post("/api/customer/shipping/calculate", authMiddleware, (req: any, res) => {
  const { province, method, totalWeight } = req.body;
  if (!province || !method) {
    return res.status(400).json({ error: "请提供省份和运输方式" });
  }

  const zone = db.findShippingZone(province, method);
  if (!zone) {
    return res.status(400).json({ error: `未找到${province}的运费模板` });
  }

  const weight = Math.max(Number(totalWeight) || 0, 0);
  const firstW = zone.first_weight;
  const surplusWeight = Math.max(weight - firstW, 0);
  const shippingFee = zone.first_price + Math.ceil(surplusWeight) * zone.additional_price;
  const packingFee = zone.packing_fee;
  const totalFee = shippingFee + packingFee;

  res.json({
    zone: { id: zone.id, label: zone.zone_label, zone_name: zone.zone_name },
    totalWeight: weight,
    firstWeight: firstW,
    surplusWeight,
    shippingFee,
    packingFee,
    totalFee,
  });
});

// 获取订单列表
app.get("/api/customer/orders", authMiddleware, (req: any, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "无权限" });
  const customer = db.getCustomerByUserId(req.user.id);
  if (!customer) return res.status(404).json({ error: "客户不存在" });

  const orders = db.getOrdersByCustomer(customer.id, {
    status: req.query.status as string,
    keyword: req.query.keyword as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
  });
  res.json({ orders });
});

// 获取单个订单详情（含明细）
app.get("/api/customer/orders/:id", authMiddleware, (req: any, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "无权限" });
  const customer = db.getCustomerByUserId(req.user.id);
  if (!customer) return res.status(404).json({ error: "客户不存在" });

  const order = db.getOrderById(Number(req.params.id));
  if (!order || order.customer_id !== customer.id) {
    return res.status(404).json({ error: "订单不存在" });
  }
  res.json({ order });
});

// 下单
app.post("/api/customer/orders", authMiddleware, (req: any, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "无权限" });
  const customer = db.getCustomerByUserId(req.user.id);
  if (!customer) return res.status(404).json({ error: "客户不存在" });

  const {
    recipient_name, recipient_phone, recipient_province, recipient_city,
    recipient_district, recipient_address, shipping_method, shipping_zone,
    shipping_fee, packing_fee, product_total, order_total, total_weight,
    items, note,
  } = req.body;

  // 校验必填
  if (!recipient_name || !recipient_phone || !recipient_province || !recipient_address) {
    return res.status(400).json({ error: "请填写完整的收件信息" });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "请至少添加一个商品" });
  }

  // 余额检查
  if (customer.prepaid_balance < order_total) {
    return res.status(400).json({ error: `余额不足！当前余额 ¥${customer.prepaid_balance.toFixed(2)}，订单总额 ¥${order_total.toFixed(2)}` });
  }

  // 库存检查
  for (const item of items) {
    const product = db.getProductByCode(item.product_code);
    if (!product) {
      return res.status(400).json({ error: `产品 ${item.product_code} 不存在` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ error: `产品 ${item.product_code} "${product.name}" 库存不足，当前库存 ${product.stock}` });
    }
  }

  // 事务：创建订单 + 扣余额 + 扣库存
  const createOrderFn = dbc.transaction(() => {
    const order = db.createOrder({
      customer_id: customer.id,
      customer_name: customer.company_name || customer.contact_name || req.user.display_name,
      recipient_name, recipient_phone, recipient_province,
      recipient_city: recipient_city || "", recipient_district: recipient_district || "",
      recipient_address,
      shipping_zone: shipping_zone || "一区",
      shipping_method: shipping_method || "standard",
      total_weight: total_weight || 0,
      shipping_fee: shipping_fee || 0,
      packing_fee: packing_fee || 0,
      product_total: product_total || 0,
      order_total: order_total || 0,
      note,
      items: items.map((i: any) => ({
        product_code: i.product_code,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        unit_weight: i.unit_weight || 0,
      })),
    });

    // 扣余额
    db.updateCustomerBalance(customer.id, -order_total);
    db.createPrepaidTransaction({
      customer_id: customer.id,
      type: "deduct",
      amount: -order_total,
      balance_after: customer.prepaid_balance - order_total,
      order_id: order.id,
      note: `订单 ${order.order_number} 自动扣款`,
    });

    // 扣库存
    for (const item of items) {
      const product = db.getProductByCode(item.product_code)!;
      db.updateProductStock(product.id, -item.quantity, "out", order.id, `订单 ${order.order_number} 出库`);
    }

    return order;
  });

  try {
    const order = createOrderFn();
    res.json({ success: true, order, message: "下单成功" });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "下单失败" });
  }
});

// 预存款余额
app.get("/api/customer/balance", authMiddleware, (req: any, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "无权限" });
  const customer = db.getCustomerByUserId(req.user.id);
  if (!customer) return res.status(404).json({ error: "客户不存在" });

  const transactions = db.getPrepaidTransactions(customer.id);
  res.json({ balance: customer.prepaid_balance, transactions });
});

// 仪表盘
app.get("/api/customer/dashboard", authMiddleware, (req: any, res) => {
  if (req.user.role !== "customer") return res.status(403).json({ error: "无权限" });
  const customer = db.getCustomerByUserId(req.user.id);
  if (!customer) return res.status(404).json({ error: "客户不存在" });

  const stats = db.getCustomerDashboardStats(customer.id);
  const recentOrders = dbc.prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5").all(customer.id);
  res.json({ balance: customer.prepaid_balance, stats, recentOrders });
});

// ======================== 管理员路由 ========================
// 仪表盘
app.get("/api/admin/dashboard", authMiddleware, adminOnly, (req, res) => {
  const stats = db.getDashboardStats();
  const recentOrders = dbc.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 10").all();
  res.json({ stats, recentOrders });
});

// 客户管理
app.get("/api/admin/customers", authMiddleware, adminOnly, (req, res) => {
  const customers = db.getAllCustomers();
  res.json({ customers });
});

app.post("/api/admin/customers", authMiddleware, adminOnly, (req, res) => {
  const { username, password, display_name, phone, company_name, contact_name, contact_phone, address, prepaid_balance } = req.body;
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: "用户名、密码、显示名称为必填" });
  }

  const exists = db.getUserByUsername(username);
  if (exists) return res.status(400).json({ error: "用户名已存在" });

  const hash = bcryptjs.hashSync(password, 10);
  const user = db.createUser({ username, password_hash: hash, role: "customer", display_name, phone: phone || null, status: "active" });
  const customer = db.createCustomer({ user_id: user.id, company_name: company_name || "", contact_name: contact_name || "", contact_phone: contact_phone || "", address: address || "", prepaid_balance: prepaid_balance || 0 });

  if (prepaid_balance > 0) {
    db.createPrepaidTransaction({ customer_id: customer.id, type: "recharge", amount: prepaid_balance, balance_after: prepaid_balance, note: "开户充值" });
  }

  res.json({ user, customer });
});

app.put("/api/admin/customers/:id", authMiddleware, adminOnly, (req, res) => {
  const { company_name, contact_name, contact_phone, address, display_name, status } = req.body;
  const cid = Number(req.params.id);
  db.updateCustomer(cid, { company_name, contact_name, contact_phone, address });
  const customer = db.getCustomerById(cid);
  if (customer && (display_name || status)) {
    dbc.prepare("UPDATE users SET display_name = COALESCE(?, display_name), status = COALESCE(?, status) WHERE id = ?").run(display_name || null, status || null, customer.user_id);
  }
  res.json({ success: true });
});

// 客户充值
app.post("/api/admin/customers/:id/recharge", authMiddleware, adminOnly, (req, res) => {
  const cid = Number(req.params.id);
  const { amount, note } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "充值金额必须大于0" });

  const customer = db.getCustomerById(cid);
  if (!customer) return res.status(404).json({ error: "客户不存在" });

  db.updateCustomerBalance(cid, amount);
  const updated = db.getCustomerById(cid)!;
  const tx = db.createPrepaidTransaction({
    customer_id: cid,
    type: "recharge",
    amount,
    balance_after: updated.prepaid_balance,
    note: note || "充值",
    operator_id: req.user.id,
  });

  res.json({ success: true, balance: updated.prepaid_balance, transaction: tx });
});

// 客户台账
app.get("/api/admin/customers/:id/transactions", authMiddleware, adminOnly, (req, res) => {
  const cid = Number(req.params.id);
  const transactions = db.getPrepaidTransactions(cid);
  const customer = db.getCustomerById(cid);
  res.json({ customer, transactions });
});

// 全部订单
app.get("/api/admin/orders", authMiddleware, adminOnly, (req, res) => {
  const result = db.getAllOrders({
    customer_id: req.query.customer_id ? Number(req.query.customer_id) : undefined,
    status: req.query.status as string,
    keyword: req.query.keyword as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    province: req.query.province as string,
    page: req.query.page ? Number(req.query.page) : 1,
    pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
  });
  res.json(result);
});

app.get("/api/admin/orders/:id", authMiddleware, adminOnly, (req, res) => {
  const order = db.getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "订单不存在" });
  res.json({ order });
});

// 更新订单状态
app.put("/api/admin/orders/:id/status", authMiddleware, adminOnly, (req, res) => {
  const { status } = req.body;
  db.updateOrderStatus(Number(req.params.id), status);
  res.json({ success: true });
});

// 录入物流
app.put("/api/admin/orders/:id/logistics", authMiddleware, adminOnly, (req, res) => {
  const { tracking_number, logistics_company } = req.body;
  if (!tracking_number) return res.status(400).json({ error: "请输入物流单号" });
  db.updateOrderLogistics(Number(req.params.id), tracking_number, logistics_company || "");
  res.json({ success: true });
});

// 产品管理
app.get("/api/admin/products", authMiddleware, adminOnly, (req, res) => {
  const all = dbc.prepare("SELECT * FROM products ORDER BY code ASC").all();
  res.json({ products: all });
});

app.post("/api/admin/products", authMiddleware, adminOnly, (req, res) => {
  const { code, name, weight, unit_price, cost_price, stock } = req.body;
  if (!code || !name) return res.status(400).json({ error: "产品编码和名称为必填" });
  const exists = db.getProductByCode(code);
  if (exists) return res.status(400).json({ error: "产品编码已存在" });

  const product = db.createProduct({
    code, name,
    weight: weight || 0,
    unit_price: unit_price || 0,
    cost_price: cost_price || 0,
    stock: stock || 0,
    status: "active",
  });
  res.json({ product });
});

app.put("/api/admin/products/:id", authMiddleware, adminOnly, (req, res) => {
  const pid = Number(req.params.id);
  const { name, weight, unit_price, cost_price, stock, status } = req.body;
  const product = db.getProductById(pid);
  if (!product) return res.status(404).json({ error: "产品不存在" });

  db.updateProduct(pid, { name, weight, unit_price, cost_price, status });

  // 如果库存有变化
  if (stock !== undefined && stock !== product.stock) {
    const diff = stock - product.stock;
    db.updateProductStock(pid, diff, diff > 0 ? "in" : "out", undefined, "库存盘点调整");
  }

  const updated = db.getProductById(pid);
  res.json({ product: updated });
});

// 库存日志
app.get("/api/admin/inventory-logs", authMiddleware, adminOnly, (req, res) => {
  const pid = req.query.product_id ? Number(req.query.product_id) : undefined;
  const logs = db.getInventoryLogs(pid);
  res.json({ logs });
});

// 运费模板
app.get("/api/admin/shipping", authMiddleware, adminOnly, (req, res) => {
  const templates = db.getShippingTemplates();
  res.json({ templates });
});

app.put("/api/admin/shipping/:id", authMiddleware, adminOnly, (req, res) => {
  const { first_price, additional_price, packing_fee } = req.body;
  db.updateShippingTemplate(Number(req.params.id), { first_price, additional_price, packing_fee });
  res.json({ success: true });
});

// 导出订单 CSV
app.get("/api/admin/export/orders", authMiddleware, adminOnly, (req, res) => {
  const { orders } = db.getAllOrders({
    customer_id: req.query.customer_id ? Number(req.query.customer_id) : undefined,
    status: req.query.status as string,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    province: req.query.province as string,
    page: 1, pageSize: 10000,
  });

  const csvHeaders = "订单号,客户,收件人,手机,省,市,区,详细地址,运输方式,运费分区,总重量,运费,打包费,货款,总金额,状态,物流单号,物流公司,下单时间";
  const csvRows = orders.map((o: any) =>
    `"${o.order_number}","${o.customer_name}","${o.recipient_name}","${o.recipient_phone}","${o.recipient_province}","${o.recipient_city}","${o.recipient_district}","${o.recipient_address}","${o.shipping_method}","${o.shipping_zone}","${o.total_weight}","${o.shipping_fee}","${o.packing_fee}","${o.product_total}","${o.order_total}","${o.status}","${o.tracking_number}","${o.logistics_company}","${o.created_at}"`
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders-export.csv");
  res.write("\uFEFF"); // BOM for Excel
  res.end([csvHeaders, ...csvRows].join("\n"));
});

// 静态文件（生产环境）
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// 初始化种子数据 + 启动
// 托管前端静态文件（生产模式），API 路由优先级高于静态文件
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

db.seedDefaultData();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🏪 TinyMola 代发管理系统 v1.0              ║
║                                              ║
║   API:   http://localhost:${PORT}              ║
║   DB:    SQLite (data/tinymola.db)           ║
║                                              ║
║   默认账号:                                   ║
║   管理员: admin / admin123                    ║
║   客户:   customer1 / customer123             ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});

export default app;
