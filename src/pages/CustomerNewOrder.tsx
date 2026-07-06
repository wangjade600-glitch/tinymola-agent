import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, Form, Input, Select, InputNumber, Button, MessagePlugin,
  Divider, Tag, Dialog, Space, Table, Textarea,
} from "tdesign-react";
import { AddIcon, DeleteIcon } from "tdesign-icons-react";
import { api } from "../utils/api";

interface OrderItem {
  key: string;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_weight: number;
  subtotal: number;
}

const provinceList = [
  "北京", "天津", "上海", "重庆", "河北", "山西", "内蒙古",
  "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建",
  "江西", "山东", "河南", "湖北", "湖南", "广东", "广西",
  "海南", "四川", "贵州", "云南", "西藏", "陕西", "甘肃",
  "青海", "宁夏", "新疆",
];

export default function CustomerNewOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // 收件信息
  const [addressRaw, setAddressRaw] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientProvince, setRecipientProvince] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientDistrict, setRecipientDistrict] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  // 运输
  const [shippingMethod, setShippingMethod] = useState<"standard" | "sf_air">("standard");
  const [shippingCalc, setShippingCalc] = useState<any>(null);

  // 商品行
  const [items, setItems] = useState<OrderItem[]>([]);
  const [note, setNote] = useState("");

  // 金额汇总
  const productTotal = items.reduce((sum, i) => sum + i.subtotal, 0);
  const totalWeight = items.reduce((sum, i) => sum + i.quantity * i.unit_weight, 0);
  const shippingFee = shippingCalc?.shippingFee || 0;
  const packingFee = shippingCalc?.packingFee || 2;
  const orderTotal = productTotal + shippingFee + packingFee;

  useEffect(() => {
    api.getProducts().then((d: any) => setProducts(d.products));
  }, []);

  // 地址自动识别
  const parseAddress = useCallback(() => {
    if (!addressRaw.trim()) return;
    const raw = addressRaw.trim();
    // 提取手机号
    const phoneMatch = raw.match(/1[3-9]\d{9}/);
    const phone = phoneMatch ? phoneMatch[0] : "";
    // 提取姓名（假设在手机号前或开头）
    let name = "";
    let rest = raw;
    if (phone) {
      const idx = raw.indexOf(phone);
      name = raw.slice(0, idx).replace(/[，,。.\s]/g, "").trim();
      // 取最后2-3个字作为姓名
      if (name.length > 4) name = name.slice(-3);
      rest = raw.slice(idx + phone.length);
    }
    // 匹配省份
    let province = "";
    for (const p of provinceList) {
      const pi = raw.indexOf(p);
      if (pi !== -1) {
        province = p;
        // 尝试提取城市和区
        const afterProvince = raw.slice(pi + p.length);
        const cityMatch = afterProvince.match(/([\u4e00-\u9fa5]{2,4}(?:市|区|县|州))/);
        let city = cityMatch ? cityMatch[1] : "";
        let district = "";
        if (city) {
          const afterCity = afterProvince.slice(afterProvince.indexOf(city) + city.length);
          const distMatch = afterCity.match(/([\u4e00-\u9fa5]{2,4}(?:区|县|镇|街道))/);
          district = distMatch ? distMatch[1] : "";
        }
        // 详细地址
        let detailAddress = rest.replace(/[，,。.\s]/g, "").trim();
        if (province && detailAddress.includes(province)) {
          let da = detailAddress.slice(detailAddress.indexOf(province) + province.length);
          if (city && da.includes(city)) da = da.slice(da.indexOf(city) + city.length);
          if (district && da.includes(district)) da = da.slice(da.indexOf(district) + district.length);
          detailAddress = da;
        }
        setRecipientName(name);
        setRecipientPhone(phone);
        setRecipientProvince(province);
        setRecipientCity(city);
        setRecipientDistrict(district);
        setRecipientAddress(detailAddress);
        MessagePlugin.success("地址识别成功");
        return;
      }
    }
    MessagePlugin.warning("未识别到省份信息，请手动选择省份后粘贴详细地址");
  }, [addressRaw]);

  // 运费试算
  const calcShipping = useCallback(async () => {
    if (!recipientProvince || items.length === 0) return;
    try {
      const result = await api.calcShipping(recipientProvince, shippingMethod, totalWeight);
      setShippingCalc(result);
    } catch (e: any) {
      setShippingCalc(null);
    }
  }, [recipientProvince, shippingMethod, totalWeight, items]);

  useEffect(() => { calcShipping(); }, [calcShipping]);

  // 添加商品行
  const addItem = () => {
    setItems([...items, {
      key: Date.now().toString(),
      product_code: "", product_name: "", quantity: 1,
      unit_price: 0, unit_weight: 0, subtotal: 0,
    }]);
  };

  const removeItem = (key: string) => {
    setItems(items.filter(i => i.key !== key));
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === "product_code") {
        const prod = products.find(p => p.code === value);
        if (prod) {
          updated.product_name = prod.name;
          updated.unit_price = prod.unit_price;
          updated.unit_weight = prod.weight;
        }
      }
      updated.subtotal = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  // 提交
  const handleSubmit = async () => {
    if (!recipientName || !recipientPhone || !recipientProvince || !recipientAddress) {
      MessagePlugin.warning("请填写完整的收件信息");
      return;
    }
    if (items.length === 0) {
      MessagePlugin.warning("请至少添加一个商品");
      return;
    }
    // 校验商品选择
    for (const item of items) {
      if (!item.product_code) { MessagePlugin.warning("请选择所有商品"); return; }
      if (item.quantity <= 0) { MessagePlugin.warning("商品数量必须大于0"); return; }
    }
    setLoading(true);
    try {
      await api.createOrder({
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_province: recipientProvince,
        recipient_city: recipientCity,
        recipient_district: recipientDistrict,
        recipient_address: recipientAddress,
        shipping_method: shippingMethod,
        shipping_zone: shippingCalc?.zone?.label || "",
        total_weight: totalWeight,
        shipping_fee: shippingFee,
        packing_fee: packingFee,
        product_total: productTotal,
        order_total: orderTotal,
        note,
        items: items.map(i => ({
          product_code: i.product_code,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unit_weight: i.unit_weight,
        })),
      });
      MessagePlugin.success("下单成功");
      navigate("/customer/orders");
    } catch (e: any) {
      MessagePlugin.error(e.message || "下单失败");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 600 }}>下单</h2>

      {/* 收件信息 */}
      <Card bordered title="收件信息" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Textarea
                placeholder="粘贴完整地址一键识别（示例：张三 13800138000 广东省深圳市南山区科技园路1号）"
                value={addressRaw}
                onChange={(v: string) => setAddressRaw(v)}
                rows={2}
              />
            </div>
            <Button theme="default" onClick={parseAddress}>识别拆分</Button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>收件人姓名 *</div>
            <Input value={recipientName} onChange={(v) => setRecipientName(v as string)} placeholder="收件人" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>手机号 *</div>
            <Input value={recipientPhone} onChange={(v) => setRecipientPhone(v as string)} placeholder="手机号" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>省份 *</div>
            <Select
              value={recipientProvince}
              onChange={(v) => setRecipientProvince(v as string)}
              placeholder="选择省份"
              filterable
              options={provinceList.map(p => ({ label: p, value: p }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>城市</div>
            <Input value={recipientCity} onChange={(v) => setRecipientCity(v as string)} placeholder="城市" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginTop: 16 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>区/县</div>
            <Input value={recipientDistrict} onChange={(v) => setRecipientDistrict(v as string)} placeholder="区/县" />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>详细地址 *</div>
            <Input value={recipientAddress} onChange={(v) => setRecipientAddress(v as string)} placeholder="街道门牌号" />
          </div>
        </div>
      </Card>

      {/* 商品明细 */}
      <Card bordered title="商品明细" style={{ marginBottom: 16 }}
        actions={<Button size="small" icon={<AddIcon />} onClick={addItem}>添加商品</Button>}
      >
        {items.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", padding: 32 }}>
            请点击"添加商品"按钮添加下单产品
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
                <th style={{ padding: "8px 8px", fontSize: 13, color: "#999", width: 140 }}>产品编码</th>
                <th style={{ padding: "8px 8px", fontSize: 13, color: "#999" }}>产品名称</th>
                <th style={{ padding: "8px 8px", fontSize: 13, color: "#999", width: 100 }}>数量</th>
                <th style={{ padding: "8px 8px", fontSize: 13, color: "#999", width: 100 }}>单价</th>
                <th style={{ padding: "8px 8px", fontSize: 13, color: "#999", width: 100 }}>单品重量(kg)</th>
                <th style={{ padding: "8px 8px", fontSize: 13, color: "#999", width: 100 }}>小计</th>
                <th style={{ padding: "8px 8px", fontSize: 13, color: "#999", width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "6px 8px" }}>
                    <Select
                      value={item.product_code}
                      onChange={(v) => updateItem(item.key, "product_code", v)}
                      placeholder="选择"
                      filterable
                      size="small"
                      options={products.map(p => ({ label: p.code, value: p.code }))}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", fontSize: 13 }}>{item.product_name}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <InputNumber
                      value={item.quantity}
                      onChange={(v) => updateItem(item.key, "quantity", v)}
                      min={1}
                      size="small"
                      style={{ width: 80 }}
                    />
                  </td>
                  <td style={{ padding: "6px 8px", fontSize: 13 }}>¥{item.unit_price}</td>
                  <td style={{ padding: "6px 8px", fontSize: 13 }}>{item.unit_weight}</td>
                  <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: 500 }}>¥{item.subtotal.toFixed(2)}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <Button variant="text" theme="danger" size="small" icon={<DeleteIcon />}
                      onClick={() => removeItem(item.key)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* 运输 & 费用 */}
      <Card bordered title="运输方式 & 费用" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>发货方式</div>
            <Select
              value={shippingMethod}
              onChange={(v) => setShippingMethod(v as any)}
              options={[
                { label: "普通陆运（按分区计费）", value: "standard" },
                { label: "顺丰空运（全国统一首重23/续重15）", value: "sf_air" },
              ]}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 13, color: "#666" }}>备注</div>
            <Input value={note} onChange={(v) => setNote(v as string)} placeholder="选填" />
          </div>
        </div>

        <div style={{
          background: "#f9fafb", borderRadius: 8, padding: 16,
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>商品总重</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{totalWeight.toFixed(2)} kg</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>货款</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#e34d59" }}>¥{productTotal.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>运费</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>¥{shippingFee.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>打包费</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>¥{packingFee.toFixed(2)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>订单总额</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#e34d59" }}>¥{orderTotal.toFixed(2)}</div>
          </div>
        </div>
        {shippingCalc && (
          <div style={{ marginTop: 12, fontSize: 12, color: "#999" }}>
            {shippingCalc.zone?.label} | 首重{shippingCalc.firstWeight}kg ¥{
              shippingMethod === "sf_air" ? "23" : shippingCalc.zone?.zone_name === "zone1" ? "8" : shippingCalc.zone?.zone_name === "zone2" ? "13" : "15"
            }
            / 续重 ¥{shippingMethod === "sf_air" ? "15" : shippingCalc.zone?.zone_name === "zone1" ? "4" : shippingCalc.zone?.zone_name === "zone2" ? "7" : "10"}
            /kg + 打包费 ¥2
          </div>
        )}
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <Button onClick={() => navigate(-1)}>取消</Button>
        <Button theme="primary" size="large" onClick={handleSubmit} loading={loading}>
          提交订单 (¥{orderTotal.toFixed(2)})
        </Button>
      </div>
    </div>
  );
}
