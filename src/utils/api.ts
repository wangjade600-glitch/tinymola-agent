const baseUrl = "/api";

async function request(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers: any = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "请求失败");
  return data;
}

export const api = {
  // Customer
  getCustomerProfile: () => request("/customer/profile"),
  getProducts: (search?: string) => request(`/customer/products${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getShippingTemplates: () => request("/customer/shipping"),
  calcShipping: (province: string, method: string, totalWeight: number) =>
    request("/customer/shipping/calculate", { method: "POST", body: JSON.stringify({ province, method, totalWeight }) }),
  getCustomerOrders: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/customer/orders${qs}`);
  },
  getCustomerOrder: (id: number) => request(`/customer/orders/${id}`),
  createOrder: (data: any) => request("/customer/orders", { method: "POST", body: JSON.stringify(data) }),
  getCustomerBalance: () => request("/customer/balance"),
  getCustomerDashboard: () => request("/customer/dashboard"),

  // Admin
  getAdminDashboard: () => request("/admin/dashboard"),
  getCustomers: () => request("/admin/customers"),
  createCustomer: (data: any) => request("/admin/customers", { method: "POST", body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: any) =>
    request(`/admin/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  rechargeCustomer: (id: number, amount: number, note?: string) =>
    request(`/admin/customers/${id}/recharge`, { method: "POST", body: JSON.stringify({ amount, note }) }),
  getCustomerTransactions: (id: number) => request(`/admin/customers/${id}/transactions`),
  getAdminOrders: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/admin/orders${qs}`);
  },
  getAdminOrder: (id: number) => request(`/admin/orders/${id}`),
  updateOrderStatus: (id: number, status: string) =>
    request(`/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  updateOrderLogistics: (id: number, trackingNumber: string, company: string) =>
    request(`/admin/orders/${id}/logistics`, { method: "PUT", body: JSON.stringify({ tracking_number: trackingNumber, logistics_company: company }) }),
  getAdminProducts: () => request("/admin/products"),
  createProduct: (data: any) => request("/admin/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) =>
    request(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  getInventoryLogs: (productId?: number) =>
    request(`/admin/inventory-logs${productId ? `?product_id=${productId}` : ""}`),
  getShippingSettings: () => request("/admin/shipping"),
  updateShippingTemplate: (id: number, data: any) =>
    request(`/admin/shipping/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  exportOrders: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const token = localStorage.getItem("token");
    return `${baseUrl}/admin/export/orders${qs}&token=${token}`;
  },
};
