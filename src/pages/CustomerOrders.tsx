import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag, Button, Select, Input, Loading, Space } from "tdesign-react";
import { api } from "../utils/api";

const statusMap: Record<string, any> = {
  pending: { label: "待确认", theme: "warning" },
  confirmed: { label: "已确认", theme: "primary" },
  shipped: { label: "已发货", theme: "success" },
  delivered: { label: "已签收", theme: "success" },
  cancelled: { label: "已取消", theme: "default" },
};

export default function CustomerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status !== "all") params.status = status;
      if (keyword) params.keyword = keyword;
      const data = await api.getCustomerOrders(params);
      setOrders(data.orders);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [status]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>订单管理</h2>
        <Button theme="primary" onClick={() => navigate("/customer/orders/new")}>下单</Button>
      </div>

      <Card bordered style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Select value={status} onChange={(v) => setStatus(v as string)} style={{ width: 120 }}
            options={[
              { label: "全部", value: "all" }, { label: "待确认", value: "pending" },
              { label: "已确认", value: "confirmed" }, { label: "已发货", value: "shipped" },
              { label: "已签收", value: "delivered" }, { label: "已取消", value: "cancelled" },
            ]} />
          <Input placeholder="搜索订单号/收件人" value={keyword} onChange={(v) => setKeyword(v as string)}
            style={{ width: 240 }} onEnter={fetchOrders} />
          <Button onClick={fetchOrders}>搜索</Button>
        </div>
      </Card>

      <Card bordered>
        <Loading loading={loading}>
          {orders.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: 60 }}>暂无订单</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>订单号</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>收件人</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>目的地</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>运输方式</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>金额</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>状态</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>物流单号</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => {
                  const s = statusMap[o.status] || { label: o.status, theme: "default" };
                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                      onClick={() => navigate(`/customer/orders/${o.id}`)}>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "#0052d9" }}>{o.order_number}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>{o.recipient_name}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>{o.recipient_province} {o.recipient_city}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12 }}>
                        <Tag size="small" variant="light">{o.shipping_method === "sf_air" ? "顺丰空运" : "普通陆运"}</Tag>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>¥{o.order_total.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px" }}><Tag theme={s.theme} size="small">{s.label}</Tag></td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#666" }}>{o.tracking_number || "-"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#999" }}>{o.created_at?.slice(0, 16)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Loading>
      </Card>
    </div>
  );
}

export function CustomerOrderDetail() {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const id = window.location.pathname.split("/").pop();

  useEffect(() => {
    api.getCustomerOrder(Number(id)).then(d => { setOrder(d.order); }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;
  if (!order) return <div>订单不存在</div>;

  const s = statusMap[order.status] || { label: order.status, theme: "default" };

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 600 }}>订单详情 - {order.order_number}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card bordered title="收件信息">
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div><span style={{ color: "#999" }}>收件人：</span>{order.recipient_name}</div>
            <div><span style={{ color: "#999" }}>手机：</span>{order.recipient_phone}</div>
            <div><span style={{ color: "#999" }}>地址：</span>{order.recipient_province} {order.recipient_city} {order.recipient_district} {order.recipient_address}</div>
          </div>
        </Card>

        <Card bordered title="订单信息">
          <div style={{ fontSize: 14, lineHeight: 2 }}>
            <div><span style={{ color: "#999" }}>订单号：</span>{order.order_number}</div>
            <div><span style={{ color: "#999" }}>状态：</span><Tag theme={s.theme}>{s.label}</Tag></div>
            <div><span style={{ color: "#999" }}>运输方式：</span>{order.shipping_method === "sf_air" ? "顺丰空运" : "普通陆运"}</div>
            <div><span style={{ color: "#999" }}>运费分区：</span>{order.shipping_zone}</div>
            <div><span style={{ color: "#999" }}>物流单号：</span><strong>{order.tracking_number || "待录入"}</strong></div>
            <div><span style={{ color: "#999" }}>物流公司：</span>{order.logistics_company || "-"}</div>
            <div><span style={{ color: "#999" }}>下单时间：</span>{order.created_at}</div>
            {order.note && <div><span style={{ color: "#999" }}>备注：</span>{order.note}</div>}
          </div>
        </Card>
      </div>

      <Card bordered title="商品明细" style={{ marginTop: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>产品编码</th>
              <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>产品名称</th>
              <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>数量</th>
              <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>单价</th>
              <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>单品重量</th>
              <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>小计</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{item.product_code}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{item.product_name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{item.quantity}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>¥{item.unit_price}</td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{item.unit_weight} kg</td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>¥{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ textAlign: "right", marginTop: 16, fontSize: 14, lineHeight: 2.2 }}>
          <div>货款: ¥{order.product_total.toFixed(2)}</div>
          <div>运费: ¥{order.shipping_fee.toFixed(2)}</div>
          <div>打包费: ¥{order.packing_fee.toFixed(2)}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e34d59" }}>订单总额: ¥{order.order_total.toFixed(2)}</div>
        </div>
      </Card>
    </div>
  );
}
