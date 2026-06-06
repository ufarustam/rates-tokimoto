import { useState, useCallback } from "react";

function parseNumber(str) {
  if (!str) return null;
  const clean = String(str).replace(/[^\d.,]/g, "").replace(",", ".");
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

function calcRates(raw) {
  const cbJPY      = parseNumber(raw.cbJPY);
  const cbUSD      = parseNumber(raw.cbUSD);
  const cbCNY      = parseNumber(raw.cbCNY);
  const forexUSDJPY = parseNumber(raw.forexUSDJPY);
  const moexCNY    = parseNumber(raw.moexCNY);
  const vtbCNY     = parseNumber(raw.vtbCNY);
  const usdFutures = parseNumber(raw.usdFutures);
  const usdP2P     = parseNumber(raw.usdP2P);

  const crossFutures = usdFutures && forexUSDJPY ? usdFutures / forexUSDJPY : null;
  const crossP2P     = usdP2P     && forexUSDJPY ? usdP2P     / forexUSDJPY : null;

  // Расчётные курсы
  const calcJPY = crossP2P ? crossP2P * 1.02 : null; // Cross P2P + 2%
  const calcCNY = moexCNY  ? moexCNY  * 1.05 : null; // MOEX + 5%
  const calcUSD = cbUSD    ? cbUSD    * 1.02 : null; // ЦБ + 2%

  return {
    cbJPY, cbUSD, cbCNY, forexUSDJPY, moexCNY, vtbCNY, usdFutures, usdP2P,
    crossFutures, crossP2P, calcJPY, calcCNY, calcUSD,
  };
}

function fmt(val, decimals = 4) {
  if (val == null) return "—";
  return val.toFixed(decimals);
}

function Row({ label, value, highlight, unit = "₽" }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>{label}</span>
      <span style={{
        fontFamily: "monospace", fontSize: 13,
        fontWeight: highlight ? 700 : 400,
        color: highlight ? "#34d399" : "#e2e8f0",
        background: highlight ? "rgba(52,211,153,0.08)" : "transparent",
        padding: highlight ? "2px 8px" : "2px 0", borderRadius: 4,
      }}>
        {value !== "—" ? `${value} ${unit}` : "—"}
      </span>
    </div>
  );
}

function Section({ emoji, title, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "16px 18px", marginBottom: 12,
    }}>
      <div style={{
        fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 8, letterSpacing: 0.5,
      }}>
        {emoji} {title}
      </div>
      {children}
    </div>
  );
}

function CalcBlock({ flag, title, value, formula }) {
  return (
    <div style={{
      flex: 1,
      background: "rgba(52,211,153,0.05)",
      border: "1px solid rgba(52,211,153,0.2)",
      borderRadius: 12, padding: "16px 20px",
    }}>
      <div style={{ fontSize: 12, color: "#64748b", fontFamily: "monospace", marginBottom: 6 }}>
        {flag} {title}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 700, color: "#34d399", fontFamily: "monospace", marginBottom: 4,
      }}>
        {value !== "—" ? `${value} ₽` : "—"}
      </div>
      <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", whiteSpace: "pre-line" }}>{formula}</div>
    </div>
  );
}

function EditableField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{
        display: "block", fontSize: 10, color: "#64748b", fontFamily: "monospace",
        marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.8,
      }}>{label}</label>
      <input
        type="number" step="any" value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6,
          color: "#e2e8f0", fontFamily: "monospace", fontSize: 13,
          padding: "6px 10px", outline: "none", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ fontSize: 10, color: "#475569", margin: "10px 0 6px", textTransform: "uppercase", letterSpacing: 0.8 }}>
      {label}
    </div>
  );
}

export default function App() {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,"0")}.${String(today.getMonth()+1).padStart(2,"0")}.${today.getFullYear()}`;

  const [raw, setRaw] = useState({
    cbJPY: "", cbUSD: "", cbCNY: "",
    forexUSDJPY: "", moexCNY: "", vtbCNY: "",
    usdFutures: "", usdP2P: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [log, setLog] = useState([]);
  const [showData, setShowData] = useState(false);
  const [pipelineText, setPipelineText] = useState("");
  const [reportText, setReportText] = useState("");

  const set = (key) => (val) => setRaw((prev) => ({ ...prev, [key]: val }));
  const r = calcRates(raw);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setStatus("Запрашиваю курсы...");
    setLog([]);

    const prompt = `Сегодня ${dateStr}. Найди актуальные курсы и верни ТОЛЬКО JSON без пояснений.

Нужны ровно 8 значений:
- cbJPY: рублей за 1 иену, курс ЦБ РФ (диапазон 0.40–0.70)
- cbUSD: рублей за 1 доллар США, курс ЦБ РФ (диапазон 70–100)
- cbCNY: рублей за 1 юань CNY, курс ЦБ РФ (диапазон 9–14)
- usdJPY: рыночный курс USD/JPY на Forex (сколько иен за 1 доллар). Ищи на investing.com или tradingview. ВАЖНО: это НЕ JPY/RUB, это доллар к иене. Диапазон 140–165.
- moexCNY: рублей за 1 юань CNY на Московской бирже (диапазон 9–14)
- vtbCNY: рублей за 1 юань CNY, курс ВТБ (если недоступен — используй moexCNY)
- usdFutures: рублей за 1 доллар США по вечному фьючерсу USDRUBF на Московской бирже (тикер USDRUBF). ВАЖНО: это НЕ курс ЦБ, это биржевой фьючерс, он обычно выше ЦБ на 1-3%. Ищи на moex.com или profinance.ru. Диапазон 70–100.
- usdP2P: рублей за 1 USDT на P2P рынке BingX или Bybit. Диапазон 72–100.

{"cbJPY":число,"cbUSD":число,"cbCNY":число,"usdJPY":число,"moexCNY":число,"vtbCNY":число,"usdFutures":число,"usdP2P":число}

Только JSON, никакого текста вокруг.`;

    try {
      const claudeData = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.REACT_APP_ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      }).then(r => r.json());

      const logLines = [];
      claudeData.content?.forEach((block) => {
        if (block.type === "tool_use") logLines.push(`🔍 ${block.input?.query || "..."}`);
      });

      const textBlock = claudeData.content?.find((b) => b.type === "text");
      const text = textBlock?.text || "";
      setLog(logLines);

      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error("JSON не найден: " + text.slice(0, 200));
      const parsed = JSON.parse(jsonMatch[0]);

      const ranges = {
        cbJPY:[0.35,0.80], cbUSD:[60,120], cbCNY:[8,16],
        usdJPY:[130,175], moexCNY:[8,16], vtbCNY:[8,16],
        usdFutures:[60,120], usdP2P:[60,120],
      };
      const warnings = [];
      Object.entries(ranges).forEach(([key,[min,max]]) => {
        const v = parsed[key];
        if (v != null && (v < min || v > max)) warnings.push(`⚠️ ${key} = ${v} (ожидалось ${min}–${max})`);
      });

      setRaw({
        cbJPY:       parsed.cbJPY      != null ? String(parsed.cbJPY)      : "",
        cbUSD:       parsed.cbUSD      != null ? String(parsed.cbUSD)      : "",
        cbCNY:       parsed.cbCNY      != null ? String(parsed.cbCNY)      : "",
        forexUSDJPY: parsed.usdJPY     != null ? String(parsed.usdJPY)     : "",
        moexCNY:     parsed.moexCNY    != null ? String(parsed.moexCNY)    : "",
        vtbCNY:      parsed.vtbCNY     != null ? String(parsed.vtbCNY)     : "",
        usdFutures:  parsed.usdFutures != null ? String(parsed.usdFutures) : "",
        usdP2P:      parsed.usdP2P     != null ? String(parsed.usdP2P)     : "",
      });

      if (warnings.length > 0) {
        setLog(prev => [...prev, ...warnings]);
        setStatus("⚠️ Курсы получены, проверь значения!");
      } else {
        setStatus("✅ Курсы получены.");
      }
    } catch (err) {
      setStatus("❌ Ошибка: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  const copyReport = () => {
    const lines = [
      `📅 ${dateStr}`,
      ``,
      `🇯🇵 ЯПОНИЯ`,
      `JPY/RUB ЦБ ........... ${fmt(r.cbJPY)}`,
      `JPY/RUB Cross Futures  ${fmt(r.crossFutures)}`,
      `JPY/RUB Cross P2P .... ${fmt(r.crossP2P)}`,
      ``,
      `🇨🇳 КИТАЙ`,
      `CNY/RUB ЦБ ........... ${fmt(r.cbCNY, 4)}`,
      `CNY/RUB MOEX ......... ${fmt(r.moexCNY, 4)}`,
      `CNY/RUB ВТБ .......... ${fmt(r.vtbCNY, 4)}`,
      ``,
      `🇺🇸 США`,
      `USD/RUB ЦБ ........... ${fmt(r.cbUSD, 4)}`,
      `USD/JPY Forex ......... ${fmt(r.forexUSDJPY, 2)}`,
      `USD/RUB Futures ...... ${fmt(r.usdFutures, 4)}`,
      `USD/RUB P2P .......... ${fmt(r.usdP2P, 4)}`,
      ``,
      `📊 КУРСЫ ДЛЯ РАСЧЁТА`,
      `Япония JPY/RUB ....... ${fmt(r.calcJPY)} (Cross P2P +2%)`,
      `Китай  CNY/RUB ....... ${fmt(r.calcCNY, 4)} (MOEX +5%)`,
      `США    USD/RUB ....... ${fmt(r.calcUSD, 4)} (ЦБ +2%)`,
    ].join("\n");
    setReportText(prev => prev ? "" : lines);
  };

  const exportPipeline = () => {
    const usdJPYpipeline = r.forexUSDJPY ? r.forexUSDJPY * 0.98 : null;
    const content = [
      `Дата: ${dateStr}`,
      ``,
      `USD/RUB: ${fmt(r.calcUSD, 2)}`,
      `JPY/RUB: ${fmt(r.calcJPY)}`,
      `USD/JPY: ${fmt(usdJPYpipeline, 2)}`,
      `CNY/RUB: ${fmt(r.calcCNY, 4)}`,
      ``,
      `НДС: 22%`,
      `Акциз: 613 ₽/л.с.`,
    ].join("\n");
    setPipelineText(prev => prev ? "" : content);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0b0f1a", color: "#e2e8f0",
      fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
      padding: "24px 16px", boxSizing: "border-box",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginBottom: 4 }}>
          Рабочие курсы валют
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>📅 {dateStr}</div>
        <div style={{ fontSize: 10, color: "#334155", marginTop: 6, letterSpacing: 0.5 }}>
          Rustam Shigapov ©
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={fetchRates} disabled={loading} style={{
          background: loading ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #4f46e5)",
          color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px",
          fontSize: 13, fontFamily: "monospace", fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer", letterSpacing: 0.5,
        }}>
          {loading ? "⏳ Получаю курсы..." : "🌐 Получить курсы автоматически"}
        </button>

        <button onClick={() => setShowData(v => !v)} style={{
          background: showData ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          color: showData ? "#e2e8f0" : "#64748b",
          border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 18px",
          fontSize: 13, fontFamily: "monospace", cursor: "pointer", letterSpacing: 0.3,
        }}>
          {showData ? "✏️ Скрыть данные" : "✏️ Редактировать данные"}
        </button>
      </div>

      {/* Status */}
      {status && (
        <div style={{
          textAlign: "center", marginBottom: 10, fontSize: 12,
          color: status.startsWith("✅") || status.startsWith("📋") ? "#34d399"
            : status.startsWith("❌") ? "#f87171"
            : status.startsWith("⚠️") ? "#fbbf24" : "#94a3b8",
        }}>{status}</div>
      )}
      {log.length > 0 && (
        <div style={{ textAlign: "center", marginBottom: 12, fontSize: 10, color: "#475569" }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {/* Editable data panel — hidden by default */}
      {showData && (
        <div style={{ maxWidth: 1000, margin: "0 auto 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12, letterSpacing: 0.5 }}>✏️ ДАННЫЕ</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0 20px" }}>
            <div>
              <Divider label="ЦБ РФ" />
              <EditableField label="JPY/RUB ЦБ"  value={raw.cbJPY}  onChange={set("cbJPY")}  placeholder="0.4643" />
              <EditableField label="USD/RUB ЦБ"  value={raw.cbUSD}  onChange={set("cbUSD")}  placeholder="73.47" />
              <EditableField label="CNY/RUB ЦБ"  value={raw.cbCNY}  onChange={set("cbCNY")}  placeholder="10.40" />
            </div>
            <div>
              <Divider label="MOEX / ВТБ" />
              <EditableField label="CNY/RUB MOEX" value={raw.moexCNY} onChange={set("moexCNY")} placeholder="10.80" />
              <EditableField label="CNY/RUB ВТБ"  value={raw.vtbCNY}  onChange={set("vtbCNY")}  placeholder="10.85" />
            </div>
            <div>
              <Divider label="США рынок" />
              <EditableField label="USD/JPY Forex"  value={raw.forexUSDJPY} onChange={set("forexUSDJPY")} placeholder="159.95" />
              <EditableField label="USD Futures" value={raw.usdFutures}  onChange={set("usdFutures")}  placeholder="73.96" />
              <EditableField label="USD P2P"     value={raw.usdP2P}      onChange={set("usdP2P")}      placeholder="77.70" />
            </div>
          </div>
        </div>
      )}

      {/* 3 info columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, maxWidth: 1000, margin: "0 auto" }}>

        <Section emoji="🇯🇵" title="ЯПОНИЯ">
          <Row label="JPY/RUB ЦБ"          value={fmt(r.cbJPY)} />
          <Row label="JPY/RUB Cross Futures" value={fmt(r.crossFutures)} />
          <Row label="JPY/RUB Cross P2P"    value={fmt(r.crossP2P)} highlight />
        </Section>

        <Section emoji="🇨🇳" title="КИТАЙ">
          <Row label="CNY/RUB ЦБ"   value={fmt(r.cbCNY, 4)} />
          <Row label="CNY/RUB MOEX" value={fmt(r.moexCNY, 4)} highlight />
          <Row label="CNY/RUB ВТБ"  value={fmt(r.vtbCNY, 4)} />
        </Section>

        <Section emoji="🇺🇸" title="США">
          <Row label="USD/RUB ЦБ"      value={fmt(r.cbUSD, 4)} />
          <Row label="USD/JPY Forex"    value={fmt(r.forexUSDJPY, 2)} unit="" />
          <Row label="USD/RUB Futures"  value={fmt(r.usdFutures, 4)} />
          <Row label="USD/RUB P2P"      value={fmt(r.usdP2P, 4)} highlight />
        </Section>

      </div>

      {/* Расчётные курсы — горизонтальные блоки */}
      <div style={{ display: "flex", gap: 12, maxWidth: 1000, margin: "12px auto 0" }}>
        <CalcBlock
          flag="🇯🇵"
          title="Курс для расчёта — ЯПОНИЯ"
          value={fmt(r.calcJPY)}
          formula="JPY/RUB Cross P2P + 2%"
        />
        <CalcBlock
          flag="🇨🇳"
          title="Курс для расчёта — КИТАЙ"
          value={fmt(r.calcCNY, 4)}
          formula={"CNY/RUB MOEX + 5%\n(Примерный курс с комиссией банка ВТБ)"}
        />
        <CalcBlock
          flag="🇺🇸"
          title="Курс для расчёта — США"
          value={fmt(r.calcUSD, 4)}
          formula="USD/RUB ЦБ + 2%"
        />
      </div>

      {/* Disclaimer */}
      <div style={{
        maxWidth: 1000, margin: "16px auto 8px",
        fontSize: 11, color: "#4b5563",
        fontFamily: "monospace", textAlign: "center", letterSpacing: 0.3,
      }}>
        ⚠️ Курсы ориентировочные. Рассчитаны на момент получения данных.
      </div>

      {/* Bottom buttons */}
      <div style={{ maxWidth: 1000, margin: "12px auto 0", display: "flex", gap: 10 }}>
        <button onClick={copyReport} style={{
          flex: 1, background: reportText ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8,
          color: reportText ? "#e2e8f0" : "#64748b", padding: "10px", fontSize: 12,
          fontFamily: "monospace", cursor: "pointer",
        }}>
          {reportText ? "✖ Скрыть отчёт" : "📋 Показать отчёт"}
        </button>
        <button onClick={exportPipeline} style={{
          flex: 1, background: pipelineText ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.30)", borderRadius: 8,
          color: "#818cf8", padding: "10px", fontSize: 12,
          fontFamily: "monospace", cursor: "pointer", fontWeight: 600,
        }}>
          {pipelineText ? "✖ Скрыть" : "📄 Сформировать для Japan Moto"}
        </button>
      </div>

      {/* Report text block */}
      {reportText && (
        <div style={{ maxWidth: 1000, margin: "10px auto 0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 6 }}>
            ↓ Нажми на поле — выделится всё. Затем Ctrl+C.
          </div>
          <textarea readOnly value={reportText} onClick={(e) => e.target.select()}
            style={{
              width: "100%", boxSizing: "border-box", background: "#0f1623",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#e2e8f0",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 13,
              padding: "14px 16px", lineHeight: 1.8, resize: "none", outline: "none",
            }}
            rows={reportText.split("\n").length + 1}
          />
        </div>
      )}

      {/* Pipeline text block */}
      {pipelineText && (
        <div style={{ maxWidth: 1000, margin: "10px auto 0" }}>
          <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", marginBottom: 6 }}>
            ↓ Нажми на поле — выделится всё. Затем Ctrl+C → вставь в CURRENT_RATES.txt.
          </div>
          <textarea readOnly value={pipelineText} onClick={(e) => e.target.select()}
            style={{
              width: "100%", boxSizing: "border-box", background: "#0f1623",
              border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, color: "#e2e8f0",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 13,
              padding: "14px 16px", lineHeight: 1.8, resize: "none", outline: "none",
            }}
            rows={pipelineText.split("\n").length + 1}
          />
        </div>
      )}
    </div>
  );
}
