import React, { useEffect, useState } from "react";
import { Card, Tag, Button, Select, Input, Dialog, Pagination, MessagePlugin, Loading } from "tdesign-react";
import { DownloadIcon } from "tdesign-icons-react";
import { api } from "../utils/api";

const statusMap: Record<string, any> = {
  pending: { label: "待确认", theme: "warning" },
  confirmed: { label: "已确认", theme: "primary" },
  shipped: { label: "已发货", theme: "success" },
  delivered: { label: "已签收", theme: "success" },
  cancelled: { label: "已取消", theme: "default" },
};

export default function AdminOrders() {
  const [data, setData] = useState<{ orders: any[]; total: number }>({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "all", keyword: "", province: "" });
  const [selected, setSelected] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showLogistics, setShowLogistics] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [logisticsCompany, setLogisticsCompany] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), pageSize: "20" };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.province) params.province = filters.province;
      const d = await api.getAdminOrders(params);
      setData(d);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [page, filters]);

  const viewOrder = async (id: number) => {
    try {
      const d = await api.getAdminOrder(id);
      setSelected(d.order);
      setShowDetail(true);
    } catch (e) { console.error(e); }
  };

  const handleLogistics = async () => {
    if (!trackingNumber) { MessagePlugin.warning("请输入物流单号"); return; }
    try {
      await api.updateOrderLogistics(selected.id, trackingNumber, logisticsCompany);
      MessagePlugin.success("物流录入成功");
      setShowLogistics(false);
      viewOrder(selected.id);
      fetchOrders();
    } catch (e: any) { MessagePlugin.error(e.message); }
  };

  const handleExport = () => {
    const params: Record<string, string> = {};
    if (filters.status !== "all") params.status = filters.status;
    if (filters.keyword) params.keyword = filters.keyword;
    if (filters.province) params.province = filters.province;
    const url = api.exportOrders(params);
    window.open(url, "_blank");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>订单管理</h2>
        <Button icon={<DownloadIcon />} onClick={handleExport}>导出CSV</Button>
      </div>

      <Card bordered style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Select value={filters.status} onChange={(v) => { setFilters({ ...filters, status: v as string }); setPage(1); }} style={{ width: 120 }}
            options={[
              { label: "全部", value: "all" }, { label: "待确认", value: "pending" },
              { label: "已确认", value: "confirmed" }, { label: "已发货", value: "shipped" },
              { label: "已签收", value: "delivered" }, { label: "已取消", value: "cancelled" },
            ]} />
          <Input placeholder="搜索订单号/客户/收件人" value={filters.keyword}
            onChange={(v) => setFilters({ ...filters, keyword: v as string })}
            onEnter={() => { setPage(1); fetchOrders(); }} style={{ width: 240 }} />
          <Input placeholder="目的地省份" value={filters.province}
            onChange={(v) => setFilters({ ...filters, province: v as string })}
            onEnter={() => { setPage(1); fetchOrders(); }} style={{ width: 140 }} />
          <Button onClick={() => { setPage(1); fetchOrders(); }}>搜索</Button>
        </div>
      </Card>

      <Card bordered>
        <Loading loading={loading}>
          {data.orders.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: 60 }}>暂无订单</div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>订单号</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>客户</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>收件人</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>目的地</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>运输</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>金额</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>状态</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>物流</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>时间</th>
                    <th style={{ padding: "10px 8px", fontSize: 13, color: "#999" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o: any) => {
                    const s = statusMap[o.status] || { label: o.status, theme: "default" };
                    return (
                      <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                        <td style={{ padding: "10px 8px", fontSize: 13, fontWeight: 500, color: "#0052d9" }}>{o.order_number}</td>
                        <td style={{ padding: "10px 8px", fontSize: 13 }}>{o.customer_name}</td>
                        <td style={{ padding: "10px 8px", fontSize: 13 }}>{o.recipient_name}</td>
                        <td style={{ padding: "10px 8px", fontSize: 12 }}>{o.recipient_province} {o.recipient_city}</td>
                        <td style={{ padding: "10px 8px" }}><Tag size="small" variant="light">{o.shipping_method === "sf_air" ? "顺丰" : "陆运"}</Tag></td>
                        <td style={{ padding: "10px 8px", fontSize: 13, fontWeight: 500 }}>¥{o.order_total.toFixed(2)}</td>
                        <td style={{ padding: "10px 8px" }}><Tag theme={s.theme} size="small">{s.label}</Tag></td>
                        <td style={{ padding: "10px 8px", fontSize: 11, color: "#666" }}>{o.tracking_number || "-"}</td>
                        <td style={{ padding: "10px 8px", fontSize: 11, color: "#999" }}>{o.created_at?.slice(0, 16)}</td>
                        <td style={{ padding: "10px 8px" }}>
                          <Button size="small" variant="outline" onClick={() => viewOrder(o.id)}>详情</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 16, textAlign: "right" }}>
                <Pagination current={page} total={data.total} pageSize={20} onChange={(p) => setPage(p.current)} />
              </div>
            </>
          )}
        </Loading>
      </Card>

      {/* 订单详情 Dialog */}
      <Dialog visible={showDetail} onClose={() => setShowDetail(false)} header={selected ? `订单 ${selected.order_number}` : "订单详情"} width={700}>
        {selected && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ lineHeight: 2.2 }}>
                <div style={{ fontSize: 13, color: "#999" }}>收件信息</div>
                <div style={{ fontSize: 14 }}>{selected.recipient_name} | {selected.recipient_phone}</div>
                <div style={{ fontSize: 13 }}>{selected.recipient_province} {selected.recipient_city} {selected.recipient_district}</div>
                <div style={{ fontSize: 13 }}>{selected.recipient_address}</div>
              </div>
              <div style={{ lineHeight: 2.2 }}>
                <div style={{ fontSize: 13, color: "#999" }}>订单信息</div>
                <div style={{ fontSize: 14 }}>状态: <Tag theme={statusMap[selected.status]?.theme}>{statusMap[selected.status]?.label}</Tag></div>
                <div style={{ fontSize: 13 }}>运输: {selected.shipping_method === "sf_air" ? "顺丰空运" : "普通陆运"} | {selected.shipping_zone}</div>
                <div style={{ fontSize: 13 }}>物流: {selected.tracking_number || "未录入"} | {selected.logistics_company}</div>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "6px", fontSize: 12, color: "#999" }}>编码</th>
                  <th style={{ padding: "6px", fontSize: 12, color: "#999" }}>名称</th>
                  <th style={{ padding: "6px", fontSize: 12, color: "#999" }}>数量</th>
                  <th style={{ padding: "6px", fontSize: 12, color: "#999" }}>单价</th>
                  <th style={{ padding: "6px", fontSize: 12, color: "#999" }}>小计</th>
                </tr>
              </thead>
              <tbody>
                {selected.items?.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "6px", fontSize: 12 }}>{item.product_code}</td>
                    <td style={{ padding: "6px", fontSize: 12 }}>{item.product_name}</td>
                    <td style={{ padding: "6px", fontSize: 12 }}>{item.quantity}</td>
                    <td style={{ padding: "6px", fontSize: 12 }}>¥{item.unit_price}</td>
                    <td style={{ padding: "6px", fontSize: 12 }}>¥{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: "right", marginBottom: 16, lineHeight: 2 }}>
              货款 ¥{selected.product_total.toFixed(2)} + 运费 ¥{selected.shipping_fee.toFixed(2)} + 打包费 ¥{selected.packing_fee.toFixed(2)} = <strong style={{ fontSize: 16, color: "#e34d59" }}>¥{selected.order_total.toFixed(2)}</strong>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {selected.status === "pending" && (
                <Button onClick={async () => { await api.updateOrderStatus(selected.id, "confirmed"); viewOrder(selected.id); fetchOrders(); }}>确认订单</Button>
              )}
              {(selected.status === "pending" || selected.status === "confirmed") && (
                <Button theme="primary" onClick={() => { setTrackingNumber(selected.tracking_number || ""); setLogisticsCompany(selected.logistics_company || ""); setShowLogistics(true); setShowDetail(false); }}>录入物流</Button>
              )}
              {selected.status === "shipped" && (
                <Button onClick={async () => { await api.updateOrderStatus(selected.id, "delivered"); viewOrder(selected.id); fetchOrders(); }}>标记签收</Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* 录入物流 Dialog */}
      <Dialog visible={showLogistics} onClose={() => setShowLogistics(false)} header="录入物流信息" width={420} onConfirm={handleLogistics}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>物流单号 *</div>
          <Input value={trackingNumber} onChange={(v) => setTrackingNumber(v as string)} placeholder="输入快递单号" />
        </div>
        <div>
          <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>物流公司</div>
          <Input value={logisticsCompany} onChange={(v) => setLogisticsCompany(v as string)} placeholder="如：顺丰速运" />
        </div>
      </Dialog>
    </div>
  );
}
