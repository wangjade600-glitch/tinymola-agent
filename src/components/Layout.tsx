import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Layout, Menu, Button, Dropdown, MessagePlugin,
} from "tdesign-react";
import {
  DashboardIcon, ShopIcon, MoneyIcon, LayersIcon,
  SecuredIcon, FileIcon, UserIcon, SettingIcon,
  LogoutIcon, FolderIcon, AddIcon, ViewListIcon,
} from "tdesign-icons-react";

const { Header, Aside, Content } = Layout;

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { value: "/customer/dashboard", icon: <DashboardIcon />, content: "工作台" },
    { value: "/customer/orders", icon: <ViewListIcon />, content: "订单管理" },
    { value: "/customer/orders/new", icon: <AddIcon />, content: "下单" },
    { value: "/customer/balance", icon: <MoneyIcon />, content: "预存款" },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <Layout style={{ height: "100vh" }}>
      <Aside style={{ background: "#1a1a2e", width: collapsed ? 64 : 220, transition: "width 0.2s" }}>
        <div style={{
          padding: "16px", color: "#fff", fontWeight: 700, fontSize: 18,
          textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)",
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          {collapsed ? "TM" : "TinyMola"}
        </div>
        <Menu
          theme="dark"
          value={location.pathname}
          collapsed={collapsed}
          style={{ background: "transparent" }}
          onChange={(v) => navigate(v as string)}
        >
          {menuItems.map((item) => (
            <Menu.MenuItem key={item.value} value={item.value} icon={item.icon}>
              {item.content}
            </Menu.MenuItem>
          ))}
        </Menu>
      </Aside>
      <Layout>
        <Header style={{
          background: "#fff", padding: "0 24px", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e7e7e7", height: 56,
        }}>
          <Button variant="text" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? ">" : "<"}
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#666" }}>
              {user?.customer?.company_name || user?.display_name}
            </span>
            <Dropdown options={[
              { content: "退出登录", prefixIcon: <LogoutIcon />, onClick: handleLogout },
            ]}>
              <Button variant="text" shape="circle"><UserIcon /></Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: 24, overflow: "auto", background: "#f5f5f5" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { value: "/admin/dashboard", icon: <DashboardIcon />, content: "工作台" },
    { value: "/admin/customers", icon: <UserIcon />, content: "客户管理" },
    { value: "/admin/orders", icon: <FileIcon />, content: "订单管理" },
    { value: "/admin/products", icon: <LayersIcon />, content: "产品管理" },
    { value: "/admin/shipping", icon: <SecuredIcon />, content: "运费模板" },
    { value: "/admin/inventory", icon: <FolderIcon />, content: "库存日志" },
  ];

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <Layout style={{ height: "100vh" }}>
      <Aside style={{ background: "#0d1b2a", width: collapsed ? 64 : 220, transition: "width 0.2s" }}>
        <div style={{
          padding: "16px", color: "#fff", fontWeight: 700, fontSize: 18,
          textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)",
          whiteSpace: "nowrap", overflow: "hidden",
        }}>
          {collapsed ? "TM" : "TinyMola 管理"}
        </div>
        <Menu
          theme="dark"
          value={location.pathname}
          collapsed={collapsed}
          style={{ background: "transparent" }}
          onChange={(v) => navigate(v as string)}
        >
          {menuItems.map((item) => (
            <Menu.MenuItem key={item.value} value={item.value} icon={item.icon}>
              {item.content}
            </Menu.MenuItem>
          ))}
        </Menu>
      </Aside>
      <Layout>
        <Header style={{
          background: "#fff", padding: "0 24px", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e7e7e7", height: 56,
        }}>
          <Button variant="text" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? ">" : "<"}
          </Button>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ color: "#666" }}>管理员: {user?.display_name}</span>
            <Dropdown options={[
              { content: "退出登录", prefixIcon: <LogoutIcon />, onClick: handleLogout },
            ]}>
              <Button variant="text" shape="circle"><UserIcon /></Button>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ padding: 24, overflow: "auto", background: "#f5f5f5" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
