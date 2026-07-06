import React, { useEffect, useState } from "react";
import { Card, Button, Tag, Input, Dialog, Form, InputNumber, MessagePlugin, Loading } from "tdesign-react";
import { AddIcon } from "tdesign-icons-react";
import { api } from "../utils/api";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // 新增/编辑表单
  const [form, setForm] = useState({ username: "", password: "", display_name: "", phone: "", company_name: "", contact_name: "", contact_phone: "", address: "", prepaid_balance: 0 });

  // 充值
  const [rechargeAmount, setRechargeAmount] = useState(0);
  const [rechargeNote, setRechargeNote] = useState("");

  const fetchCustomers = async () => {
    setLoading(true);
    try { const d = await api.getCustomers(); setCustomers(d.customers); } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleCreate = async () => {
    if (!form.username || !form.password || !form.display_name) {
      MessagePlugin.warning("用户名、密码、显示名称为必填"); return;
    }
    try {
      await api.createCustomer(form);
      MessagePlugin.success("创建成功");
      setShowCreate(false);
      setForm({ username: "", password: "", display_name: "", phone: "", company_name: "", contact_name: "", contact_phone: "", address: "", prepaid_balance: 0 });
      fetchCustomers();
    } catch (e: any) { MessagePlugin.error(e.message); }
  };

  const handleRecharge = async () => {
    if (rechargeAmount <= 0) { MessagePlugin.warning("充值金额必须大于0"); return; }
    try {
      await api.rechargeCustomer(selected.id, rechargeAmount, rechargeNote);
      MessagePlugin.success("充值成功");
      setShowRecharge(false);
      setRechargeAmount(0); setRechargeNote("");
      fetchCustomers();
      if (selected) fetchTransactions(selected.id);
    } catch (e: any) { MessagePlugin.error(e.message); }
  };

  const fetchTransactions = async (id: number) => {
    try { const d = await api.getCustomerTransactions(id); setTransactions(d.transactions); } catch (e) { console.error(e); }
  };

  const selectCustomer = (c: any) => {
    setSelected(c);
    fetchTransactions(c.id);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>客户管理</h2>
        <Button theme="primary" icon={<AddIcon />} onClick={() => setShowCreate(true)}>新增客户</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card bordered title={`客户列表 (${customers.length})`}>
          <Loading loading={loading}>
            {customers.map((c: any) => (
              <div key={c.id} onClick={() => selectCustomer(c)} style={{
                padding: "12px 16px", borderBottom: "1px solid #f5f5f5", cursor: "pointer",
                background: selected?.id === c.id ? "#e8f3ff" : "transparent",
                borderRadius: 4, marginBottom: 4,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.company_name || c.display_name}</div>
                    <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                      {c.display_name} | {c.phone || "无电话"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#00a870" }}>¥{c.prepaid_balance.toFixed(2)}</div>
                    <Tag size="small" theme={c.user_status === "active" ? "success" : "default"}>{c.user_status === "active" ? "正常" : "禁用"}</Tag>
                  </div>
                </div>
              </div>
            ))}
            {customers.length === 0 && <div style={{ textAlign: "center", color: "#999", padding: 40 }}>暂无客户</div>}
          </Loading>
        </Card>

        <Card bordered title={selected ? `${selected.company_name || selected.display_name} - 台账` : "选择客户查看台账"}>
          {selected ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#999" }}>当前余额</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#00a870" }}>¥{selected.prepaid_balance.toFixed(2)}</div>
                </div>
                <Button onClick={() => { setRechargeAmount(0); setRechargeNote(""); setShowRecharge(true); }}>充值</Button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                    <th style={{ padding: "8px", fontSize: 12, color: "#999" }}>时间</th>
                    <th style={{ padding: "8px", fontSize: 12, color: "#999" }}>类型</th>
                    <th style={{ padding: "8px", fontSize: 12, color: "#999" }}>金额</th>
                    <th style={{ padding: "8px", fontSize: 12, color: "#999" }}>余额</th>
                    <th style={{ padding: "8px", fontSize: 12, color: "#999" }}>备注</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "6px 8px", fontSize: 11, color: "#999" }}>{tx.created_at?.slice(0, 16)}</td>
                      <td style={{ padding: "6px 8px", fontSize: 12 }}>
                        <Tag size="small" variant="light" theme={tx.type === "deduct" ? "danger" : "success"}>
                          {tx.type === "recharge" ? "充值" : tx.type === "deduct" ? "扣款" : tx.type}
                        </Tag>
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 12, fontWeight: 600, color: tx.type === "deduct" ? "#e34d59" : "#00a870" }}>
                        {tx.type === "deduct" ? "-" : "+"}¥{Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 12 }}>¥{tx.balance_after.toFixed(2)}</td>
                      <td style={{ padding: "6px 8px", fontSize: 11, color: "#666" }}>{tx.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#999", padding: 60 }}>点击左侧客户查看台账</div>
          )}
        </Card>
      </div>

      {/* 新增客户 Dialog */}
      <Dialog visible={showCreate} onClose={() => setShowCreate(false)} header="新增客户" width={520} onConfirm={handleCreate}>
        <Form labelWidth={100}>
          <Form.FormItem label="用户名 *"><Input value={form.username} onChange={(v) => setForm({ ...form, username: v as string })} /></Form.FormItem>
          <Form.FormItem label="密码 *"><Input type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v as string })} /></Form.FormItem>
          <Form.FormItem label="显示名称 *"><Input value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v as string })} /></Form.FormItem>
          <Form.FormItem label="手机号"><Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v as string })} /></Form.FormItem>
          <Form.FormItem label="公司名称"><Input value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v as string })} /></Form.FormItem>
          <Form.FormItem label="联系人"><Input value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v as string })} /></Form.FormItem>
          <Form.FormItem label="联系电话"><Input value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v as string })} /></Form.FormItem>
          <Form.FormItem label="地址"><Input value={form.address} onChange={(v) => setForm({ ...form, address: v as string })} /></Form.FormItem>
          <Form.FormItem label="初始余额"><InputNumber value={form.prepaid_balance} onChange={(v) => setForm({ ...form, prepaid_balance: v as number })} min={0} style={{ width: "100%" }} /></Form.FormItem>
        </Form>
      </Dialog>

      {/* 充值 Dialog */}
      <Dialog visible={showRecharge} onClose={() => setShowRecharge(false)} header="客户充值" width={400} onConfirm={handleRecharge}>
        <Form labelWidth={80}>
          <Form.FormItem label="充值金额 *"><InputNumber value={rechargeAmount} onChange={(v) => setRechargeAmount(v as number)} min={1} style={{ width: "100%" }} /></Form.FormItem>
          <Form.FormItem label="备注"><Input value={rechargeNote} onChange={(v) => setRechargeNote(v as string)} placeholder="充值说明" /></Form.FormItem>
        </Form>
      </Dialog>
    </div>
  );
}
