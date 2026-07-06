import React, { useEffect, useState } from "react";
import { Card, Tag, Loading } from "tdesign-react";
import { api } from "../utils/api";

export default function CustomerBalance() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCustomerBalance().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  const typeMap: Record<string, any> = {
    recharge: { label: "充值", color: "#00a870" },
    deduct: { label: "消费扣款", color: "#e34d59" },
    refund: { label: "退款", color: "#ed7b2f" },
    adjust: { label: "调整", color: "#0052d9" },
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 600 }}>预存款</h2>

      <Card bordered style={{ marginBottom: 16, background: "linear-gradient(135deg, #0d1b2a, #1a3a4a)", color: "#fff" }}>
        <div style={{ padding: 8 }}>
          <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>当前余额</div>
          <div style={{ fontSize: 42, fontWeight: 700 }}>¥{data?.balance.toFixed(2)}</div>
        </div>
      </Card>

      <Card bordered title="交易记录">
        {data?.transactions?.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", padding: 40 }}>暂无交易记录</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>时间</th>
                <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>类型</th>
                <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>金额</th>
                <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>余额</th>
                <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>备注</th>
              </tr>
            </thead>
            <tbody>
              {data?.transactions?.map((tx: any) => {
                const t = typeMap[tx.type] || { label: tx.type, color: "#666" };
                const isDeduct = tx.type === "deduct";
                return (
                  <tr key={tx.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#999" }}>{tx.created_at?.slice(0, 16)}</td>
                    <td style={{ padding: "10px 12px" }}><Tag size="small" style={{ color: t.color, borderColor: t.color }}>{t.label}</Tag></td>
                    <td style={{
                      padding: "10px 12px", fontSize: 14, fontWeight: 600,
                      color: isDeduct ? "#e34d59" : "#00a870",
                    }}>
                      {isDeduct ? "-" : "+"}¥{Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>¥{tx.balance_after.toFixed(2)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#666" }}>{tx.note || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
