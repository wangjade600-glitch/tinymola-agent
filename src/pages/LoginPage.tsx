import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Input, Button, MessagePlugin, Card, Form } from "tdesign-react";
import type { SubmitContext } from "tdesign-react/es/form/type";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (ctx: SubmitContext) => {
    ctx.e?.preventDefault();
    if (!username || !password) {
      MessagePlugin.warning("请输入用户名和密码");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      const userStr = localStorage.getItem("user");
      MessagePlugin.success("登录成功");
      // Delay redirect to let state update
      setTimeout(() => {
        const stored = localStorage.getItem("token");
        if (stored) {
          // Detect role from stored state after login
          window.location.href = username === "admin" ? "/admin/dashboard" : "/customer/dashboard";
        }
      }, 100);
    } catch (e: any) {
      MessagePlugin.error(e.message || "登录失败");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #1a3a4a 100%)",
    }}>
      <Card style={{ width: 420, padding: "32px 0" }} bordered={false}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0d1b2a", margin: 0 }}>TinyMola</h1>
          <p style={{ color: "#999", marginTop: 8, fontSize: 14 }}>代发管理系统</p>
        </div>
        <Form onSubmit={handleSubmit} style={{ padding: "0 32px" }}>
          <div style={{ marginBottom: 20 }}>
            <Input
              size="large"
              placeholder="用户名"
              value={username}
              onChange={(v) => setUsername(v as string)}
              clearable
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <Input
              size="large"
              type="password"
              placeholder="密码"
              value={password}
              onChange={(v) => setPassword(v as string)}
            />
          </div>
          <Button type="submit" theme="primary" block size="large" loading={loading}>
            登录
          </Button>
        </Form>
        <div style={{
          marginTop: 24, textAlign: "center", color: "#bbb", fontSize: 12,
          padding: "0 32px",
        }}>
          <p style={{ margin: "4px 0" }}>管理员: admin / admin123</p>
          <p style={{ margin: "4px 0" }}>客户: customer1 / customer123</p>
        </div>
      </Card>
    </div>
  );
}
