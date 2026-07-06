import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Loading } from "tdesign-react";
import "tdesign-react/es/style/index.css";
import "./index.css";

// Layout
import CustomerLayout, { AdminLayout } from "./components/Layout";

// Pages
import LoginPage from "./pages/LoginPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerOrders, { CustomerOrderDetail } from "./pages/CustomerOrders";
import CustomerNewOrder from "./pages/CustomerNewOrder";
import CustomerBalance from "./pages/CustomerBalance";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCustomers from "./pages/AdminCustomers";
import AdminOrders from "./pages/AdminOrders";
import AdminProducts from "./pages/AdminProducts";
import AdminShipping from "./pages/AdminShipping";
import AdminInventory from "./pages/AdminInventory";

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "admin" | "customer" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Loading size="large" text="加载中..." />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={`/${user.role === "admin" ? "admin" : "customer"}/dashboard`} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/customer/dashboard"} replace /> : <LoginPage />} />

      {/* Customer Routes */}
      <Route path="/customer" element={<ProtectedRoute role="customer"><CustomerLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="orders/new" element={<CustomerNewOrder />} />
        <Route path="orders/:id" element={<CustomerOrderDetail />} />
        <Route path="balance" element={<CustomerBalance />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="shipping" element={<AdminShipping />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
