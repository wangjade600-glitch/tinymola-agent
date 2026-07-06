import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Tag, Button, Loading, Statistic } from "tdesign-react";
import { AddIcon } from "tdesign-icons-react";
import { api } from "../utils/api";

export default function CustomerDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getCustomerDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;
  if (!data) return <div>加载失败</div>;

  const { balance, stats, recentOrders } = data;

  const statusMap: Record<string, any> = {
    pending: { label: "待确认", theme: "warning" },
    confirmed: { label: "已确认", theme: "primary" },
    shipped: { label: "已发货", theme: "success" },
    delivered: { label: "已签收", theme: "success" },
    cancelled: { label: "已取消", theme: "default" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>工作台</h2>
        <Button theme="primary" icon={<AddIcon />} onClick={() => navigate("/customer/orders/new")}>下单</Button>
      </div>

      {/* 余额卡片 */}
      <Card bordered style={{ marginBottom: 16, background: "linear-gradient(135deg, #0d1b2a, #1a3a4a)", color: "#fff" }}>
        <div style={{ padding: 8 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>预存款余额</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>¥{balance.toFixed(2)}</div>
          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>
            累计消费 ¥{stats.totalSpent.toFixed(2)} | 共 {stats.totalOrders} 单
          </div>
        </div>
      </Card>

      {/* 统计 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card bordered><Statistic title="今日订单" value={stats.todayOrders} /></Card>
        <Card bordered><Statistic title="待处理" value={stats.pendingOrders} /></Card>
        <Card bordered><Statistic title="已发货" value={stats.shippedOrders} /></Card>
        <Card bordered><Statistic title="全部订单" value={stats.totalOrders} /></Card>
      </div>

      {/* 最近订单 */}
      <Card bordered title="最近订单" actions={
        <Button variant="text" onClick={() => navigate("/customer/orders")}>查看全部</Button>
      }>
        {recentOrders?.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>订单号</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>收件人</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>金额</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>状态</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>物流</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o: any) => {
                const s = statusMap[o.status] || { label: o.status, theme: "default" };
                return (
                  <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5", cursor: "pointer" }}
                    onClick={() => navigate(`/customer/orders/${o.id}`)}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>{o.order_number}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>{o.recipient_name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>¥{o.order_total.toFixed(2)}</td>
                    <td style={{ padding: "10px 12px" }}><Tag theme={s.theme} size="small">{s.label}</Tag></td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#666" }}>{o.tracking_number || "-"}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#999" }}>{o.created_at?.slice(0, 10)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>暂无订单</div>
        )}
      </Card>
    </div>
  );
}
