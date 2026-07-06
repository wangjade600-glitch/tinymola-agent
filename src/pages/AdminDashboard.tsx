import React, { useEffect, useState } from "react";
import { Card, Tag, Statistic, Loading } from "tdesign-react";
import { api } from "../utils/api";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;
  if (!data) return <div>加载失败</div>;

  const { stats, recentOrders } = data;

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 600 }}>管理后台</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card bordered><Statistic title="今日订单" value={stats.todayOrders} /><div style={{ fontSize: 12, color: "#999" }}>今日收入 ¥{stats.todayRevenue.toFixed(2)}</div></Card>
        <Card bordered><Statistic title="待处理" value={stats.pendingOrders} /></Card>
        <Card bordered><Statistic title="客户数" value={stats.totalCustomers} /></Card>
        <Card bordered><Statistic title="总订单" value={stats.totalOrders} /><div style={{ fontSize: 12, color: "#999" }}>累计 ¥{stats.totalRevenue.toFixed(2)}</div></Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card bordered><Statistic title="已发货" value={stats.shippedOrders} /></Card>
        <Card bordered><Statistic title="低库存预警" value={stats.lowStockCount} color={stats.lowStockCount > 0 ? "#e34d59" : undefined} /></Card>
      </div>

      <Card bordered title="最近订单">
        {recentOrders?.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>订单号</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>客户</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>收件人</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>金额</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>状态</th>
                <th style={{ padding: "8px 12px", fontSize: 13, color: "#999" }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o: any) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>{o.order_number}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{o.customer_name}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>{o.recipient_name}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13 }}>¥{o.order_total.toFixed(2)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <Tag size="small" theme={o.status === "pending" ? "warning" : o.status === "shipped" ? "success" : "default"}>
                      {o.status === "pending" ? "待确认" : o.status === "shipped" ? "已发货" : o.status}
                    </Tag>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: 12, color: "#999" }}>{o.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>暂无订单</div>
        )}
      </Card>
    </div>
  );
}
