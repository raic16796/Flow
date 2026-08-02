import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LayoutGrid, CalendarDays, Fingerprint, Clock3, Wallet, Landmark, BarChart3, Settings as SettingsIcon,
  Plus, X, ChevronLeft, ChevronRight, Check, Copy, Sun, Moon, Trash2, Pencil, PiggyBank,
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, LogIn, LogOut, Bell, Download, Upload, Target
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell
} from "recharts";

/* ============================== CONSTANTS ============================== */

const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
const DAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const STATUS_OPTIONS = ["Kerja", "Libur", "Cuti", "Izin"];
const STATUS_COLOR = {
  Kerja: "#0F766E",
  Libur: "#94A3B8",
  Cuti: "#7C3AED",
  Izin: "#F59E0B",
};

const EXPENSE_CATEGORIES = ["Makanan", "Transportasi", "Kuliah", "Belanja", "Tagihan", "Internet", "Hiburan", "Kesehatan", "Lainnya"];
const INCOME_CATEGORIES = ["Gaji", "Lembur", "Bonus", "Freelance", "Lainnya"];

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { key: "schedule", label: "Jadwal", icon: CalendarDays },
  { key: "attendance", label: "Absensi", icon: Fingerprint },
  { key: "overtime", label: "Lembur", icon: Clock3 },
  { key: "income", label: "Income", icon: Wallet },
  { key: "finance", label: "Finance", icon: Landmark },
  { key: "reports", label: "Laporan", icon: BarChart3 },
  { key: "settings", label: "Setelan", icon: SettingsIcon },
];

const DEFAULT_SETTINGS = {
  name: "Pengguna",
  currency: "IDR",
  payType: "hourly", // hourly | daily | shift | monthly
  normalRate: 20000,
  overtimeRate: 25000,
  monthlySalary: 4500000,
  defaultStart: "09:00",
  defaultEnd: "17:00",
  defaultWorkDays: [1, 2, 3, 4, 5], // 0=Min..6=Sab
  darkMode: false,
  notifEnabled: true,
};

/* ============================== THEME ============================== */

function getTheme(dark) {
  return dark
    ? {
        bg: "#0A0F1C", surface: "#131B2E", surfaceAlt: "#1B2540", surfaceHover: "#202B47",
        text: "#E7EBF3", textMuted: "#8B96AC", border: "#22304E",
        brand: "#2DD4BF", brandStrong: "#0D9488", amber: "#FBBF24", rose: "#FB7185", green: "#4ADE80",
        shadow: "0 8px 24px rgba(0,0,0,0.35)",
      }
    : {
        bg: "#F5F7FA", surface: "#FFFFFF", surfaceAlt: "#EEF2F6", surfaceHover: "#E4E9F0",
        text: "#101828", textMuted: "#66707F", border: "#E3E8EF",
        brand: "#0F766E", brandStrong: "#0B5F58", amber: "#D97706", rose: "#E11D48", green: "#15803D",
        shadow: "0 8px 24px rgba(16,24,40,0.08)",
      };
}

/* ============================== DATE UTILS ============================== */

const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; };
const startOfWeek = (d) => { const nd = new Date(d); const day = nd.getDay(); const diff = day === 0 ? -6 : 1 - day; nd.setDate(nd.getDate() + diff); nd.setHours(0,0,0,0); return nd; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const sameDate = (a, b) => toISO(a) === toISO(b);
const yearMonthKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const toMinutes = (hhmm) => { if (!hhmm) return null; const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const minutesToDur = (min) => {
  if (min == null || isNaN(min)) return "-";
  const sign = min < 0 ? "-" : "";
  min = Math.abs(Math.round(min));
  const h = Math.floor(min / 60), m = min % 60;
  return `${sign}${h} jam ${m} menit`;
};
const formatFullDate = (d) => `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
const formatShortDate = (d) => `${d.getDate()} ${MONTHS_ID[d.getMonth()].slice(0,3)}`;
const formatTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
const formatRupiah = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");

/* ============================== STORAGE HOOK ============================== */

function useStorageState(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get(key, false);
        if (!cancelled && res && res.value != null) {
          setValue(JSON.parse(res.value));
        }
      } catch (e) {
        /* key doesn't exist yet — keep initial */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    if (first.current) { first.current = false; return; }
    (async () => {
      try { await window.storage.set(key, JSON.stringify(value), false); }
      catch (e) { console.error("save failed for", key, e); }
    })();
  }, [value, loaded, key]);

  return [value, setValue, loaded];
}

/* ============================== SMALL UI PRIMITIVES ============================== */

function Card({ theme, children, style, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 18,
        padding: 16, boxShadow: theme.shadow, ...style,
      }}
    >
      {children}
    </div>
  );
}

function Badge({ theme, color, children }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 600, color: "#fff", background: color, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function Button({ theme, children, onClick, variant = "primary", style, disabled, type = "button" }) {
  const base = { border: "none", borderRadius: 12, padding: "11px 16px", fontWeight: 600, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit", opacity: disabled ? 0.5 : 1, transition: "transform 0.08s ease" };
  const variants = {
    primary: { background: theme.brand, color: "#04201D" },
    outline: { background: "transparent", color: theme.text, border: `1px solid ${theme.border}` },
    ghost: { background: theme.surfaceAlt, color: theme.text },
    danger: { background: "rgba(225,29,72,0.12)", color: theme.rose },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}

function IconButton({ theme, icon: Icon, onClick, size = 18, style }) {
  return (
    <button onClick={onClick} style={{
      background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 10, width: 36, height: 36,
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: theme.text, ...style,
    }}>
      <Icon size={size} />
    </button>
  );
}

function ProgressBar({ theme, pct, color }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: 8, borderRadius: 999, background: theme.surfaceAlt, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${clamped}%`, background: color || theme.brand, borderRadius: 999, transition: "width 0.3s ease" }} />
    </div>
  );
}

function Field({ theme, label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = (theme) => ({
  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${theme.border}`,
  background: theme.surfaceAlt, color: theme.text, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
});

function TextInput({ theme, ...props }) { return <input style={inputStyle(theme)} {...props} />; }
function Select({ theme, children, ...props }) { return <select style={inputStyle(theme)} {...props}>{children}</select>; }

function Modal({ theme, title, onClose, children, footer }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(8,10,20,0.55)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: theme.surface, width: "100%", maxWidth: 480, borderRadius: "22px 22px 0 0",
        maxHeight: "88vh", overflowY: "auto", padding: 20, animation: "slideUp 0.22s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, color: theme.text }}>{title}</h3>
          <IconButton theme={theme} icon={X} onClick={onClose} />
        </div>
        {children}
        {footer && <div style={{ marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ theme, children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "22px 0 12px" }}>
      <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, color: theme.text, letterSpacing: 0.2 }}>{children}</h2>
      {right}
    </div>
  );
}

function Empty({ theme, icon: Icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "36px 16px", color: theme.textMuted }}>
      <Icon size={30} style={{ opacity: 0.5, marginBottom: 8 }} />
      <div style={{ fontSize: 13 }}>{text}</div>
    </div>
  );
}

/* ============================== BUSINESS LOGIC ============================== */

function getWorkingDaysInMonth(schedules, monthDate) {
  const y = monthDate.getFullYear(), m = monthDate.getMonth();
  let count = 0;
  Object.entries(schedules).forEach(([iso, s]) => {
    const d = parseISO(iso);
    if (d.getFullYear() === y && d.getMonth() === m && s.status === "Kerja") count++;
  });
  return count || 22;
}

function calcPay(settings, regularMinutes, overtimeMinutes, workingDaysInMonth) {
  const regularHours = regularMinutes / 60;
  const overtimeHours = overtimeMinutes / 60;
  let regularPay = 0;
  if (regularMinutes > 0) {
    if (settings.payType === "hourly") regularPay = settings.normalRate * regularHours;
    else if (settings.payType === "daily" || settings.payType === "shift") regularPay = settings.normalRate;
    else if (settings.payType === "monthly") regularPay = settings.monthlySalary / (workingDaysInMonth || 22);
  }
  const overtimePay = settings.overtimeRate * overtimeHours;
  return { regularPay, overtimePay, totalPay: regularPay + overtimePay };
}

function computeDay(iso, schedules, attendance, settings) {
  const sched = schedules[iso] || null;
  const att = attendance[iso] || null;
  let status = "Belum Absen";
  if (sched && sched.status !== "Kerja") status = sched.status;
  else if (att && att.checkIn && !att.checkOut) status = "Sedang Bekerja";
  else if (att && att.checkIn && att.checkOut) status = "Selesai";

  let workedMinutes = null, regularMinutes = 0, overtimeMinutes = 0;
  let checkInDelta = null, checkOutDelta = null;

  if (att && att.checkIn) {
    const ciMin = toMinutes(att.checkIn);
    if (sched && sched.start) checkInDelta = ciMin - toMinutes(sched.start);
  }
  if (att && att.checkIn && att.checkOut) {
    const ciMin = toMinutes(att.checkIn), coMin = toMinutes(att.checkOut);
    workedMinutes = coMin - ciMin;
    const schedEndMin = sched && sched.start ? toMinutes(sched.end) : null;
    if (sched && sched.start) checkOutDelta = coMin - schedEndMin;

    let otMin = 0;
    if (att.isOvertime && att.overtimeStart && att.overtimeEnd) {
      otMin = Math.max(0, toMinutes(att.overtimeEnd) - toMinutes(att.overtimeStart));
    } else if (schedEndMin != null && coMin > schedEndMin) {
      otMin = coMin - schedEndMin;
    }
    overtimeMinutes = Math.max(0, Math.min(otMin, workedMinutes));
    regularMinutes = Math.max(0, workedMinutes - overtimeMinutes);
  }

  const monthDate = parseISO(iso);
  const workingDays = getWorkingDaysInMonth(schedules, monthDate);
  const pay = calcPay(settings, regularMinutes, overtimeMinutes, workingDays);

  return { iso, sched, att, status, workedMinutes, regularMinutes, overtimeMinutes, checkInDelta, checkOutDelta, ...pay };
}

function deltaLabel(delta, kind) {
  if (delta == null) return null;
  if (delta === 0) return "Tepat waktu";
  if (kind === "in") return delta < 0 ? `${Math.abs(delta)} menit lebih awal` : `Terlambat ${delta} menit`;
  return delta < 0 ? `${Math.abs(delta)} menit lebih awal` : `${delta} menit lebih lama`;
}

/* ============================== APP ============================== */

export default function WorkFlowApp() {
  const [settings, setSettings, sLoaded] = useStorageState("workflow:settings", DEFAULT_SETTINGS);
  const [schedules, setSchedules, schLoaded] = useStorageState("workflow:schedules", {});
  const [attendance, setAttendance, aLoaded] = useStorageState("workflow:attendance", {});
  const [transactions, setTransactions, tLoaded] = useStorageState("workflow:transactions", []);
  const [budgets, setBudgets, bLoaded] = useStorageState("workflow:budgets", {});
  const [savings, setSavings, svLoaded] = useStorageState("workflow:savings", []);

  const [tab, setTab] = useState("dashboard");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const theme = getTheme(settings.darkMode);
  const allLoaded = sLoaded && schLoaded && aLoaded && tLoaded && bLoaded && svLoaded;
  const todayISO = toISO(now);

  const merged = useMemo(() => ({ settings, schedules, attendance }), [settings, schedules, attendance]);

  if (!allLoaded) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg, color: theme.textMuted, fontFamily: "'Inter', sans-serif" }}>
        Memuat WorkFlow…
      </div>
    );
  }

  const ctx = { theme, settings, setSettings, schedules, setSchedules, attendance, setAttendance, transactions, setTransactions, budgets, setBudgets, savings, setSavings, now, todayISO };

  return (
    <div style={{
      minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: "'Inter', sans-serif",
      paddingBottom: 92, transition: "background 0.2s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        button { font-family: inherit; }
        input, select { font-family: inherit; }
      `}</style>

      <TopBar ctx={ctx} />

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px" }}>
        {tab === "dashboard" && <Dashboard ctx={ctx} setTab={setTab} />}
        {tab === "schedule" && <SchedulePage ctx={ctx} />}
        {tab === "attendance" && <AttendancePage ctx={ctx} />}
        {tab === "overtime" && <OvertimePage ctx={ctx} />}
        {tab === "income" && <IncomePage ctx={ctx} />}
        {tab === "finance" && <FinancePage ctx={ctx} />}
        {tab === "reports" && <ReportsPage ctx={ctx} />}
        {tab === "settings" && <SettingsPage ctx={ctx} />}
      </div>

      <BottomNav theme={theme} tab={tab} setTab={setTab} />
    </div>
  );
}

/* ============================== TOP BAR ============================== */

function TopBar({ ctx }) {
  const { theme, settings, setSettings, now } = ctx;
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 40, background: theme.bg + "F2", backdropFilter: "blur(8px)",
      borderBottom: `1px solid ${theme.border}`, padding: "14px 16px",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: 0.2, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: theme.brand, display: "inline-block", animation: "pulse 2s infinite" }} />
            WorkFlow
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(now)}</div>
        </div>
        <IconButton theme={theme} icon={settings.darkMode ? Sun : Moon} onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })} />
      </div>
    </div>
  );
}

/* ============================== BOTTOM NAV ============================== */

function BottomNav({ theme, tab, setTab }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, background: theme.surface,
      borderTop: `1px solid ${theme.border}`, zIndex: 50, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", overflowX: "auto", padding: "6px 4px" }}>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.key;
          const Icon = item.icon;
          return (
            <button key={item.key} onClick={() => setTab(item.key)} style={{
              flex: "0 0 auto", minWidth: 66, background: "transparent", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 6px",
              color: active ? theme.brand : theme.textMuted,
            }}>
              <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ============================== */

function Dashboard({ ctx, setTab }) {
  const { theme, settings, schedules, attendance, setAttendance, transactions, savings, now, todayISO } = ctx;
  const today = computeDay(todayISO, schedules, attendance, settings);
  const weekStart = startOfWeek(now);
  const weekDates = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));
  const monthKey = yearMonthKey(now);

  const weekEarnings = weekDates.reduce((sum, iso) => sum + computeDay(iso, schedules, attendance, settings).totalPay, 0);
  const monthEarnings = Object.keys(attendance).filter((iso) => iso.startsWith(monthKey))
    .reduce((sum, iso) => sum + computeDay(iso, schedules, attendance, settings).totalPay, 0);
  const monthExpense = transactions.filter((t) => t.type === "expense" && t.date.startsWith(monthKey)).reduce((s, t) => s + t.amount, 0);
  const monthIncome = transactions.filter((t) => t.type === "income" && t.date.startsWith(monthKey)).reduce((s, t) => s + t.amount, 0);
  const balance = transactions.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  const tomorrowISO = toISO(addDays(now, 1));
  const tomorrowSched = schedules[tomorrowISO];

  const doCheckIn = () => {
    const hh = pad2(now.getHours()), mm = pad2(now.getMinutes());
    setAttendance({ ...attendance, [todayISO]: { ...(attendance[todayISO] || {}), checkIn: `${hh}:${mm}` } });
  };
  const doCheckOut = () => {
    const hh = pad2(now.getHours()), mm = pad2(now.getMinutes());
    setAttendance({ ...attendance, [todayISO]: { ...(attendance[todayISO] || {}), checkOut: `${hh}:${mm}` } });
  };

  const notifications = useMemo(() => {
    const list = [];
    if (today.sched && today.sched.status === "Kerja") {
      const startMin = toMinutes(today.sched.start);
      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (!today.att?.checkIn && nowMin < startMin && startMin - nowMin <= 60) {
        list.push({ icon: Bell, text: `Jadwal kerja kamu dimulai ${startMin - nowMin} menit lagi.` });
      }
      if (!today.att?.checkIn && nowMin >= startMin) {
        list.push({ icon: Fingerprint, text: "Jangan lupa absen masuk." });
      }
      if (today.att?.checkIn && !today.att?.checkOut) {
        list.push({ icon: Clock3, text: "Kamu masih tercatat sedang bekerja." });
      }
    }
    if (tomorrowSched && tomorrowSched.status === "Kerja") {
      list.push({ icon: CalendarDays, text: `Besok kamu masuk kerja pukul ${tomorrowSched.start}.` });
    }
    return list;
  }, [today, now, tomorrowSched]);

  const isHoliday = today.sched && today.sched.status !== "Kerja";

  return (
    <div>
      <SectionTitle theme={theme}>{formatFullDate(now)}</SectionTitle>

      {isHoliday ? (
        <Card theme={theme} style={{ textAlign: "center", padding: 28, background: `linear-gradient(135deg, ${theme.brand}22, ${theme.surface})` }}>
          <Sparkles size={28} color={theme.brand} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>Hari ini kamu {today.sched.status.toLowerCase()} 🎉</div>
          <div style={{ color: theme.textMuted, fontSize: 13, marginTop: 4 }}>Manfaatkan waktumu untuk istirahat.</div>
        </Card>
      ) : (
        <Card theme={theme} style={{ background: `linear-gradient(135deg, ${theme.brand}18, ${theme.surface})` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600 }}>JADWAL HARI INI</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                {today.sched ? `${today.sched.start} — ${today.sched.end}` : "Belum diatur"}
              </div>
            </div>
            <Badge theme={theme} color={today.status === "Selesai" ? theme.green : today.status === "Sedang Bekerja" ? theme.amber : theme.textMuted}>{today.status}</Badge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
            <MiniStat theme={theme} label="Jam Kerja" value={today.workedMinutes != null ? minutesToDur(today.regularMinutes) : "-"} />
            <MiniStat theme={theme} label="Lembur" value={today.overtimeMinutes ? minutesToDur(today.overtimeMinutes) : "-"} accent={theme.amber} />
          </div>
          <div style={{ marginTop: 10 }}>
            <MiniStat theme={theme} label="Estimasi Penghasilan Hari Ini" value={formatRupiah(today.totalPay)} accent={theme.green} full />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {!today.att?.checkIn && (
              <Button theme={theme} onClick={doCheckIn} style={{ flex: 1 }}><LogIn size={16} /> Absen Masuk</Button>
            )}
            {today.att?.checkIn && !today.att?.checkOut && (
              <Button theme={theme} variant="danger" onClick={doCheckOut} style={{ flex: 1 }}><LogOut size={16} /> Absen Pulang</Button>
            )}
            {today.att?.checkIn && today.att?.checkOut && (
              <div style={{ flex: 1, textAlign: "center", fontSize: 13, color: theme.textMuted, padding: 8 }}>
                Masuk {today.att.checkIn} · Pulang {today.att.checkOut}
              </div>
            )}
            <Button theme={theme} variant="outline" onClick={() => setTab("attendance")}>Detail</Button>
          </div>
        </Card>
      )}

      {tomorrowSched && (
        <Card theme={theme} style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 600 }}>JADWAL BERIKUTNYA</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
              Besok — {tomorrowSched.status === "Kerja" ? `${tomorrowSched.start}–${tomorrowSched.end}` : tomorrowSched.status}
            </div>
          </div>
          <CalendarDays size={20} color={theme.textMuted} />
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <StatCard theme={theme} label="Penghasilan Minggu Ini" value={formatRupiah(weekEarnings)} icon={TrendingUp} color={theme.green} />
        <StatCard theme={theme} label="Penghasilan Bulan Ini" value={formatRupiah(monthEarnings)} icon={Wallet} color={theme.brand} />
        <StatCard theme={theme} label="Pengeluaran Bulan Ini" value={formatRupiah(monthExpense)} icon={TrendingDown} color={theme.rose} />
        <StatCard theme={theme} label="Saldo Saat Ini" value={formatRupiah(balance)} icon={Landmark} color={theme.text} />
      </div>

      {notifications.length > 0 && (
        <>
          <SectionTitle theme={theme}>Pengingat</SectionTitle>
          <Card theme={theme} style={{ padding: 8 }}>
            {notifications.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 8px", borderBottom: i < notifications.length - 1 ? `1px solid ${theme.border}` : "none" }}>
                <n.icon size={16} color={theme.amber} />
                <span style={{ fontSize: 13 }}>{n.text}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}

function MiniStat({ theme, label, value, accent, full }) {
  return (
    <div style={{ background: theme.surfaceAlt, borderRadius: 12, padding: "10px 12px", gridColumn: full ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent || theme.text, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function StatCard({ theme, label, value, icon: Icon, color }) {
  return (
    <Card theme={theme}>
      <Icon size={16} color={color} />
      <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, marginTop: 8 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{value}</div>
    </Card>
  );
}

/* ============================== SCHEDULE PAGE ============================== */

const MONDAY_HEADERS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function getMonthGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function SchedulePage({ ctx }) {
  const { theme, schedules, setSchedules, attendance, settings, now } = ctx;
  const [view, setView] = useState("month"); // month | week
  const [weekStart, setWeekStart] = useState(startOfWeek(now));
  const [monthDate, setMonthDate] = useState(startOfMonth(now));
  const [editing, setEditing] = useState(null); // iso or null
  const [modalOpen, setModalOpen] = useState(false);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const prevWeekStart = addDays(weekStart, -7);
  const monthCells = useMemo(() => getMonthGrid(monthDate), [monthDate]);

  const openEdit = (iso) => {
    const existing = schedules[iso];
    setEditing({
      iso,
      status: existing?.status || "Kerja",
      start: existing?.start || settings.defaultStart,
      end: existing?.end || settings.defaultEnd,
      location: existing?.location || "",
      note: existing?.note || "",
      overtimePlanned: existing?.overtimePlanned || false,
    });
    setModalOpen(true);
  };

  const saveEdit = () => {
    setSchedules({ ...schedules, [editing.iso]: { ...editing } });
    setModalOpen(false);
  };

  const deleteEdit = () => {
    const cp = { ...schedules };
    delete cp[editing.iso];
    setSchedules(cp);
    setModalOpen(false);
  };

  const copyPrevWeek = () => {
    const updated = { ...schedules };
    weekDates.forEach((d, i) => {
      const prevISO = toISO(addDays(prevWeekStart, i));
      const curISO = toISO(d);
      if (schedules[prevISO]) updated[curISO] = { ...schedules[prevISO] };
    });
    setSchedules(updated);
  };

  const editDayInfo = editing ? computeDay(editing.iso, schedules, attendance, settings) : null;

  return (
    <div>
      <SectionTitle theme={theme}
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {view === "month" ? (
              <>
                <IconButton theme={theme} icon={ChevronLeft} onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))} />
                <IconButton theme={theme} icon={ChevronRight} onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))} />
              </>
            ) : (
              <>
                <IconButton theme={theme} icon={ChevronLeft} onClick={() => setWeekStart(addDays(weekStart, -7))} />
                <IconButton theme={theme} icon={ChevronRight} onClick={() => setWeekStart(addDays(weekStart, 7))} />
              </>
            )}
          </div>
        }>
        {view === "month" ? `${MONTHS_ID[monthDate.getMonth()]} ${monthDate.getFullYear()}` : `Minggu ${formatShortDate(weekDates[0])} – ${formatShortDate(weekDates[6])}`}
      </SectionTitle>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["month", "Bulanan"], ["week", "Mingguan"]].map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${theme.border}`,
            background: view === k ? theme.brand : theme.surface, color: view === k ? "#04201D" : theme.text,
            fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {view === "week" && (
        <Button theme={theme} variant="outline" onClick={copyPrevWeek} style={{ width: "100%", marginBottom: 12 }}>
          <Copy size={15} /> Copy Jadwal Minggu Sebelumnya
        </Button>
      )}

      {view === "month" && (
        <Card theme={theme} style={{ padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
            {MONDAY_HEADERS.map((h) => (
              <div key={h} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: theme.textMuted, padding: "2px 0" }}>{h}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {monthCells.map((d) => {
              const iso = toISO(d);
              const s = schedules[iso];
              const inMonth = d.getMonth() === monthDate.getMonth();
              const isToday = sameDate(d, now);
              const hasAtt = attendance[iso]?.checkIn;
              return (
                <div key={iso} onClick={() => openEdit(iso)} style={{
                  aspectRatio: "1 / 1", borderRadius: 10, cursor: "pointer", padding: "4px 3px 3px",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  background: s ? `${STATUS_COLOR[s.status]}${inMonth ? "22" : "12"}` : theme.surfaceAlt,
                  opacity: inMonth ? 1 : 0.35,
                  border: isToday ? `1.5px solid ${theme.brand}` : "1px solid transparent",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color: theme.text }}>{d.getDate()}</span>
                    {hasAtt && <span style={{ width: 4, height: 4, borderRadius: 999, background: theme.green }} />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {s && (
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: STATUS_COLOR[s.status], lineHeight: 1.1 }}>
                        {s.status === "Kerja" ? s.start : s.status.slice(0, 4)}
                      </span>
                    )}
                    {s?.overtimePlanned && <span style={{ fontSize: 8.5, color: theme.amber, fontWeight: 700 }}>⚡Lembur</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, paddingTop: 10, borderTop: `1px solid ${theme.border}` }}>
            {STATUS_OPTIONS.map((st) => (
              <div key={st} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: STATUS_COLOR[st] }} />
                <span style={{ fontSize: 10.5, color: theme.textMuted }}>{st}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "week" && weekDates.map((d) => {
        const iso = toISO(d);
        const s = schedules[iso];
        const isToday = sameDate(d, now);
        return (
          <Card key={iso} onClick={() => openEdit(iso)} style={{ marginBottom: 8, cursor: "pointer", border: isToday ? `1.5px solid ${theme.brand}` : `1px solid ${theme.border}` }} theme={theme}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{DAYS_ID[d.getDay()]} <span style={{ color: theme.textMuted, fontWeight: 500 }}>· {formatShortDate(d)}</span></div>
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  {s ? (s.status === "Kerja" ? `${s.start} – ${s.end}` : s.status) : "Belum diatur"}
                </div>
                {s?.location && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>📍 {s.location}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {s?.overtimePlanned && <Badge theme={theme} color={theme.amber}>Lembur</Badge>}
                <Badge theme={theme} color={STATUS_COLOR[s?.status || "Libur"]}>{s ? s.status : "-"}</Badge>
              </div>
            </div>
          </Card>
        );
      })}

      {modalOpen && editing && (
        <Modal theme={theme} title={formatFullDate(parseISO(editing.iso))} onClose={() => setModalOpen(false)}
          footer={
            <div style={{ display: "flex", gap: 10 }}>
              {schedules[editing.iso] && <Button theme={theme} variant="danger" onClick={deleteEdit}><Trash2 size={15} /></Button>}
              <Button theme={theme} onClick={saveEdit} style={{ flex: 1 }}><Check size={15} /> Simpan Jadwal</Button>
            </div>
          }>
          {editDayInfo && (editDayInfo.att?.checkIn || editDayInfo.totalPay > 0) && (
            <div style={{ background: theme.surfaceAlt, borderRadius: 12, padding: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: theme.textMuted }}>RINGKASAN HARI INI</span>
                <Badge theme={theme} color={editDayInfo.status === "Selesai" ? theme.green : theme.amber}>{editDayInfo.status}</Badge>
              </div>
              <Row theme={theme} label="Absensi" value={`${editDayInfo.att?.checkIn || "--:--"} → ${editDayInfo.att?.checkOut || "--:--"}`} />
              {editDayInfo.workedMinutes != null && <Row theme={theme} label="Jam Kerja" value={minutesToDur(editDayInfo.regularMinutes)} />}
              {editDayInfo.overtimeMinutes > 0 && <Row theme={theme} label="Lembur" value={minutesToDur(editDayInfo.overtimeMinutes)} />}
              <Row theme={theme} label="Estimasi Penghasilan" value={formatRupiah(editDayInfo.totalPay)} bold />
            </div>
          )}
          <Field theme={theme} label="Status">
            <Select theme={theme} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          {editing.status === "Kerja" && (
            <>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><Field theme={theme} label="Jam Masuk"><TextInput theme={theme} type="time" value={editing.start} onChange={(e) => setEditing({ ...editing, start: e.target.value })} /></Field></div>
                <div style={{ flex: 1 }}><Field theme={theme} label="Jam Pulang"><TextInput theme={theme} type="time" value={editing.end} onChange={(e) => setEditing({ ...editing, end: e.target.value })} /></Field></div>
              </div>
              <Field theme={theme} label="Lokasi Kerja">
                <TextInput theme={theme} value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Kantor Pusat" />
              </Field>
              <Field theme={theme} label="Kemungkinan Lembur">
                <Select theme={theme} value={editing.overtimePlanned ? "yes" : "no"} onChange={(e) => setEditing({ ...editing, overtimePlanned: e.target.value === "yes" })}>
                  <option value="no">Tidak</option>
                  <option value="yes">Ya</option>
                </Select>
              </Field>
            </>
          )}
          <Field theme={theme} label="Catatan">
            <TextInput theme={theme} value={editing.note} onChange={(e) => setEditing({ ...editing, note: e.target.value })} placeholder="Opsional" />
          </Field>
        </Modal>
      )}
    </div>
  );
}

/* ============================== ATTENDANCE PAGE ============================== */

function AttendancePage({ ctx }) {
  const { theme, schedules, attendance, setAttendance, settings, now } = ctx;
  const [editingISO, setEditingISO] = useState(null);
  const [form, setForm] = useState(null);

  const sortedISOs = Object.keys(attendance).sort((a, b) => (a < b ? 1 : -1)).slice(0, 30);

  const openEdit = (iso) => {
    const a = attendance[iso] || {};
    setForm({ checkIn: a.checkIn || "", checkOut: a.checkOut || "", note: a.note || "" });
    setEditingISO(iso);
  };

  const save = () => {
    setAttendance({ ...attendance, [editingISO]: { ...(attendance[editingISO] || {}), ...form } });
    setEditingISO(null);
  };

  return (
    <div>
      <SectionTitle theme={theme} right={<Button theme={theme} variant="outline" onClick={() => openEdit(toISO(now))}><Pencil size={14} /> Edit Hari Ini</Button>}>Riwayat Absensi</SectionTitle>

      {sortedISOs.length === 0 && <Empty theme={theme} icon={Fingerprint} text="Belum ada catatan absensi. Absen masuk dari Dashboard untuk mulai." />}

      {sortedISOs.map((iso) => {
        const day = computeDay(iso, schedules, attendance, settings);
        const inLabel = deltaLabel(day.checkInDelta, "in");
        const outLabel = deltaLabel(day.checkOutDelta, "out");
        return (
          <Card key={iso} theme={theme} style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => openEdit(iso)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{formatFullDate(parseISO(iso))}</div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                  {day.att.checkIn || "--:--"} → {day.att.checkOut || "--:--"} {day.workedMinutes != null && `· ${minutesToDur(day.workedMinutes)}`}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {inLabel && <span style={{ fontSize: 11, color: day.checkInDelta > 0 ? theme.rose : theme.green }}>Masuk: {inLabel}</span>}
                </div>
                {outLabel && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>Pulang: {outLabel}</div>}
                {day.att.note && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, fontStyle: "italic" }}>"{day.att.note}"</div>}
              </div>
              <Badge theme={theme} color={day.status === "Selesai" ? theme.green : theme.amber}>{day.status}</Badge>
            </div>
          </Card>
        );
      })}

      {editingISO && form && (
        <Modal theme={theme} title={`Absensi · ${formatShortDate(parseISO(editingISO))}`} onClose={() => setEditingISO(null)}
          footer={<Button theme={theme} onClick={save} style={{ width: "100%" }}><Check size={15} /> Simpan</Button>}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}><Field theme={theme} label="Jam Masuk"><TextInput theme={theme} type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></Field></div>
            <div style={{ flex: 1 }}><Field theme={theme} label="Jam Pulang"><TextInput theme={theme} type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></Field></div>
          </div>
          <Field theme={theme} label="Catatan Absensi">
            <TextInput theme={theme} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Contoh: izin telat karena hujan" />
          </Field>
        </Modal>
      )}
    </div>
  );
}

/* ============================== OVERTIME PAGE ============================== */

function OvertimePage({ ctx }) {
  const { theme, schedules, attendance, setAttendance, settings, setSettings, now, todayISO } = ctx;
  const [editingISO, setEditingISO] = useState(null);
  const [form, setForm] = useState(null);

  const today = computeDay(todayISO, schedules, attendance, settings);
  const needsPrompt = today.att?.checkIn && today.att?.checkOut && today.att?.isOvertime === undefined && today.workedMinutes > 0;

  const openEdit = (iso) => {
    const a = attendance[iso] || {};
    setForm({ isOvertime: a.isOvertime || false, overtimeStart: a.overtimeStart || a.checkOut || "17:00", overtimeEnd: a.overtimeEnd || "" });
    setEditingISO(iso);
  };

  const save = () => {
    setAttendance({ ...attendance, [editingISO]: { ...(attendance[editingISO] || {}), ...form } });
    setEditingISO(null);
  };

  const overtimeDays = Object.keys(attendance)
    .map((iso) => computeDay(iso, schedules, attendance, settings))
    .filter((d) => d.overtimeMinutes > 0)
    .sort((a, b) => (a.iso < b.iso ? 1 : -1));

  const totalOvertimeMin = overtimeDays.reduce((s, d) => s + d.overtimeMinutes, 0);
  const totalOvertimePay = overtimeDays.reduce((s, d) => s + d.overtimePay, 0);

  return (
    <div>
      <SectionTitle theme={theme}>Lembur</SectionTitle>

      {needsPrompt && (
        <Card theme={theme} style={{ marginBottom: 12, border: `1px solid ${theme.amber}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Apakah kamu melakukan lembur hari ini?</div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button theme={theme} onClick={() => openEdit(todayISO)} style={{ flex: 1 }}>Ya</Button>
            <Button theme={theme} variant="outline" onClick={() => setAttendance({ ...attendance, [todayISO]: { ...attendance[todayISO], isOvertime: false } })} style={{ flex: 1 }}>Tidak</Button>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
        <StatCard theme={theme} label="Total Jam Lembur" value={minutesToDur(totalOvertimeMin)} icon={Clock3} color={theme.amber} />
        <StatCard theme={theme} label="Total Penghasilan Lembur" value={formatRupiah(totalOvertimePay)} icon={Wallet} color={theme.green} />
      </div>

      <Card theme={theme} style={{ margin: "12px 0" }}>
        <Field theme={theme} label="Tarif Lembur per Jam">
          <TextInput theme={theme} type="number" value={settings.overtimeRate} onChange={(e) => setSettings({ ...settings, overtimeRate: Number(e.target.value) })} />
        </Field>
      </Card>

      <SectionTitle theme={theme}>Riwayat Lembur</SectionTitle>
      {overtimeDays.length === 0 && <Empty theme={theme} icon={Clock3} text="Belum ada catatan lembur." />}
      {overtimeDays.map((d) => (
        <Card key={d.iso} theme={theme} style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => openEdit(d.iso)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{formatFullDate(parseISO(d.iso))}</div>
              <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                {d.sched ? `${d.sched.start}–${d.sched.end}` : ""} · Lembur {minutesToDur(d.overtimeMinutes)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.amber, fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(d.overtimePay)}</div>
            </div>
          </div>
        </Card>
      ))}

      {editingISO && form && (
        <Modal theme={theme} title={`Lembur · ${formatShortDate(parseISO(editingISO))}`} onClose={() => setEditingISO(null)}
          footer={<Button theme={theme} onClick={save} style={{ width: "100%" }}><Check size={15} /> Simpan</Button>}>
          <Field theme={theme} label="Ada Lembur?">
            <Select theme={theme} value={form.isOvertime ? "yes" : "no"} onChange={(e) => setForm({ ...form, isOvertime: e.target.value === "yes" })}>
              <option value="no">Tidak</option>
              <option value="yes">Ya</option>
            </Select>
          </Field>
          {form.isOvertime && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><Field theme={theme} label="Mulai Lembur"><TextInput theme={theme} type="time" value={form.overtimeStart} onChange={(e) => setForm({ ...form, overtimeStart: e.target.value })} /></Field></div>
              <div style={{ flex: 1 }}><Field theme={theme} label="Selesai Lembur"><TextInput theme={theme} type="time" value={form.overtimeEnd} onChange={(e) => setForm({ ...form, overtimeEnd: e.target.value })} /></Field></div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ============================== INCOME PAGE ============================== */

function IncomePage({ ctx }) {
  const { theme, schedules, attendance, settings, setSettings, transactions, setTransactions, now } = ctx;

  const weekStart = startOfWeek(now);
  const last7 = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));
  const weekChartData = last7.map((iso) => {
    const d = computeDay(iso, schedules, attendance, settings);
    return { day: DAYS_SHORT[parseISO(iso).getDay()], value: Math.round(d.totalPay) };
  });

  const monthKey = yearMonthKey(now);
  const monthDays = Object.keys(attendance).filter((iso) => iso.startsWith(monthKey));
  const regularTotal = monthDays.reduce((s, iso) => s + computeDay(iso, schedules, attendance, settings).regularPay, 0);
  const overtimeTotal = monthDays.reduce((s, iso) => s + computeDay(iso, schedules, attendance, settings).overtimePay, 0);
  const totalMonth = regularTotal + overtimeTotal;

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = yearMonthKey(d);
    const total = Object.keys(attendance).filter((iso) => iso.startsWith(key))
      .reduce((s, iso) => s + computeDay(iso, schedules, attendance, settings).totalPay, 0);
    return { month: MONTHS_ID[d.getMonth()].slice(0, 3), value: Math.round(total) };
  });

  const addToFinance = () => {
    setTransactions([...transactions, {
      id: Date.now(), date: toISO(now), name: `Penghasilan ${MONTHS_ID[now.getMonth()]}`,
      amount: Math.round(totalMonth), category: "Gaji", type: "income", note: "Ditambahkan otomatis dari Income",
    }]);
  };

  return (
    <div>
      <SectionTitle theme={theme}>Pengaturan Penghasilan</SectionTitle>
      <Card theme={theme}>
        <Field theme={theme} label="Sistem Pembayaran">
          <Select theme={theme} value={settings.payType} onChange={(e) => setSettings({ ...settings, payType: e.target.value })}>
            <option value="hourly">Per Jam</option>
            <option value="daily">Per Hari</option>
            <option value="shift">Per Shift</option>
            <option value="monthly">Gaji Bulanan</option>
          </Select>
        </Field>
        {settings.payType === "monthly" ? (
          <Field theme={theme} label="Gaji Bulanan"><TextInput theme={theme} type="number" value={settings.monthlySalary} onChange={(e) => setSettings({ ...settings, monthlySalary: Number(e.target.value) })} /></Field>
        ) : (
          <Field theme={theme} label="Tarif Kerja Normal (per jam / hari / shift)"><TextInput theme={theme} type="number" value={settings.normalRate} onChange={(e) => setSettings({ ...settings, normalRate: Number(e.target.value) })} /></Field>
        )}
        <Field theme={theme} label="Tarif Lembur per Jam"><TextInput theme={theme} type="number" value={settings.overtimeRate} onChange={(e) => setSettings({ ...settings, overtimeRate: Number(e.target.value) })} /></Field>
      </Card>

      <SectionTitle theme={theme}>Penghasilan Minggu Ini</SectionTitle>
      <Card theme={theme}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weekChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: theme.textMuted }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 12 }} />
            <Bar dataKey="value" fill={theme.brand} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <SectionTitle theme={theme}>Tren 6 Bulan Terakhir</SectionTitle>
      <Card theme={theme}>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={last6Months}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.textMuted }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke={theme.brand} strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <SectionTitle theme={theme}>Ringkasan Bulan Ini</SectionTitle>
      <Card theme={theme}>
        <Row theme={theme} label="Penghasilan Reguler" value={formatRupiah(regularTotal)} />
        <Row theme={theme} label="Penghasilan Lembur" value={formatRupiah(overtimeTotal)} />
        <Row theme={theme} label="Total Penghasilan" value={formatRupiah(totalMonth)} bold />
        <Button theme={theme} onClick={addToFinance} style={{ width: "100%", marginTop: 12 }}><Plus size={15} /> Tambahkan ke Finance sebagai Pemasukan</Button>
      </Card>
    </div>
  );
}

function Row({ theme, label, value, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
      <span style={{ fontSize: 13, color: bold ? theme.text : theme.textMuted, fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
    </div>
  );
}

/* ============================== FINANCE PAGE ============================== */

function FinancePage({ ctx }) {
  const { theme, transactions, setTransactions, budgets, setBudgets, savings, setSavings, now } = ctx;
  const [subTab, setSubTab] = useState("transactions");
  const [modalOpen, setModalOpen] = useState(false);
  const [txForm, setTxForm] = useState(null);

  const openAddTx = () => {
    setTxForm({ date: toISO(now), name: "", amount: "", category: EXPENSE_CATEGORIES[0], type: "expense", note: "" });
    setModalOpen(true);
  };

  const saveTx = () => {
    if (!txForm.name || !txForm.amount) return;
    setTransactions([...transactions, { id: Date.now(), ...txForm, amount: Number(txForm.amount) }]);
    setModalOpen(false);
  };

  const deleteTx = (id) => setTransactions(transactions.filter((t) => t.id !== id));

  const subTabs = [
    { key: "transactions", label: "Transaksi" },
    { key: "budget", label: "Budget" },
    { key: "savings", label: "Tabungan" },
  ];

  return (
    <div>
      <SectionTitle theme={theme}>Finance</SectionTitle>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {subTabs.map((st) => (
          <button key={st.key} onClick={() => setSubTab(st.key)} style={{
            flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${theme.border}`,
            background: subTab === st.key ? theme.brand : theme.surface, color: subTab === st.key ? "#04201D" : theme.text,
            fontWeight: 700, fontSize: 12.5, cursor: "pointer",
          }}>{st.label}</button>
        ))}
      </div>

      {subTab === "transactions" && (
        <TransactionsTab theme={theme} transactions={transactions} openAddTx={openAddTx} deleteTx={deleteTx} />
      )}
      {subTab === "budget" && (
        <BudgetTab theme={theme} budgets={budgets} setBudgets={setBudgets} transactions={transactions} now={now} />
      )}
      {subTab === "savings" && (
        <SavingsTab theme={theme} savings={savings} setSavings={setSavings} />
      )}

      {modalOpen && txForm && (
        <Modal theme={theme} title="Tambah Transaksi" onClose={() => setModalOpen(false)}
          footer={<Button theme={theme} onClick={saveTx} style={{ width: "100%" }}><Check size={15} /> Simpan Transaksi</Button>}>
          <Field theme={theme} label="Tipe Transaksi">
            <Select theme={theme} value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value, category: (e.target.value === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0] })}>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </Select>
          </Field>
          <Field theme={theme} label="Nama Transaksi"><TextInput theme={theme} value={txForm.name} onChange={(e) => setTxForm({ ...txForm, name: e.target.value })} placeholder="Contoh: Makan siang" /></Field>
          <Field theme={theme} label="Nominal"><TextInput theme={theme} type="number" value={txForm.amount} onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} placeholder="0" /></Field>
          <Field theme={theme} label="Kategori">
            <Select theme={theme} value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}>
              {(txForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field theme={theme} label="Tanggal"><TextInput theme={theme} type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} /></Field>
          <Field theme={theme} label="Catatan"><TextInput theme={theme} value={txForm.note} onChange={(e) => setTxForm({ ...txForm, note: e.target.value })} placeholder="Opsional" /></Field>
        </Modal>
      )}
    </div>
  );
}

function TransactionsTab({ theme, transactions, openAddTx, deleteTx }) {
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <StatCard theme={theme} label="Total Pemasukan" value={formatRupiah(totalIncome)} icon={TrendingUp} color={theme.green} />
        <StatCard theme={theme} label="Total Pengeluaran" value={formatRupiah(totalExpense)} icon={TrendingDown} color={theme.rose} />
      </div>
      <Button theme={theme} onClick={openAddTx} style={{ width: "100%", marginBottom: 12 }}><Plus size={15} /> Tambah Transaksi</Button>

      {sorted.length === 0 && <Empty theme={theme} icon={Landmark} text="Belum ada transaksi." />}
      {sorted.map((t) => (
        <Card key={t.id} theme={theme} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{t.category} · {formatShortDate(parseISO(t.date))}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: t.type === "income" ? theme.green : theme.rose }}>
              {t.type === "income" ? "+" : "-"}{formatRupiah(t.amount)}
            </span>
            <IconButton theme={theme} icon={Trash2} size={14} onClick={() => deleteTx(t.id)} />
          </div>
        </Card>
      ))}
    </div>
  );
}

function BudgetTab({ theme, budgets, setBudgets, transactions, now }) {
  const monthKey = yearMonthKey(now);
  const monthBudgets = budgets[monthKey] || {};
  const [editCat, setEditCat] = useState(null);
  const [amount, setAmount] = useState("");

  const spentByCategory = (cat) => transactions.filter((t) => t.type === "expense" && t.category === cat && t.date.startsWith(monthKey)).reduce((s, t) => s + t.amount, 0);

  const openEdit = (cat) => { setEditCat(cat); setAmount(monthBudgets[cat] || ""); };
  const save = () => {
    setBudgets({ ...budgets, [monthKey]: { ...monthBudgets, [editCat]: Number(amount) } });
    setEditCat(null);
  };

  return (
    <div>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>Budget bulan {MONTHS_ID[now.getMonth()]} {now.getFullYear()}</div>
      {EXPENSE_CATEGORIES.map((cat) => {
        const budget = monthBudgets[cat] || 0;
        const spent = spentByCategory(cat);
        const pct = budget > 0 ? (spent / budget) * 100 : 0;
        const overBudget = budget > 0 && spent > budget;
        const nearLimit = budget > 0 && pct >= 80 && !overBudget;
        return (
          <Card key={cat} theme={theme} style={{ marginBottom: 8, cursor: "pointer" }} onClick={() => openEdit(cat)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{cat}</span>
              <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                {formatRupiah(spent)} {budget > 0 && `/ ${formatRupiah(budget)}`}
              </span>
            </div>
            {budget > 0 ? (
              <>
                <ProgressBar theme={theme} pct={pct} color={overBudget ? theme.rose : nearLimit ? theme.amber : theme.brand} />
                {overBudget && <div style={{ fontSize: 11, color: theme.rose, marginTop: 6, display: "flex", gap: 4, alignItems: "center" }}><AlertTriangle size={12} /> Budget {cat.toLowerCase()} sudah melewati batas.</div>}
                {nearLimit && <div style={{ fontSize: 11, color: theme.amber, marginTop: 6, display: "flex", gap: 4, alignItems: "center" }}><AlertTriangle size={12} /> Budget {cat.toLowerCase()} hampir habis.</div>}
              </>
            ) : (
              <div style={{ fontSize: 11, color: theme.textMuted }}>Ketuk untuk atur budget</div>
            )}
          </Card>
        );
      })}

      {editCat && (
        <Modal theme={theme} title={`Budget · ${editCat}`} onClose={() => setEditCat(null)} footer={<Button theme={theme} onClick={save} style={{ width: "100%" }}><Check size={15} /> Simpan</Button>}>
          <Field theme={theme} label="Batas Budget Bulanan"><TextInput theme={theme} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
        </Modal>
      )}
    </div>
  );
}

function SavingsTab({ theme, savings, setSavings }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [addFundsId, setAddFundsId] = useState(null);
  const [addAmount, setAddAmount] = useState("");

  const openAdd = () => { setForm({ name: "", target: "", targetDate: "", saved: "" }); setModalOpen(true); };
  const save = () => {
    if (!form.name || !form.target) return;
    setSavings([...savings, { id: Date.now(), name: form.name, target: Number(form.target), targetDate: form.targetDate, saved: Number(form.saved) || 0 }]);
    setModalOpen(false);
  };
  const addFunds = () => {
    setSavings(savings.map((s) => s.id === addFundsId ? { ...s, saved: s.saved + Number(addAmount) } : s));
    setAddFundsId(null); setAddAmount("");
  };
  const deleteGoal = (id) => setSavings(savings.filter((s) => s.id !== id));

  return (
    <div>
      <Button theme={theme} onClick={openAdd} style={{ width: "100%", marginBottom: 12 }}><Plus size={15} /> Buat Target Tabungan</Button>
      {savings.length === 0 && <Empty theme={theme} icon={PiggyBank} text="Belum ada target tabungan." />}
      {savings.map((s) => {
        const pct = s.target > 0 ? (s.saved / s.target) * 100 : 0;
        return (
          <Card key={s.id} theme={theme} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                {s.targetDate && <div style={{ fontSize: 11, color: theme.textMuted }}>Target: {formatShortDate(parseISO(s.targetDate))}</div>}
              </div>
              <IconButton theme={theme} icon={Trash2} size={14} onClick={() => deleteGoal(s.id)} />
            </div>
            <div style={{ margin: "10px 0 6px" }}><ProgressBar theme={theme} pct={pct} color={theme.brand} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: theme.textMuted }}>{formatRupiah(s.saved)} / {formatRupiah(s.target)} · {Math.round(pct)}%</span>
              <Button theme={theme} variant="ghost" onClick={() => setAddFundsId(s.id)} style={{ padding: "6px 10px", fontSize: 12 }}><Target size={13} /> Tambah Dana</Button>
            </div>
          </Card>
        );
      })}

      {modalOpen && form && (
        <Modal theme={theme} title="Target Tabungan Baru" onClose={() => setModalOpen(false)} footer={<Button theme={theme} onClick={save} style={{ width: "100%" }}><Check size={15} /> Buat Target</Button>}>
          <Field theme={theme} label="Nama Target"><TextInput theme={theme} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Beli HP Baru" /></Field>
          <Field theme={theme} label="Jumlah Target"><TextInput theme={theme} type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field>
          <Field theme={theme} label="Sudah Terkumpul"><TextInput theme={theme} type="number" value={form.saved} onChange={(e) => setForm({ ...form, saved: e.target.value })} /></Field>
          <Field theme={theme} label="Target Tanggal"><TextInput theme={theme} type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
        </Modal>
      )}

      {addFundsId && (
        <Modal theme={theme} title="Tambah Dana" onClose={() => setAddFundsId(null)} footer={<Button theme={theme} onClick={addFunds} style={{ width: "100%" }}><Check size={15} /> Tambahkan</Button>}>
          <Field theme={theme} label="Nominal"><TextInput theme={theme} type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  );
}

/* ============================== REPORTS PAGE ============================== */

function ReportsPage({ ctx }) {
  const { theme, schedules, attendance, settings, transactions, savings, now } = ctx;
  const [range, setRange] = useState("month"); // week | month | year | custom
  const [customStart, setCustomStart] = useState(toISO(startOfMonth(now)));
  const [customEnd, setCustomEnd] = useState(toISO(now));

  const { start, end } = useMemo(() => {
    if (range === "week") return { start: startOfWeek(now), end: addDays(startOfWeek(now), 6) };
    if (range === "month") return { start: startOfMonth(now), end: endOfMonth(now) };
    if (range === "year") return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
    return { start: parseISO(customStart), end: parseISO(customEnd) };
  }, [range, now, customStart, customEnd]);

  const daysInRange = useMemo(() => {
    const arr = [];
    let d = new Date(start);
    while (d <= end) { arr.push(toISO(d)); d = addDays(d, 1); }
    return arr;
  }, [start, end]);

  const dayComputes = daysInRange.map((iso) => computeDay(iso, schedules, attendance, settings));
  const workDays = dayComputes.filter((d) => d.att?.checkIn && d.att?.checkOut);
  const totalWorkMinutes = workDays.reduce((s, d) => s + d.regularMinutes, 0);
  const totalOvertimeMinutes = workDays.reduce((s, d) => s + d.overtimeMinutes, 0);
  const lateCount = dayComputes.filter((d) => d.checkInDelta > 0).length;
  const holidayCount = dayComputes.filter((d) => d.sched && d.sched.status !== "Kerja").length;
  const totalIncomeWork = workDays.reduce((s, d) => s + d.totalPay, 0);

  const rangeTx = transactions.filter((t) => t.date >= toISO(start) && t.date <= toISO(end));
  const totalIncome = rangeTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = rangeTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalSavings = savings.reduce((s, g) => s + g.saved, 0);
  const balance = transactions.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  const expenseByCategory = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat, value: rangeTx.filter((t) => t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0),
  })).filter((c) => c.value > 0);

  const biggestExpense = rangeTx.filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount)[0];
  const biggestCategory = expenseByCategory.sort((a, b) => b.value - a.value)[0];

  const PIE_COLORS = [theme.brand, theme.amber, theme.rose, theme.green, "#818CF8", "#F472B6", "#38BDF8", "#FB923C", theme.textMuted];

  return (
    <div>
      <SectionTitle theme={theme}>Laporan</SectionTitle>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["week", "Minggu"], ["month", "Bulan"], ["year", "Tahun"], ["custom", "Custom"]].map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)} style={{
            padding: "7px 12px", borderRadius: 999, border: `1px solid ${theme.border}`,
            background: range === k ? theme.brand : theme.surface, color: range === k ? "#04201D" : theme.text,
            fontWeight: 700, fontSize: 12, cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>
      {range === "custom" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <TextInput theme={theme} type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          <TextInput theme={theme} type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </div>
      )}

      <SectionTitle theme={theme}>Work Report</SectionTitle>
      <Card theme={theme}>
        <Row theme={theme} label="Total Hari Kerja" value={`${workDays.length} hari`} />
        <Row theme={theme} label="Total Jam Kerja" value={minutesToDur(totalWorkMinutes)} />
        <Row theme={theme} label="Total Jam Lembur" value={minutesToDur(totalOvertimeMinutes)} />
        <Row theme={theme} label="Jumlah Keterlambatan" value={`${lateCount} kali`} />
        <Row theme={theme} label="Jumlah Hari Libur" value={`${holidayCount} hari`} />
        <Row theme={theme} label="Total Penghasilan" value={formatRupiah(totalIncomeWork)} bold />
      </Card>

      <SectionTitle theme={theme}>Finance Report</SectionTitle>
      <Card theme={theme}>
        <Row theme={theme} label="Total Pemasukan" value={formatRupiah(totalIncome)} />
        <Row theme={theme} label="Total Pengeluaran" value={formatRupiah(totalExpense)} />
        <Row theme={theme} label="Total Tabungan" value={formatRupiah(totalSavings)} />
        <Row theme={theme} label="Saldo" value={formatRupiah(balance)} bold />
        <Row theme={theme} label="Pengeluaran Terbesar" value={biggestExpense ? `${biggestExpense.name} · ${formatRupiah(biggestExpense.amount)}` : "-"} />
        <Row theme={theme} label="Kategori Terbesar" value={biggestCategory ? `${biggestCategory.name} · ${formatRupiah(biggestCategory.value)}` : "-"} />
      </Card>

      {expenseByCategory.length > 0 && (
        <>
          <SectionTitle theme={theme}>Pengeluaran per Kategori</SectionTitle>
          <Card theme={theme}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

/* ============================== SETTINGS PAGE ============================== */

function SettingsPage({ ctx }) {
  const { theme, settings, setSettings, schedules, attendance, transactions, budgets, savings } = ctx;
  const [showExport, setShowExport] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const toggleWorkDay = (dow) => {
    const days = settings.defaultWorkDays.includes(dow) ? settings.defaultWorkDays.filter((d) => d !== dow) : [...settings.defaultWorkDays, dow];
    setSettings({ ...settings, defaultWorkDays: days });
  };

  const exportData = JSON.stringify({ settings, schedules, attendance, transactions, budgets, savings }, null, 2);

  const applyImport = () => {
    try {
      const data = JSON.parse(importText);
      if (data.settings) ctx.setSettings(data.settings);
      if (data.schedules) ctx.setSchedules(data.schedules);
      if (data.attendance) ctx.setAttendance(data.attendance);
      if (data.transactions) ctx.setTransactions(data.transactions);
      if (data.budgets) ctx.setBudgets(data.budgets);
      if (data.savings) ctx.setSavings(data.savings);
      setShowImport(false);
      setImportText("");
    } catch (e) {
      alert("Format JSON tidak valid.");
    }
  };

  return (
    <div>
      <SectionTitle theme={theme}>Profil</SectionTitle>
      <Card theme={theme}>
        <Field theme={theme} label="Nama Pengguna"><TextInput theme={theme} value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} /></Field>
        <Field theme={theme} label="Mata Uang"><TextInput theme={theme} value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} /></Field>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Mode Gelap</span>
          <Button theme={theme} variant="outline" onClick={() => setSettings({ ...settings, darkMode: !settings.darkMode })}>{settings.darkMode ? <Sun size={15} /> : <Moon size={15} />} {settings.darkMode ? "Aktif" : "Nonaktif"}</Button>
        </div>
      </Card>

      <SectionTitle theme={theme}>Default Jadwal Kerja</SectionTitle>
      <Card theme={theme}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}><Field theme={theme} label="Jam Masuk Default"><TextInput theme={theme} type="time" value={settings.defaultStart} onChange={(e) => setSettings({ ...settings, defaultStart: e.target.value })} /></Field></div>
          <div style={{ flex: 1 }}><Field theme={theme} label="Jam Pulang Default"><TextInput theme={theme} type="time" value={settings.defaultEnd} onChange={(e) => setSettings({ ...settings, defaultEnd: e.target.value })} /></Field></div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, margin: "6px 0" }}>Hari Kerja Default</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DAYS_SHORT.map((label, dow) => (
            <button key={dow} onClick={() => toggleWorkDay(dow)} style={{
              width: 42, height: 36, borderRadius: 10, border: `1px solid ${theme.border}`,
              background: settings.defaultWorkDays.includes(dow) ? theme.brand : theme.surfaceAlt,
              color: settings.defaultWorkDays.includes(dow) ? "#04201D" : theme.text, fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
      </Card>

      <SectionTitle theme={theme}>Tarif Default</SectionTitle>
      <Card theme={theme}>
        <Field theme={theme} label="Tarif Kerja Default"><TextInput theme={theme} type="number" value={settings.normalRate} onChange={(e) => setSettings({ ...settings, normalRate: Number(e.target.value) })} /></Field>
        <Field theme={theme} label="Tarif Lembur Default"><TextInput theme={theme} type="number" value={settings.overtimeRate} onChange={(e) => setSettings({ ...settings, overtimeRate: Number(e.target.value) })} /></Field>
      </Card>

      <SectionTitle theme={theme}>Notifikasi</SectionTitle>
      <Card theme={theme} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Pengingat Aktif</span>
        <Button theme={theme} variant="outline" onClick={() => setSettings({ ...settings, notifEnabled: !settings.notifEnabled })}>{settings.notifEnabled ? "Aktif" : "Nonaktif"}</Button>
      </Card>

      <SectionTitle theme={theme}>Data</SectionTitle>
      <div style={{ display: "flex", gap: 10 }}>
        <Button theme={theme} variant="outline" onClick={() => setShowExport(true)} style={{ flex: 1 }}><Download size={15} /> Export Data</Button>
        <Button theme={theme} variant="outline" onClick={() => setShowImport(true)} style={{ flex: 1 }}><Upload size={15} /> Import Data</Button>
      </div>

      {showExport && (
        <Modal theme={theme} title="Export Data (JSON)" onClose={() => setShowExport(false)}>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8 }}>Salin data di bawah ini sebagai backup.</div>
          <textarea readOnly value={exportData} style={{ ...inputStyle(theme), height: 240, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }} />
        </Modal>
      )}
      {showImport && (
        <Modal theme={theme} title="Import Data (JSON)" onClose={() => setShowImport(false)} footer={<Button theme={theme} onClick={applyImport} style={{ width: "100%" }}><Check size={15} /> Terapkan</Button>}>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8 }}>Tempel data JSON hasil export sebelumnya. Ini akan menimpa data saat ini.</div>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Tempel JSON di sini" style={{ ...inputStyle(theme), height: 200, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }} />
        </Modal>
      )}
    </div>
  );
}
