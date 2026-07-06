import React, { useEffect, useState } from "react";
import { Card, Tag, Select, Loading } from "tdesign-react";
import { api } from "../utils/api";

export default function AdminInventory() {
  const [logs, setLogs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAdminProducts().then((d: any) => setProducts(d.products)).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getInventoryLogs(productId).then((d: any) => setLogs(d.logs)).catch(console.error).finally(() => setLoading(false));
  }, [productId]);

  const typeMap: Record<string, any> = {
    in: { label: "入库", theme: "success" },
    out: { label: "出库", theme: "danger" },
    adjust: { label: "调整", theme: "warning" },
    init: { label: "初始化", theme: "primary" },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>库存日志</h2>
        <Select
          value={productId}
          onChange={(v) => setProductId(v as number || undefined)}
          placeholder="筛选产品"
          clearable
          filterable
          style={{ width: 240 }}
          options={products.map(p => ({ label: `${p.code} ${p.name}`, value: p.id }))}
        />
      </div>

      <Card bordered>
        <Loading loading={loading}>
          {logs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: 60 }}>暂无库存变动记录</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>时间</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>产品编码</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>类型</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>变动数量</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>变动后库存</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>关联订单</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>备注</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const t = typeMap[log.change_type] || { label: log.change_type, theme: "default" };
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#999" }}>{log.created_at?.slice(0, 16)}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>{log.product_code}</td>
                      <td style={{ padding: "10px 12px" }}><Tag size="small" theme={t.theme}>{t.label}</Tag></td>
                      <td style={{
                        padding: "10px 12px", fontSize: 14, fontWeight: 600,
                        color: log.change_quantity > 0 ? "#00a870" : "#e34d59",
                      }}>
                        {log.change_quantity > 0 ? "+" : ""}{log.change_quantity}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600 }}>{log.stock_after}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#666" }}>{log.order_id ? `#${log.order_id}` : "-"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "#666" }}>{log.note || "-"}</td>
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
