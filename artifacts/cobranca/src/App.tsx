import { useState, useEffect } from “react”;

const SUPABASE_URL = “https://rudmspshxrvebwqbyaqx.supabase.co”;
const SUPABASE_KEY = “eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZG1zcHNoeHJ2ZWJ3cWJ5YXF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNDU1NzUsImV4cCI6MjA5MjkyMTU3NX0.6-pf5F4dSaLFrSbIckzP-P7GBfWvX9K1CaWfQPfgsGE”;

const db = {
async get(table, filters = {}) {
let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
for (const [k, v] of Object.entries(filters)) url += `&${k}=eq.${v}`;
const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
return res.json();
},
async insert(table, data) {
await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
method: “POST”,
headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, “Content-Type”: “application/json”, Prefer: “return=minimal” },
body: JSON.stringify(data),
});
},
async update(table, id, data) {
await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
method: “PATCH”,
headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, “Content-Type”: “application/json” },
body: JSON.stringify(data),
});
},
async remove(table, id) {
await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
method: “DELETE”,
headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
});
},
};

const COLORS = {
1: { accent: “#e94560”, light: “#16213e” },
2: { accent: “#f5a623”, light: “#0a2540” },
3: { accent: “#52b788”, light: “#0d2818” },
4: { accent: “#ff6b6b”, light: “#2a0000” },
};

const STATUS_LABEL = { pendente: “Pendente”, pago: “Pago”, atrasado: “Atrasado” };
const STATUS_COLOR = { pendente: “#f5a623”, pago: “#52b788”, atrasado: “#e94560” };

function generateId() {
return Math.random().toString(36).substr(2, 9);
}

export default function App() {
const [cities, setCities] = useState([]);
const [pagantes, setPagantes] = useState([]);
const [selectedCity, setSelectedCity] = useState(null);
const [loading, setLoading] = useState(true);
const [modal, setModal] = useState(null);
const [form, setForm] = useState({ nome: “”, valor: “”, telefone: “” });
const [deleteTarget, setDeleteTarget] = useState(null);
const [editCityForm, setEditCityForm] = useState({});
const [notification, setNotification] = useState(null);

useEffect(() => { loadAll(); }, []);

async function loadAll() {
setLoading(true);
const [cs, ps] = await Promise.all([db.get(“cidades”), db.get(“pagantes”)]);
setCities(cs);
setPagantes(ps);
if (cs.length > 0) setSelectedCity(cs[0].id);
setLoading(false);
}

function showNotification(msg, type = “success”) {
setNotification({ msg, type });
setTimeout(() => setNotification(null), 2500);
}

const city = cities.find((c) => c.id === selectedCity);
const cityPagantes = pagantes.filter((p) => p.cidade_id === selectedCity);
const cor = COLORS[selectedCity] || COLORS[1];

async function addPagante() {
if (!form.nome.trim() || !form.valor.trim()) return;
const valor = parseFloat(form.valor.replace(”,”, “.”));
if (isNaN(valor) || valor <= 0) return;
const novo = {
id: generateId(),
cidade_id: selectedCity,
nome: form.nome.trim(),
valor,
telefone: form.telefone.trim(),
status: “pendente”,
criado_em: new Date().toLocaleDateString(“pt-BR”),
};
setPagantes((prev) => […prev, novo]);
setForm({ nome: “”, valor: “”, telefone: “” });
setModal(null);
showNotification(`${novo.nome} adicionado!`);
await db.insert(“pagantes”, novo);
}

async function updateStatus(paganteId, status) {
setPagantes((prev) => prev.map((p) => p.id === paganteId ? { …p, status } : p));
await db.update(“pagantes”, paganteId, { status });
}

async function deletePagante(paganteId) {
setPagantes((prev) => prev.filter((p) => p.id !== paganteId));
setDeleteTarget(null);
setModal(null);
showNotification(“Pagante removido.”, “warning”);
await db.remove(“pagantes”, paganteId);
}

async function saveEditCity() {
const nome = editCityForm.nome || city.nome;
const dia_cobranca = parseInt(editCityForm.diaCobranca) || city.dia_cobranca;
setCities((prev) => prev.map((c) => c.id === selectedCity ? { …c, nome, dia_cobranca } : c));
setModal(null);
showNotification(“Cidade atualizada!”);
await db.update(“cidades”, selectedCity, { nome, dia_cobranca });
}

const fmt = (v) => Number(v).toLocaleString(“pt-BR”, { style: “currency”, currency: “BRL” });

const totalPago = cityPagantes.filter((p) => p.status === “pago”).reduce((s, p) => s + Number(p.valor), 0);
const totalPendente = cityPagantes.filter((p) => p.status === “pendente”).reduce((s, p) => s + Number(p.valor), 0);
const totalAtrasado = cityPagantes.filter((p) => p.status === “atrasado”).reduce((s, p) => s + Number(p.valor), 0);

if (loading) return (
<div style={{ minHeight: “100vh”, background: “#0a0a0f”, display: “flex”, alignItems: “center”, justifyContent: “center”, color: “#444”, fontSize: 16, fontFamily: “Georgia, serif” }}>
Carregando dados…
</div>
);

return (
<div style={{ minHeight: “100vh”, background: “#0a0a0f”, color: “#e8e8f0”, fontFamily: “‘Georgia’, serif” }}>
{notification && (
<div style={{
position: “fixed”, top: 24, right: 24, zIndex: 9999,
background: notification.type === “warning” ? “#3d2200” : “#0d2818”,
border: `1px solid ${notification.type === "warning" ? "#f5a623" : "#52b788"}`,
color: notification.type === “warning” ? “#f5a623” : “#52b788”,
padding: “12px 20px”, borderRadius: 8, fontSize: 14,
boxShadow: “0 4px 20px rgba(0,0,0,0.5)”, animation: “fadeIn 0.3s ease”,
}}>{notification.msg}</div>
)}

```
  <div style={{ background: "#111118", borderBottom: "1px solid #1e1e30", padding: "18px 32px", display: "flex", alignItems: "center" }}>
    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>💳 Sistema de Cobrança Mensal</div>
    <div style={{ marginLeft: "auto", fontSize: 13, color: "#555", fontFamily: "monospace" }}>
      {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
    </div>
  </div>

  <div style={{ display: "flex", height: "calc(100vh - 61px)" }}>
    {/* SIDEBAR */}
    <div style={{ width: 220, background: "#0d0d16", borderRight: "1px solid #1e1e30", padding: "24px 0", flexShrink: 0 }}>
      <div style={{ padding: "0 16px 16px", fontSize: 11, letterSpacing: 3, color: "#444", textTransform: "uppercase" }}>Cidades</div>
      {cities.map((c) => {
        const isSelected = c.id === selectedCity;
        const cCor = COLORS[c.id] || COLORS[1];
        const totalCity = pagantes.filter((p) => p.cidade_id === c.id).reduce((s, p) => s + Number(p.valor), 0);
        return (
          <div key={c.id} onClick={() => setSelectedCity(c.id)} style={{
            padding: "14px 16px", cursor: "pointer",
            borderLeft: isSelected ? `3px solid ${cCor.accent}` : "3px solid transparent",
            background: isSelected ? cCor.light : "transparent",
            transition: "all 0.2s", marginBottom: 2,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cCor.accent, flexShrink: 0 }} />
              <div style={{ fontSize: 14, fontWeight: isSelected ? 700 : 400, color: isSelected ? "#fff" : "#aaa" }}>{c.nome}</div>
            </div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4, paddingLeft: 16 }}>
              Dia {c.dia_cobranca} • {pagantes.filter((p) => p.cidade_id === c.id).length} pagantes
            </div>
            <div style={{ fontSize: 12, color: cCor.accent, marginTop: 2, paddingLeft: 16, fontFamily: "monospace" }}>{fmt(totalCity)}</div>
          </div>
        );
      })}
    </div>

    {/* MAIN */}
    {city && (
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #1e1e30" }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: cor.accent }} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{city.nome}</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
              Cobrança todo dia <span style={{ color: cor.accent, fontWeight: 700 }}>{city.dia_cobranca}</span> do mês
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={() => { setEditCityForm({ nome: city.nome, diaCobranca: city.dia_cobranca }); setModal("editCity"); }}
              style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: 13 }}>
              ✏️ Editar Cidade
            </button>
            <button onClick={() => { setForm({ nome: "", valor: "", telefone: "" }); setModal("addPagante"); }}
              style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: cor.accent, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              + Pagante
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Recebido", value: totalPago, color: "#52b788" },
            { label: "Pendente", value: totalPendente, color: "#f5a623" },
            { label: "Atrasado", value: totalAtrasado, color: "#e94560" },
          ].map((s) => (
            <div key={s.label} style={{ background: "#111118", border: "1px solid #1e1e30", borderRadius: 10, padding: "18px 20px" }}>
              <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 2 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginTop: 6, fontFamily: "monospace" }}>{fmt(s.value)}</div>
            </div>
          ))}
        </div>

        {cityPagantes.length === 0 ? (
          <div style={{ textAlign: "center", color: "#444", padding: "60px 0", fontSize: 15 }}>
            Nenhum pagante cadastrado nesta cidade.<br />
            <span style={{ fontSize: 13 }}>Clique em "+ Pagante" para adicionar.</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cityPagantes.map((p) => (
              <div key={p.id} style={{ background: "#111118", border: "1px solid #1e1e30", borderRadius: 10, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: cor.light, border: `2px solid ${cor.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: cor.accent, flexShrink: 0 }}>
                  {p.nome[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.nome}</div>
                  {p.telefone && <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{p.telefone}</div>}
                  <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Adicionado em {p.criado_em}</div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 700 }}>{fmt(p.valor)}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["pendente", "pago", "atrasado"].map((s) => (
                    <button key={s} onClick={() => updateStatus(p.id, s)} style={{
                      padding: "5px 11px", borderRadius: 5, fontSize: 11, cursor: "pointer",
                      border: `1px solid ${p.status === s ? STATUS_COLOR[s] : "#2a2a3a"}`,
                      background: p.status === s ? STATUS_COLOR[s] + "22" : "transparent",
                      color: p.status === s ? STATUS_COLOR[s] : "#555",
                      fontWeight: p.status === s ? 700 : 400, transition: "all 0.15s",
                    }}>{STATUS_LABEL[s]}</button>
                  ))}
                </div>
                <button onClick={() => { setDeleteTarget(p); setModal("confirmDelete"); }}
                  style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: 16, padding: "4px 8px" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>

  {/* MODAIS */}
  {modal && (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      {modal === "addPagante" && (
        <div style={{ background: "#111118", border: "1px solid #1e1e30", borderRadius: 14, padding: 32, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 22 }}>Novo Pagante — {city?.nome}</div>
          {[
            { label: "Nome *", key: "nome", placeholder: "Nome completo", type: "text" },
            { label: "Valor (R$) *", key: "valor", placeholder: "0,00", type: "text" },
            { label: "Telefone", key: "telefone", placeholder: "(00) 00000-0000", type: "tel" },
          ].map((f) => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{f.label}</div>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && addPagante()}
                style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 7, color: "#e8e8f0", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 7, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer" }}>Cancelar</button>
            <button onClick={addPagante} style={{ flex: 1, padding: 11, borderRadius: 7, border: "none", background: cor.accent, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Adicionar</button>
          </div>
        </div>
      )}

      {modal === "editCity" && (
        <div style={{ background: "#111118", border: "1px solid #1e1e30", borderRadius: 14, padding: 32, width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 22 }}>Editar Cidade</div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Nome da Cidade</div>
            <input value={editCityForm.nome} onChange={(e) => setEditCityForm((p) => ({ ...p, nome: e.target.value }))}
              style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 7, color: "#e8e8f0", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>Dia de Cobrança (1–28)</div>
            <input type="number" min={1} max={28} value={editCityForm.diaCobranca}
              onChange={(e) => setEditCityForm((p) => ({ ...p, diaCobranca: e.target.value }))}
              style={{ width: "100%", background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 7, color: "#e8e8f0", padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 7, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer" }}>Cancelar</button>
            <button onClick={saveEditCity} style={{ flex: 1, padding: 11, borderRadius: 7, border: "none", background: cor.accent, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Salvar</button>
          </div>
        </div>
      )}

      {modal === "confirmDelete" && deleteTarget && (
        <div style={{ background: "#111118", border: "1px solid #3d0000", borderRadius: 14, padding: 32, width: 320, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Remover pagante?</div>
          <div style={{ color: "#aaa", fontSize: 14, marginBottom: 22 }}>
            Tem certeza que deseja remover <strong style={{ color: "#e8e8f0" }}>{deleteTarget.nome}</strong>? Esta ação não pode ser desfeita.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setModal(null)} style={{ flex: 1, padding: 11, borderRadius: 7, border: "1px solid #333", background: "transparent", color: "#aaa", cursor: "pointer" }}>Cancelar</button>
            <button onClick={() => deletePagante(deleteTarget.id)} style={{ flex: 1, padding: 11, borderRadius: 7, border: "none", background: "#e94560", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Remover</button>
          </div>
        </div>
      )}
    </div>
  )}

  <style>{`
    * { box-sizing: border-box; }
    input::placeholder { color: #333; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0a0a0f; }
    ::-webkit-scrollbar-thumb { background: #1e1e30; border-radius: 3px; }
  `}</style>
</div>
```

);
}