import React, { useEffect, useState } from "react";
import { Card, Button, InputNumber, MessagePlugin, Loading } from "tdesign-react";
import { api } from "../utils/api";

export default function AdminShipping() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getShippingSettings().then((d: any) => setTemplates(d.templates)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updateTemplate = async (id: number, field: string, value: number) => {
    // Optimistic update
    setTemplates(templates.map(t => t.id === id ? { ...t, [field]: value } : t));
    try {
      await api.updateShippingTemplate(id, { first_price: undefined, additional_price: undefined, packing_fee: undefined, [field]: value });
      MessagePlugin.success("更新成功");
    } catch (e: any) { MessagePlugin.error(e.message); }
  };

  if (loading) return <Loading size="large" style={{ display: "flex", justifyContent: "center", marginTop: 100 }} />;

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 600 }}>运费模板</h2>

      <Card bordered title="普通陆运分区（可按省份编辑）" style={{ marginBottom: 16 }}>
        {templates.map((t: any) => (
          <div key={t.id} style={{
            display: "grid", gridTemplateColumns: "1fr 2fr 120px 120px 100px",
            gap: 16, alignItems: "center", padding: "12px 0",
            borderBottom: "1px solid #f5f5f5",
          }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{t.zone_label}</div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>{t.provinces}</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>首重 ¥/kg</div>
              <InputNumber value={t.first_price} onChange={(v) => updateTemplate(t.id, "first_price", v as number)} min={0} theme="normal" size="small" style={{ width: 80 }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>续重 ¥/kg</div>
              <InputNumber value={t.additional_price} onChange={(v) => updateTemplate(t.id, "additional_price", v as number)} min={0} theme="normal" size="small" style={{ width: 80 }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>打包费 ¥</div>
              <InputNumber value={t.packing_fee} onChange={(v) => updateTemplate(t.id, "packing_fee", v as number)} min={0} theme="normal" size="small" style={{ width: 80 }} />
            </div>
          </div>
        ))}
      </Card>

      <Card bordered title="顺丰空运（全国统一）" style={{ marginBottom: 16 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 2fr 120px 120px 100px",
          gap: 16, alignItems: "center", padding: "12px 0",
        }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>顺丰空运</div>
          <div style={{ fontSize: 12, color: "#666" }}>全国统一价，不分区</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>首重 ¥/kg</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>23.00</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>续重 ¥/kg</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>15.00</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>打包费 ¥</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>2.00</div>
          </div>
        </div>
      </Card>

      <Card bordered title="运费计算规则说明">
        <div style={{ fontSize: 13, lineHeight: 2, color: "#666" }}>
          <div>1. 总运费 = 首重价 + 续重单价 × 超出首重重量(向上取整) + 打包费</div>
          <div>2. 普通陆运首重1kg，超出部分按续重单价计算</div>
          <div>3. 下单时根据收件地址省份自动匹配对应分区费率</div>
          <div>4. 打包费按单收取，默认为2元/单</div>
        </div>
      </Card>
    </div>
  );
}
