import React, { useEffect, useState } from "react";
import { Card, Button, Tag, Input, InputNumber, Dialog, MessagePlugin, Loading } from "tdesign-react";
import { AddIcon } from "tdesign-icons-react";
import { api } from "../utils/api";

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ code: "", name: "", weight: 0, unit_price: 0, cost_price: 0, stock: 0 });

  const fetch = async () => {
    setLoading(true);
    try { const d = await api.getAdminProducts(); setProducts(d.products); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", weight: 0, unit_price: 0, cost_price: 0, stock: 0 });
    setShowForm(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ code: p.code, name: p.name, weight: p.weight, unit_price: p.unit_price, cost_price: p.cost_price, stock: p.stock });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) { MessagePlugin.warning("编码和名称为必填"); return; }
    try {
      if (editing) {
        await api.updateProduct(editing.id, form);
        MessagePlugin.success("更新成功");
      } else {
        await api.createProduct(form);
        MessagePlugin.success("创建成功");
      }
      setShowForm(false);
      fetch();
    } catch (e: any) { MessagePlugin.error(e.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>产品管理</h2>
        <Button theme="primary" icon={<AddIcon />} onClick={openCreate}>新增产品</Button>
      </div>

      <Card bordered>
        <Loading loading={loading}>
          {products.length === 0 ? (
            <div style={{ textAlign: "center", color: "#999", padding: 60 }}>暂无产品，点击右上角添加</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>编码</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>名称</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>重量(kg)</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>售价</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>成本</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>库存</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>状态</th>
                  <th style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>{p.code}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>{p.name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>{p.weight}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>¥{p.unit_price.toFixed(2)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>¥{p.cost_price.toFixed(2)}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>
                      <span style={{ color: p.stock < 10 ? "#e34d59" : "#333", fontWeight: p.stock < 10 ? 600 : 400 }}>
                        {p.stock}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Tag size="small" theme={p.status === "active" ? "success" : "default"}>
                        {p.status === "active" ? "在售" : "下架"}
                      </Tag>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <Button size="small" variant="outline" onClick={() => openEdit(p)}>编辑</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Loading>
      </Card>

      <Dialog visible={showForm} onClose={() => setShowForm(false)} header={editing ? "编辑产品" : "新增产品"} width={500} onConfirm={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>产品编码 *</div>
            <Input value={form.code} onChange={(v) => setForm({ ...form, code: v as string })} disabled={!!editing} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>产品名称 *</div>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v as string })} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>重量(kg)</div>
            <InputNumber value={form.weight} onChange={(v) => setForm({ ...form, weight: v as number })} min={0} step={0.01} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>售价(¥)</div>
            <InputNumber value={form.unit_price} onChange={(v) => setForm({ ...form, unit_price: v as number })} min={0} step={0.01} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>成本(¥)</div>
            <InputNumber value={form.cost_price} onChange={(v) => setForm({ ...form, cost_price: v as number })} min={0} step={0.01} style={{ width: "100%" }} />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>库存</div>
            <InputNumber value={form.stock} onChange={(v) => setForm({ ...form, stock: v as number })} min={0} style={{ width: "100%" }} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
