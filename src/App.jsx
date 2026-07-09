import React, { useState, useEffect, useCallback } from "react";
import {
  Clock, LogIn, LogOut, Shield, User, Plus, Trash2, ChevronLeft, Check, X, Users,
  CalendarDays, Wallet, ChevronRight, Banknote, CreditCard, Package, Truck,
  PartyPopper, MapPin, Download, Store, Megaphone, ClipboardList, GraduationCap, AlertTriangle,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, ensureSignedIn } from "./firebase";
import logoImg from "./assets/logo.png";

// ---------- storage keys (scoped per store) ----------
const KEY = {
  stores: "stores",
  masterPin: "master-pin",
  employees: (s) => `employees:${s}`,
  adminPin: (s) => `admin-pin:${s}`,
  attendance: (s, d) => `attendance:${s}:${d}`,
  sales: (s, d) => `sales:${s}:${d}`,
  stock: (s, d) => `stock:${s}:${d}`,
  events: (s) => `events:${s}`,
  notices: (s) => `notices:${s}`,
  directives: (s) => `directives:${s}`,
  safety: (s) => `safety:${s}`,
  incidents: (s) => `incidents:${s}`,
};

const LOGO_SRC = logoImg;

async function sGet(key, fallback) {
  try {
    await ensureSignedIn();
    const snap = await getDoc(doc(db, "appData", key));
    return snap.exists() ? JSON.parse(snap.data().value) : fallback;
  } catch (e) {
    console.error("firestore get failed", e);
    return fallback;
  }
}
async function sSet(key, value) {
  try {
    await ensureSignedIn();
    await setDoc(doc(db, "appData", key), { value: JSON.stringify(value), updatedAt: Date.now() });
  } catch (e) {
    console.error("firestore set failed", e);
  }
}

function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function timeStr(d = new Date()) {
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}
function shortTime(iso) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function weekdayLabel(dateStr) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return days[new Date(dateStr + "T00:00:00").getDay()];
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return todayStr(d);
}
function fmtWon(n) {
  const num = Number(n) || 0;
  return num.toLocaleString("ko-KR");
}
function fmtDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdayLabel(dateStr)})`;
}
function fullTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

// ---------- csv backup helpers ----------
function csvCell(v) {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvRow(fields) {
  return fields.map(csvCell).join(",");
}
function downloadCSV(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------- shell ----------
export default function App() {
  // store-select | store-manage | role-select | emp-pick | emp-home | emp-clock | emp-sales | emp-stock | admin-login | admin-dash
  const [view, setView] = useState("store-select");
  const [stores, setStores] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [employees, setEmployees] = useState(null);
  const [currentEmp, setCurrentEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let st = await sGet(KEY.stores, null);
      if (!st) {
        st = [{ id: "st1", name: "제주점" }];
        await sSet(KEY.stores, st);
      }
      setStores(st);
      setLoading(false);
    })();
  }, []);

  const enterStore = async (store) => {
    setStoreId(store.id);
    setStoreName(store.name);
    let emps = await sGet(KEY.employees(store.id), null);
    if (!emps) {
      emps = [];
      await sSet(KEY.employees(store.id), emps);
    }
    let pin = await sGet(KEY.adminPin(store.id), null);
    if (!pin) await sSet(KEY.adminPin(store.id), "0000");
    setEmployees(emps);
    setView("role-select");
  };

  const exitStore = () => {
    setStoreId(null);
    setStoreName("");
    setEmployees(null);
    setCurrentEmp(null);
    setView("store-select");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12151f] flex items-center justify-center">
        <div className="text-[#8B93A7] text-sm tracking-wide">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12151f] font-sans text-[#F5F6FA] flex justify-center">
      <div className="w-full max-w-sm min-h-screen bg-[#12151f] relative flex flex-col">
        {view === "store-select" && (
          <StoreSelect stores={stores} onSelect={enterStore} onManage={() => setView("store-manage")} />
        )}

        {view === "store-manage" && (
          <StoreManage stores={stores} setStores={setStores} onBack={() => setView("store-select")} />
        )}

        {view === "role-select" && (
          <RoleSelect storeName={storeName} onBack={exitStore} onPick={(r) => setView(r === "emp" ? "emp-pick" : "admin-login")} />
        )}

        {view === "emp-pick" && (
          <EmployeePick
            employees={employees}
            onBack={() => setView("role-select")}
            onSelect={(emp) => {
              setCurrentEmp(emp);
              setView("emp-home");
            }}
          />
        )}

        {view === "emp-home" && (
          <EmployeeHome
            emp={currentEmp}
            onBack={() => {
              setCurrentEmp(null);
              setView("role-select");
            }}
            onGoClock={() => setView("emp-clock")}
            onGoSales={() => setView("emp-sales")}
            onGoStock={() => setView("emp-stock")}
            onGoNotice={() => setView("emp-notice")}
            onGoDirective={() => setView("emp-directive")}
            onGoSafety={() => setView("emp-safety")}
            onGoIncident={() => setView("emp-incident")}
          />
        )}

        {view === "emp-clock" && <EmployeeClock storeId={storeId} emp={currentEmp} onBack={() => setView("emp-home")} />}
        {view === "emp-sales" && <EmployeeSales storeId={storeId} emp={currentEmp} onBack={() => setView("emp-home")} />}
        {view === "emp-stock" && <EmployeeStock storeId={storeId} emp={currentEmp} onBack={() => setView("emp-home")} />}
        {view === "emp-notice" && (
          <EmployeeBoard
            storeId={storeId}
            keyFn={KEY.notices}
            title="공지사항"
            icon={Megaphone}
            emptyText="등록된 공지사항이 없습니다"
            onBack={() => setView("emp-home")}
          />
        )}
        {view === "emp-directive" && (
          <EmployeeBoard
            storeId={storeId}
            keyFn={KEY.directives}
            title="조치지시"
            icon={ClipboardList}
            emptyText="등록된 조치지시가 없습니다"
            onBack={() => setView("emp-home")}
          />
        )}
        {view === "emp-safety" && (
          <EmployeeBoard
            storeId={storeId}
            keyFn={KEY.safety}
            title="교육안전보고"
            icon={GraduationCap}
            emptyText="등록된 교육안전보고가 없습니다"
            onBack={() => setView("emp-home")}
          />
        )}
        {view === "emp-incident" && <EmployeeIncident storeId={storeId} emp={currentEmp} onBack={() => setView("emp-home")} />}

        {view === "admin-login" && (
          <AdminLogin storeId={storeId} onBack={() => setView("role-select")} onSuccess={() => setView("admin-dash")} />
        )}
        {view === "admin-dash" && (
          <AdminDashboard
            storeId={storeId}
            storeName={storeName}
            employees={employees}
            setEmployees={setEmployees}
            onBack={() => setView("role-select")}
          />
        )}
      </div>
    </div>
  );
}

// ---------- store select ----------
function StoreSelect({ stores, onSelect, onManage }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-7 py-10">
      <div className="mb-12">
        <img src={LOGO_SRC} alt="회사 로고" className="h-9 mb-6" />
        <h1 className="text-3xl font-extrabold leading-tight">매장 선택</h1>
        <p className="text-[#8B93A7] text-sm mt-3">근무하실 매장을 선택해주세요</p>
      </div>

      <div className="space-y-2.5">
        {stores.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full flex items-center gap-4 bg-[#1c2333] border border-[#2E3650] rounded-2xl px-5 py-5 text-left hover:border-[#F5A623] transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-[#232b40] flex items-center justify-center shrink-0">
              <Store size={20} className="text-[#F5A623]" />
            </div>
            <div className="font-bold">{s.name}</div>
          </button>
        ))}
        {stores.length === 0 && <div className="text-center text-[#4A5170] text-sm py-10">등록된 매장이 없습니다</div>}
      </div>

      <button onClick={onManage} className="mt-10 text-center text-[#4A5170] text-xs underline underline-offset-2">
        매장 관리 (본사)
      </button>
    </div>
  );
}

// ---------- store manage (master-pin gated) ----------
function StoreManage({ stores, setStores, onBack }) {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [pinMsg, setPinMsg] = useState(null);

  const submitPin = async () => {
    const real = await sGet(KEY.masterPin, "9999");
    if (pin === real) setAuthed(true);
    else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1200);
    }
  };

  const addStore = async () => {
    const name = newName.trim();
    if (!name) return;
    const list = [...stores, { id: "st" + Date.now(), name }];
    setStores(list);
    await sSet(KEY.stores, list);
    setNewName("");
  };

  const removeStore = async (id) => {
    const list = stores.filter((s) => s.id !== id);
    setStores(list);
    await sSet(KEY.stores, list);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    await removeStore(deleteTarget.id);
    setDeleteTarget(null);
  };

  const changeMasterPin = async () => {
    setPinMsg(null);
    const real = await sGet(KEY.masterPin, "9999");
    if (curPin !== real) {
      setPinMsg({ type: "error", text: "현재 비밀번호가 일치하지 않습니다" });
      return;
    }
    if (!newPin || newPin.length < 4) {
      setPinMsg({ type: "error", text: "새 비밀번호는 4자리 이상 입력해주세요" });
      return;
    }
    if (newPin !== newPin2) {
      setPinMsg({ type: "error", text: "새 비밀번호가 서로 일치하지 않습니다" });
      return;
    }
    await sSet(KEY.masterPin, newPin);
    setCurPin("");
    setNewPin("");
    setNewPin2("");
    setPinMsg({ type: "success", text: "비밀번호가 변경되었습니다" });
    setTimeout(() => setPinMsg(null), 2500);
  };

  if (!authed) {
    return (
      <div className="flex-1 flex flex-col">
        <TopBar title="매장 관리" onBack={onBack} />
        <div className="flex-1 flex flex-col justify-center px-7 -mt-16">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#232b40] flex items-center justify-center mx-auto mb-4">
              <Shield size={24} className="text-[#F5A623]" />
            </div>
            <div className="text-[#8B93A7] text-sm">본사 관리자 비밀번호를 입력하세요</div>
          </div>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className={`w-full text-center text-2xl tracking-[0.5em] bg-[#1c2333] border rounded-xl py-4 outline-none ${
              error ? "border-[#E5484D]" : "border-[#2E3650] focus:border-[#F5A623]"
            }`}
          />
          {error && <div className="text-[#E5484D] text-xs text-center mt-2">비밀번호가 일치하지 않습니다</div>}
          <button
            onClick={submitPin}
            className="w-full mt-5 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform"
          >
            확인
          </button>
          <div className="mt-6 text-center text-[11px] text-[#4A5170]">초기 비밀번호 9999</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title="매장 관리" onBack={onBack} />
      <div className="px-5 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#232b40] flex items-center justify-center shrink-0">
            <Store size={16} className="text-[#F5A623]" />
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addStore()}
            placeholder="새 매장 이름"
            className="flex-1 bg-[#1c2333] border border-[#2E3650] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#F5A623]"
          />
          <button onClick={addStore} className="w-9 h-9 rounded-lg bg-[#F5A623] text-[#12151f] flex items-center justify-center shrink-0">
            <Plus size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {stores.map((s) => (
            <div key={s.id} className="flex items-center justify-between bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3">
              <span className="font-semibold text-sm">{s.name}</span>
              <button onClick={() => setDeleteTarget(s)} className="text-[#4A5170] hover:text-[#E5484D] p-1">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {stores.length === 0 && <div className="text-center text-[#4A5170] text-sm py-8">등록된 매장이 없습니다</div>}
        </div>

        <div className="mt-8 bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#232b40] flex items-center justify-center shrink-0">
              <Shield size={16} className="text-[#F5A623]" />
            </div>
            <div className="font-bold text-sm">본사 관리자 비밀번호 변경</div>
          </div>

          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">현재 비밀번호</label>
          <input
            type="password"
            inputMode="numeric"
            value={curPin}
            onChange={(e) => setCurPin(e.target.value)}
            placeholder="••••"
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-[#F5A623] mb-3"
          />
          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">새 비밀번호 (4자리 이상)</label>
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value)}
            placeholder="••••"
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-[#F5A623] mb-3"
          />
          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">새 비밀번호 확인</label>
          <input
            type="password"
            inputMode="numeric"
            value={newPin2}
            onChange={(e) => setNewPin2(e.target.value)}
            placeholder="••••"
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-[#F5A623] mb-3"
          />

          {pinMsg && (
            <div className={`text-xs mb-3 ${pinMsg.type === "error" ? "text-[#E5484D]" : "text-[#2F9E44]"}`}>{pinMsg.text}</div>
          )}

          <button
            onClick={changeMasterPin}
            disabled={!curPin || !newPin || !newPin2}
            className="w-full bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            비밀번호 변경
          </button>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-7 bg-black/60" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full max-w-xs bg-[#1c2333] border border-[#2E3650] rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#3a1f22] flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-[#E5484D]" />
            </div>
            <div className="font-bold text-base mb-1.5">정말 삭제하시겠습니까?</div>
            <div className="text-[#8B93A7] text-sm mb-6">
              <span className="text-[#F5F6FA] font-semibold">{deleteTarget.name}</span> 매장을 삭제하면 이 목록에서 사라지지만, 기존
              데이터는 남아있어요.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-[#232b40] text-[#F5F6FA] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                취소
              </button>
              <button
                onClick={confirmRemove}
                className="flex-1 py-3 rounded-xl bg-[#E5484D] text-white font-bold text-sm active:scale-[0.98] transition-transform"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- role select ----------
function RoleSelect({ storeName, onPick, onBack }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-7 py-10">
      <button onClick={onBack} className="absolute top-6 left-5 w-9 h-9 flex items-center justify-center text-[#8B93A7] hover:text-white">
        <ChevronLeft size={22} />
      </button>
      <div className="mb-14">
        <img src={LOGO_SRC} alt="회사 로고" className="h-7 mb-5" />
        <div className="text-[11px] tracking-[0.25em] text-[#F5A623] font-bold mb-2">{storeName}</div>
        <h1 className="text-3xl font-extrabold leading-tight">
          매장 근무
          <br />
          관리 시스템
        </h1>
        <p className="text-[#8B93A7] text-sm mt-3">출퇴근 · 매출/입고 일지 · 행사관리를 한 곳에서</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onPick("emp")}
          className="w-full group flex items-center gap-4 bg-[#1c2333] border border-[#2E3650] rounded-2xl px-5 py-5 text-left hover:border-[#F5A623] transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-[#232b40] flex items-center justify-center shrink-0">
            <User size={20} className="text-[#F5A623]" />
          </div>
          <div>
            <div className="font-bold">직원으로 시작</div>
            <div className="text-[#8B93A7] text-xs mt-0.5">출퇴근 체크 · 매출/입고일지 작성</div>
          </div>
        </button>

        <button
          onClick={() => onPick("admin")}
          className="w-full group flex items-center gap-4 bg-[#1c2333] border border-[#2E3650] rounded-2xl px-5 py-5 text-left hover:border-[#F5A623] transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-[#232b40] flex items-center justify-center shrink-0">
            <Shield size={20} className="text-[#F5A623]" />
          </div>
          <div>
            <div className="font-bold">관리자로 시작</div>
            <div className="text-[#8B93A7] text-xs mt-0.5">직원 관리 · 현황 확인 · 백업</div>
          </div>
        </button>
      </div>

      <div className="mt-10 text-center text-[11px] text-[#4A5170]">관리자 초기 비밀번호 0000</div>
    </div>
  );
}

// ---------- header ----------
function TopBar({ title, onBack, right }) {
  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-4">
      <button onClick={onBack} className="w-9 h-9 -ml-2 flex items-center justify-center text-[#8B93A7] hover:text-white">
        <ChevronLeft size={22} />
      </button>
      <div className="font-bold text-sm tracking-wide">{title}</div>
      <div className="w-9 h-9 flex items-center justify-center">{right}</div>
    </div>
  );
}

// ---------- employee pick ----------
function EmployeePick({ employees, onBack, onSelect }) {
  return (
    <div className="flex-1 flex flex-col">
      <TopBar title="직원 선택" onBack={onBack} />
      <div className="px-5 pb-6">
        <p className="text-[#8B93A7] text-xs mb-4">본인 이름을 선택해주세요</p>
        <div className="space-y-2">
          {employees.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e)}
              className="w-full flex items-center justify-between bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-4 hover:border-[#F5A623] transition-colors"
            >
              <span className="font-semibold">{e.name}</span>
              <span className="text-[#4A5170] text-xs">선택</span>
            </button>
          ))}
          {employees.length === 0 && (
            <div className="text-center text-[#4A5170] text-sm py-10">
              등록된 직원이 없습니다.
              <br />
              관리자에게 등록을 요청하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- employee home (menu) ----------
function EmployeeHome({ emp, onBack, onGoClock, onGoSales, onGoStock, onGoNotice, onGoDirective, onGoSafety, onGoIncident }) {
  const menu = [
    { label: "출퇴근 체크", desc: "출근·퇴근 기록", icon: Clock, onClick: onGoClock },
    { label: "매출일지", desc: "오늘 매출 기록", icon: Wallet, onClick: onGoSales },
    { label: "입고일지", desc: "입고 상품 기록", icon: Package, onClick: onGoStock },
    { label: "공지사항", desc: "매장 공지 확인", icon: Megaphone, onClick: onGoNotice },
    { label: "조치지시", desc: "지시사항 확인", icon: ClipboardList, onClick: onGoDirective },
    { label: "교육안전보고", desc: "안전교육 확인", icon: GraduationCap, onClick: onGoSafety },
    { label: "아차사고신고", desc: "위험 상황 신고", icon: AlertTriangle, onClick: onGoIncident },
  ];
  return (
    <div className="flex-1 flex flex-col">
      <TopBar title={emp.name} onBack={onBack} />
      <div className="px-5 pb-6">
        <p className="text-[#8B93A7] text-xs mb-4">오늘도 좋은 하루 되세요</p>
        <div className="grid grid-cols-2 gap-2.5">
          {menu.map((m) => (
            <button
              key={m.label}
              onClick={m.onClick}
              className="flex flex-col items-start gap-3 bg-[#1c2333] border border-[#2E3650] rounded-2xl px-4 py-4 text-left hover:border-[#F5A623] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#232b40] flex items-center justify-center shrink-0">
                <m.icon size={18} className="text-[#F5A623]" />
              </div>
              <div>
                <div className="font-bold text-sm">{m.label}</div>
                <div className="text-[#8B93A7] text-[11px] mt-0.5">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- employee clock (punch card) ----------
function EmployeeClock({ storeId, emp, onBack }) {
  const [now, setNow] = useState(new Date());
  const [record, setRecord] = useState(null);
  const [week, setWeek] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const d = todayStr();
    const list = await sGet(KEY.attendance(storeId, d), []);
    const mine = list.find((r) => r.employeeId === emp.id) || null;
    setRecord(mine);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const ds = addDays(todayStr(), -i);
      const dayList = await sGet(KEY.attendance(storeId, ds), []);
      const rec = dayList.find((r) => r.employeeId === emp.id) || null;
      days.push({ date: ds, rec });
    }
    setWeek(days);
  }, [storeId, emp.id]);

  useEffect(() => {
    load();
  }, [load]);

  const punch = async (type) => {
    setBusy(true);
    const d = todayStr();
    const list = await sGet(KEY.attendance(storeId, d), []);
    const idx = list.findIndex((r) => r.employeeId === emp.id);
    const iso = new Date().toISOString();
    if (idx === -1) {
      list.push({ employeeId: emp.id, name: emp.name, checkIn: type === "in" ? iso : null, checkOut: type === "out" ? iso : null });
    } else {
      if (type === "in") list[idx].checkIn = iso;
      if (type === "out") list[idx].checkOut = iso;
    }
    await sSet(KEY.attendance(storeId, d), list);
    await load();
    setBusy(false);
  };

  const status = !record ? "before" : !record.checkOut ? "working" : "done";

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title="출퇴근 체크" onBack={onBack} />

      <div className="px-5">
        <div className="relative bg-[#1c2333] border border-[#2E3650] rounded-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-1">TIME CARD</div>
            <div className="text-[13px] text-[#8B93A7]">{now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</div>
            <div className="text-5xl font-extrabold tabular-nums tracking-tight mt-2">{timeStr(now)}</div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-[#2E3650] border-t border-dashed border-[#2E3650] mt-2">
            <div className="px-4 py-4 text-center">
              <div className="text-[10px] text-[#4A5170] font-bold tracking-wide mb-1">출근</div>
              <div className="font-bold text-lg tabular-nums">{shortTime(record?.checkIn)}</div>
            </div>
            <div className="px-4 py-4 text-center">
              <div className="text-[10px] text-[#4A5170] font-bold tracking-wide mb-1">퇴근</div>
              <div className="font-bold text-lg tabular-nums">{shortTime(record?.checkOut)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          {status === "before" && (
            <button
              disabled={busy}
              onClick={() => punch("in")}
              className="w-full flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-2xl py-4 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <LogIn size={20} /> 출근하기
            </button>
          )}
          {status === "working" && (
            <button
              disabled={busy}
              onClick={() => punch("out")}
              className="w-full flex items-center justify-center gap-2 bg-[#E5484D] text-white font-extrabold rounded-2xl py-4 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <LogOut size={20} /> 퇴근하기
            </button>
          )}
          {status === "done" && (
            <div className="w-full flex items-center justify-center gap-2 bg-[#232b40] text-[#2F9E44] font-bold rounded-2xl py-4">
              <Check size={20} /> 오늘 근무 완료
            </div>
          )}
        </div>

        <div className="mt-8 mb-8">
          <div className="flex items-center gap-2 text-[#8B93A7] text-xs font-bold mb-3">
            <CalendarDays size={14} /> 최근 7일
          </div>
          <div className="space-y-1.5">
            {week.map((w) => (
              <div key={w.date} className="flex items-center justify-between bg-[#1c2333] border border-[#2E3650] rounded-lg px-3 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#4A5170] w-8">{weekdayLabel(w.date)}</span>
                  <span className="text-[#8B93A7]">{w.date.slice(5)}</span>
                </div>
                <div className="flex items-center gap-3 tabular-nums text-xs">
                  <span className={w.rec?.checkIn ? "text-[#F5F6FA]" : "text-[#4A5170]"}>{shortTime(w.rec?.checkIn)}</span>
                  <span className="text-[#4A5170]">→</span>
                  <span className={w.rec?.checkOut ? "text-[#F5F6FA]" : "text-[#4A5170]"}>{shortTime(w.rec?.checkOut)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- employee sales log ----------
function EmployeeSales({ storeId, emp, onBack }) {
  const [amount, setAmount] = useState("");
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const ds = addDays(todayStr(), -i);
      const list = await sGet(KEY.sales(storeId, ds), []);
      const mine = list.filter((r) => r.employeeId === emp.id);
      days.push({ date: ds, entries: mine });
    }
    setHistory(days);
  }, [storeId, emp.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    const d = todayStr();
    const list = await sGet(KEY.sales(storeId, d), []);
    list.push({
      id: "s" + Date.now() + Math.random().toString(36).slice(2, 6),
      employeeId: emp.id,
      name: emp.name,
      amount: amt,
      cash: Number(cash) || 0,
      card: Number(card) || 0,
      memo: memo.trim(),
      submittedAt: new Date().toISOString(),
    });
    await sSet(KEY.sales(storeId, d), list);
    setAmount("");
    setCash("");
    setCard("");
    setMemo("");
    setSaving(false);
    setSaved(true);
    await loadHistory();
    setTimeout(() => setSaved(false), 1800);
  };

  const breakdownMismatch = amount && (Number(cash) || 0) + (Number(card) || 0) !== 0 && (Number(cash) || 0) + (Number(card) || 0) !== Number(amount);

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title="매출일지" onBack={onBack} />

      <div className="px-5 pb-8">
        <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5">
          <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-1">오늘 매출 입력</div>
          <div className="text-[13px] text-[#8B93A7] mb-4">{fmtDateLabel(todayStr())}</div>

          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">총 매출액</label>
          <div className="relative mb-4">
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3.5 text-xl font-bold tabular-nums outline-none focus:border-[#F5A623] pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4A5170] text-sm">원</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-1">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-[#8B93A7] mb-1.5">
                <Banknote size={12} /> 현금
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0"
                className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[#F5A623]"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-[#8B93A7] mb-1.5">
                <CreditCard size={12} /> 카드
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={card}
                onChange={(e) => setCard(e.target.value)}
                placeholder="0"
                className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm tabular-nums outline-none focus:border-[#F5A623]"
              />
            </div>
          </div>
          {breakdownMismatch && (
            <div className="text-[11px] text-[#E5484D] mb-2">현금+카드 합계가 총 매출액과 다릅니다</div>
          )}

          <label className="block text-xs font-bold text-[#8B93A7] mt-3 mb-1.5">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="특이사항을 적어주세요"
            rows={2}
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none"
          />

          <button
            disabled={saving || !amount}
            onClick={submit}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            {saved ? (
              <>
                <Check size={18} /> 저장됨
              </>
            ) : (
              "매출 저장하기"
            )}
          </button>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-[#8B93A7] text-xs font-bold mb-3">
            <CalendarDays size={14} /> 내 최근 7일 기록
          </div>
          <div className="space-y-1.5">
            {history
              .slice()
              .reverse()
              .map((day) => {
                const total = day.entries.reduce((s, e) => s + e.amount, 0);
                return (
                  <div key={day.date} className="bg-[#1c2333] border border-[#2E3650] rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[#4A5170] w-8">{weekdayLabel(day.date)}</span>
                        <span className="text-[#8B93A7]">{day.date.slice(5)}</span>
                      </div>
                      <span className={`font-bold tabular-nums ${total ? "text-[#F5F6FA]" : "text-[#4A5170]"}`}>
                        {total ? `${fmtWon(total)}원` : "기록 없음"}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- employee stock (inbound) log ----------
function EmployeeStock({ storeId, emp, onBack }) {
  const [productName, setProductName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("개");
  const [supplier, setSupplier] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [todayList, setTodayList] = useState([]);

  const units = ["개", "박스", "kg", "세트"];

  const loadToday = useCallback(async () => {
    const list = await sGet(KEY.stock(storeId, todayStr()), []);
    setTodayList(list.filter((r) => r.employeeId === emp.id));
  }, [storeId, emp.id]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const submit = async () => {
    const name = productName.trim();
    const q = Number(qty);
    if (!name || !q || q <= 0) return;
    setSaving(true);
    const d = todayStr();
    const list = await sGet(KEY.stock(storeId, d), []);
    list.push({
      id: "k" + Date.now() + Math.random().toString(36).slice(2, 6),
      employeeId: emp.id,
      name: emp.name,
      productName: name,
      qty: q,
      unit,
      supplier: supplier.trim(),
      memo: memo.trim(),
      submittedAt: new Date().toISOString(),
    });
    await sSet(KEY.stock(storeId, d), list);
    setProductName("");
    setQty("");
    setSupplier("");
    setMemo("");
    setSaving(false);
    setSaved(true);
    await loadToday();
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title="입고일지" onBack={onBack} />

      <div className="px-5 pb-8">
        <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5">
          <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-1">입고 상품 등록</div>
          <div className="text-[13px] text-[#8B93A7] mb-4">{fmtDateLabel(todayStr())}</div>

          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">상품명</label>
          <input
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="예) 삼각김밥 참치마요"
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
          />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">수량</label>
              <input
                type="number"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
                className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm tabular-nums outline-none focus:border-[#F5A623]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">단위</label>
              <div className="flex gap-1.5">
                {units.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors ${
                      unit === u ? "bg-[#F5A623] text-[#12151f]" : "bg-[#12151f] text-[#8B93A7] border border-[#2E3650]"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex items-center gap-1 text-xs font-bold text-[#8B93A7] mb-1.5">
            <Truck size={12} /> 공급처 (선택)
          </label>
          <input
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="예) OO물류"
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
          />

          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="파손, 수량 불일치 등 특이사항"
            rows={2}
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none"
          />

          <button
            disabled={saving || !productName || !qty}
            onClick={submit}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            {saved ? (
              <>
                <Check size={18} /> 등록됨
              </>
            ) : (
              "입고 등록하기"
            )}
          </button>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-[#8B93A7] text-xs font-bold mb-3">
            <Package size={14} /> 오늘 내가 등록한 입고
          </div>
          <div className="space-y-1.5">
            {todayList.map((r, i) => (
              <div key={r.id || i} className="bg-[#1c2333] border border-[#2E3650] rounded-lg px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{r.productName}</span>
                  <span className="font-bold tabular-nums text-sm">
                    {r.qty}
                    {r.unit}
                  </span>
                </div>
                {(r.supplier || r.memo) && (
                  <div className="text-[11px] text-[#4A5170] mt-1">{[r.supplier, r.memo].filter(Boolean).join(" · ")}</div>
                )}
              </div>
            ))}
            {todayList.length === 0 && (
              <div className="text-center text-[#4A5170] text-sm py-6">오늘 등록한 입고 기록이 없습니다</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- employee board (read-only: notices / directives / safety) ----------
function EmployeeBoard({ storeId, keyFn, title, icon: Icon, emptyText, onBack }) {
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    const list = await sGet(keyFn(storeId), []);
    setItems(list.slice().sort((a, b) => (a.date < b.date ? 1 : -1)));
  }, [storeId, keyFn]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title={title} onBack={onBack} />
      <div className="px-5 pb-8">
        <div className="space-y-2">
          {items.map((it) => {
            const open = openId === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setOpenId(open ? null : it.id)}
                className="w-full text-left bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3.5 hover:border-[#F5A623] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#232b40] flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-[#F5A623]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{it.title}</div>
                    <div className="text-[11px] text-[#4A5170] mt-0.5">{fmtDateLabel(it.date)}</div>
                  </div>
                </div>
                {open && <div className="text-sm text-[#C7CCDA] mt-3 pt-3 border-t border-[#2E3650] whitespace-pre-wrap">{it.content}</div>}
              </button>
            );
          })}
          {items.length === 0 && <div className="text-center text-[#4A5170] text-sm py-10">{emptyText}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- employee incident report (writable by employee & admin) ----------
function EmployeeIncident({ storeId, emp, onBack }) {
  const [date, setDate] = useState(todayStr());
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    const list = await sGet(KEY.incidents(storeId), []);
    setItems(list.slice().sort((a, b) => (a.date < b.date ? 1 : -1)));
  }, [storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const c = content.trim();
    if (!c) return;
    setSaving(true);
    const list = await sGet(KEY.incidents(storeId), []);
    list.push({
      id: "in" + Date.now() + Math.random().toString(36).slice(2, 6),
      reporterName: emp.name,
      date,
      location: location.trim(),
      content: c,
      memo: memo.trim(),
      createdAt: new Date().toISOString(),
    });
    await sSet(KEY.incidents(storeId), list);
    setLocation("");
    setContent("");
    setMemo("");
    setSaving(false);
    setSaved(true);
    await load();
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title="아차사고신고" onBack={onBack} />
      <div className="px-5 pb-8">
        <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5">
          <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-1">위험 상황 신고</div>
          <div className="text-[13px] text-[#8B93A7] mb-4">사고로 이어지진 않았지만 위험했던 상황을 신고해주세요</div>

          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">발생일</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
          />

          <label className="flex items-center gap-1 text-xs font-bold text-[#8B93A7] mb-1.5">
            <MapPin size={12} /> 장소 (선택)
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="예) 창고, 매장 입구"
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
          />

          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">상황 설명</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="어떤 상황이었는지 설명해주세요"
            rows={3}
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none mb-4"
          />

          <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">조치/건의사항 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="현장에서 취한 조치나 개선 건의사항"
            rows={2}
            className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none"
          />

          <button
            disabled={saving || !content.trim()}
            onClick={submit}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-40"
          >
            {saved ? (
              <>
                <Check size={18} /> 신고 접수됨
              </>
            ) : (
              "신고하기"
            )}
          </button>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-[#8B93A7] text-xs font-bold mb-3">
            <AlertTriangle size={14} /> 최근 신고 내역
          </div>
          <div className="space-y-1.5">
            {items.slice(0, 15).map((it) => (
              <div key={it.id} className="bg-[#1c2333] border border-[#2E3650] rounded-lg px-3.5 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#8B93A7]">
                    {fmtDateLabel(it.date)} · {it.reporterName}
                  </div>
                  {it.location && <div className="text-[11px] text-[#4A5170]">{it.location}</div>}
                </div>
                <div className="text-sm mt-1.5">{it.content}</div>
                {it.memo && <div className="text-xs text-[#8B93A7] mt-1">조치: {it.memo}</div>}
              </div>
            ))}
            {items.length === 0 && <div className="text-center text-[#4A5170] text-sm py-6">신고된 내역이 없습니다</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- admin login ----------
function AdminLogin({ storeId, onBack, onSuccess }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const submit = async () => {
    const real = await sGet(KEY.adminPin(storeId), "0000");
    if (pin === real) onSuccess();
    else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1200);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title="관리자 로그인" onBack={onBack} />
      <div className="flex-1 flex flex-col justify-center px-7 -mt-16">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#232b40] flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-[#F5A623]" />
          </div>
          <div className="text-[#8B93A7] text-sm">관리자 비밀번호를 입력하세요</div>
        </div>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          className={`w-full text-center text-2xl tracking-[0.5em] bg-[#1c2333] border rounded-xl py-4 outline-none ${
            error ? "border-[#E5484D]" : "border-[#2E3650] focus:border-[#F5A623]"
          }`}
        />
        {error && <div className="text-[#E5484D] text-xs text-center mt-2">비밀번호가 일치하지 않습니다</div>}
        <button
          onClick={submit}
          className="w-full mt-5 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform"
        >
          확인
        </button>
      </div>
    </div>
  );
}

// ---------- admin board tab (notices / directives / safety - shared UI) ----------
function AdminBoardTab({
  icon: Icon,
  label,
  placeholder,
  items,
  boardTitle,
  setBoardTitle,
  boardDate,
  setBoardDate,
  boardContent,
  setBoardContent,
  onAdd,
  onDelete,
}) {
  const [openId, setOpenId] = useState(null);
  return (
    <div className="px-5 pb-8">
      <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5 mb-5">
        <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-4">새 {label} 등록</div>

        <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">제목</label>
        <input
          value={boardTitle}
          onChange={(e) => setBoardTitle(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
        />

        <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">날짜</label>
        <input
          type="date"
          value={boardDate}
          onChange={(e) => setBoardDate(e.target.value)}
          className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
        />

        <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">내용</label>
        <textarea
          value={boardContent}
          onChange={(e) => setBoardContent(e.target.value)}
          placeholder="내용을 입력해주세요"
          rows={4}
          className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none mb-4"
        />

        <button
          onClick={onAdd}
          disabled={!boardTitle.trim() || !boardContent.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-40"
        >
          <Icon size={18} /> {label} 등록하기
        </button>
      </div>

      <div className="flex items-center gap-2 text-[#8B93A7] text-xs font-bold mb-3">
        <CalendarDays size={14} /> 등록된 {label}
      </div>
      <div className="space-y-2">
        {items.map((it) => {
          const open = openId === it.id;
          return (
            <div key={it.id} className="bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3.5">
              <button onClick={() => setOpenId(open ? null : it.id)} className="w-full text-left flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{it.title}</div>
                  <div className="text-[11px] text-[#4A5170] mt-0.5">{fmtDateLabel(it.date)}</div>
                </div>
              </button>
              {open && <div className="text-sm text-[#C7CCDA] mt-3 pt-3 border-t border-[#2E3650] whitespace-pre-wrap">{it.content}</div>}
              <div className="flex justify-end mt-2">
                <button onClick={() => onDelete(it)} className="text-[#4A5170] hover:text-[#E5484D] p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="text-center text-[#4A5170] text-sm py-10">등록된 {label}이 없습니다</div>}
      </div>
    </div>
  );
}

// ---------- admin dashboard ----------
function AdminDashboard({ storeId, storeName, employees, setEmployees, onBack }) {
  const [tab, setTab] = useState("today"); // today | sales | stock | events | notices | directives | safety | incidents | staff | backup
  const [today, setToday] = useState([]);
  const [newName, setNewName] = useState("");
  const [curPin, setCurPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [pinMsg, setPinMsg] = useState(null);

  const [salesDate, setSalesDate] = useState(todayStr());
  const [salesEntries, setSalesEntries] = useState([]);
  const [stockDate, setStockDate] = useState(todayStr());
  const [stockEntries, setStockEntries] = useState([]);

  const [events, setEvents] = useState([]);
  const [evTitle, setEvTitle] = useState("");
  const [evDate, setEvDate] = useState(todayStr());
  const [evLocation, setEvLocation] = useState("");
  const [evStaffCount, setEvStaffCount] = useState("");
  const [evLaborCost, setEvLaborCost] = useState("");
  const [evMemo, setEvMemo] = useState("");

  const [notices, setNotices] = useState([]);
  const [directives, setDirectives] = useState([]);
  const [safetyReports, setSafetyReports] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [boardTitle, setBoardTitle] = useState("");
  const [boardDate, setBoardDate] = useState(todayStr());
  const [boardContent, setBoardContent] = useState("");
  const [inDate, setInDate] = useState(todayStr());
  const [inLocation, setInLocation] = useState("");
  const [inContent, setInContent] = useState("");
  const [inMemo, setInMemo] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null); // { kind, id, date, label }
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupDays, setBackupDays] = useState(30);

  const loadToday = useCallback(async () => {
    const list = await sGet(KEY.attendance(storeId, todayStr()), []);
    setToday(list);
  }, [storeId]);

  const loadSales = useCallback(
    async (date) => {
      const list = await sGet(KEY.sales(storeId, date), []);
      setSalesEntries(list);
    },
    [storeId]
  );

  const loadStock = useCallback(
    async (date) => {
      const list = await sGet(KEY.stock(storeId, date), []);
      setStockEntries(list);
    },
    [storeId]
  );

  const loadEvents = useCallback(async () => {
    const list = await sGet(KEY.events(storeId), []);
    setEvents(list);
  }, [storeId]);

  const loadNotices = useCallback(async () => {
    setNotices(await sGet(KEY.notices(storeId), []));
  }, [storeId]);
  const loadDirectives = useCallback(async () => {
    setDirectives(await sGet(KEY.directives(storeId), []));
  }, [storeId]);
  const loadSafety = useCallback(async () => {
    setSafetyReports(await sGet(KEY.safety(storeId), []));
  }, [storeId]);
  const loadIncidents = useCallback(async () => {
    setIncidents(await sGet(KEY.incidents(storeId), []));
  }, [storeId]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);
  useEffect(() => {
    loadSales(salesDate);
  }, [salesDate, loadSales]);
  useEffect(() => {
    loadStock(stockDate);
  }, [stockDate, loadStock]);
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);
  useEffect(() => {
    loadNotices();
  }, [loadNotices]);
  useEffect(() => {
    loadDirectives();
  }, [loadDirectives]);
  useEffect(() => {
    loadSafety();
  }, [loadSafety]);
  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const addBoardItem = async (keyFn, list, setList, resetFn) => {
    const title = boardTitle.trim();
    const content = boardContent.trim();
    if (!title || !content) return;
    const cur = await sGet(keyFn(storeId), []);
    cur.push({
      id: "b" + Date.now() + Math.random().toString(36).slice(2, 6),
      title,
      date: boardDate,
      content,
      createdAt: new Date().toISOString(),
    });
    cur.sort((a, b) => (a.date < b.date ? 1 : -1));
    await sSet(keyFn(storeId), cur);
    setList(cur);
    setBoardTitle("");
    setBoardContent("");
    setBoardDate(todayStr());
  };

  const removeBoardItem = async (keyFn, id, list, setList) => {
    const next = list.filter((it) => it.id !== id);
    setList(next);
    await sSet(keyFn(storeId), next);
  };

  const addIncidentAdmin = async () => {
    const c = inContent.trim();
    if (!c) return;
    const list = await sGet(KEY.incidents(storeId), []);
    list.push({
      id: "in" + Date.now() + Math.random().toString(36).slice(2, 6),
      reporterName: "관리자",
      date: inDate,
      location: inLocation.trim(),
      content: c,
      memo: inMemo.trim(),
      createdAt: new Date().toISOString(),
    });
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    await sSet(KEY.incidents(storeId), list);
    setIncidents(list);
    setInLocation("");
    setInContent("");
    setInMemo("");
    setInDate(todayStr());
  };

  const removeIncident = async (id) => {
    const next = incidents.filter((it) => it.id !== id);
    setIncidents(next);
    await sSet(KEY.incidents(storeId), next);
  };

  const addEvent = async () => {
    const title = evTitle.trim();
    if (!title) return;
    const list = await sGet(KEY.events(storeId), []);
    list.push({
      id: "ev" + Date.now(),
      title,
      date: evDate,
      location: evLocation.trim(),
      staffCount: Number(evStaffCount) || 0,
      laborCost: Number(evLaborCost) || 0,
      memo: evMemo.trim(),
      createdAt: new Date().toISOString(),
    });
    list.sort((a, b) => (a.date < b.date ? 1 : -1));
    await sSet(KEY.events(storeId), list);
    setEvents(list);
    setEvTitle("");
    setEvLocation("");
    setEvStaffCount("");
    setEvLaborCost("");
    setEvMemo("");
  };

  const removeEvent = async (id) => {
    const list = events.filter((e) => e.id !== id);
    setEvents(list);
    await sSet(KEY.events(storeId), list);
  };

  const removeSalesEntry = async (date, id) => {
    const list = await sGet(KEY.sales(storeId, date), []);
    const next = list.filter((e) => e.id !== id);
    await sSet(KEY.sales(storeId, date), next);
    setSalesEntries(next);
  };

  const removeStockEntry = async (date, id) => {
    const list = await sGet(KEY.stock(storeId, date), []);
    const next = list.filter((e) => e.id !== id);
    await sSet(KEY.stock(storeId, date), next);
    setStockEntries(next);
  };

  const addEmployee = async () => {
    const name = newName.trim();
    if (!name) return;
    const emps = [...employees, { id: "e" + Date.now(), name }];
    setEmployees(emps);
    await sSet(KEY.employees(storeId), emps);
    setNewName("");
  };

  const removeEmployee = async (id) => {
    const emps = employees.filter((e) => e.id !== id);
    setEmployees(emps);
    await sSet(KEY.employees(storeId), emps);
  };

  const changePin = async () => {
    setPinMsg(null);
    const real = await sGet(KEY.adminPin(storeId), "0000");
    if (curPin !== real) {
      setPinMsg({ type: "error", text: "현재 비밀번호가 일치하지 않습니다" });
      return;
    }
    if (!newPin || newPin.length < 4) {
      setPinMsg({ type: "error", text: "새 비밀번호는 4자리 이상 입력해주세요" });
      return;
    }
    if (newPin !== newPin2) {
      setPinMsg({ type: "error", text: "새 비밀번호가 서로 일치하지 않습니다" });
      return;
    }
    await sSet(KEY.adminPin(storeId), newPin);
    setCurPin("");
    setNewPin("");
    setNewPin2("");
    setPinMsg({ type: "success", text: "비밀번호가 변경되었습니다" });
    setTimeout(() => setPinMsg(null), 2500);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "employee") await removeEmployee(deleteTarget.id);
    if (deleteTarget.kind === "event") await removeEvent(deleteTarget.id);
    if (deleteTarget.kind === "sales") await removeSalesEntry(deleteTarget.date, deleteTarget.id);
    if (deleteTarget.kind === "stock") await removeStockEntry(deleteTarget.date, deleteTarget.id);
    if (deleteTarget.kind === "notice") await removeBoardItem(KEY.notices, deleteTarget.id, notices, setNotices);
    if (deleteTarget.kind === "directive") await removeBoardItem(KEY.directives, deleteTarget.id, directives, setDirectives);
    if (deleteTarget.kind === "safety") await removeBoardItem(KEY.safety, deleteTarget.id, safetyReports, setSafetyReports);
    if (deleteTarget.kind === "incident") await removeIncident(deleteTarget.id);
    setDeleteTarget(null);
  };

  const runBackup = async () => {
    setBackupBusy(true);
    try {
      const lines = [];
      lines.push(`[${storeName} 직원 목록]`);
      lines.push(csvRow(["이름"]));
      employees.forEach((e) => lines.push(csvRow([e.name])));
      lines.push("");

      lines.push(`[출퇴근 기록 (최근 ${backupDays}일)]`);
      lines.push(csvRow(["날짜", "이름", "출근시간", "퇴근시간"]));
      for (let i = backupDays - 1; i >= 0; i--) {
        const ds = addDays(todayStr(), -i);
        const list = await sGet(KEY.attendance(storeId, ds), []);
        list.forEach((r) => lines.push(csvRow([ds, r.name, shortTime(r.checkIn), shortTime(r.checkOut)])));
      }
      lines.push("");

      lines.push(`[매출일지 (최근 ${backupDays}일)]`);
      lines.push(csvRow(["날짜", "이름", "총매출", "현금", "카드", "메모", "등록시각"]));
      for (let i = backupDays - 1; i >= 0; i--) {
        const ds = addDays(todayStr(), -i);
        const list = await sGet(KEY.sales(storeId, ds), []);
        list.forEach((r) => lines.push(csvRow([ds, r.name, r.amount, r.cash, r.card, r.memo, fullTime(r.submittedAt)])));
      }
      lines.push("");

      lines.push(`[입고일지 (최근 ${backupDays}일)]`);
      lines.push(csvRow(["날짜", "상품명", "수량", "단위", "등록자", "공급처", "메모", "등록시각"]));
      for (let i = backupDays - 1; i >= 0; i--) {
        const ds = addDays(todayStr(), -i);
        const list = await sGet(KEY.stock(storeId, ds), []);
        list.forEach((r) => lines.push(csvRow([ds, r.productName, r.qty, r.unit, r.name, r.supplier, r.memo, fullTime(r.submittedAt)])));
      }
      lines.push("");

      lines.push("[행사관리]");
      lines.push(csvRow(["행사명", "날짜", "장소", "투입인원", "인건비", "1인당", "메모"]));
      events.forEach((e) =>
        lines.push(
          csvRow([
            e.title,
            e.date,
            e.location,
            e.staffCount,
            e.laborCost,
            e.staffCount > 0 ? Math.round(e.laborCost / e.staffCount) : "",
            e.memo,
          ])
        )
      );

      downloadCSV(`${storeName}_백업_${todayStr()}.csv`, lines.join("\n"));
    } finally {
      setBackupBusy(false);
    }
  };

  const workingCount = today.filter((r) => r.checkIn && !r.checkOut).length;
  const doneCount = today.filter((r) => r.checkOut).length;
  const salesTotal = salesEntries.reduce((s, e) => s + e.amount, 0);
  const salesCash = salesEntries.reduce((s, e) => s + (e.cash || 0), 0);
  const salesCard = salesEntries.reduce((s, e) => s + (e.card || 0), 0);
  const isToday = salesDate === todayStr();
  const isStockToday = stockDate === todayStr();
  const stockTotalQty = stockEntries.reduce((s, e) => s + e.qty, 0);
  const eventStaffTotal = events.reduce((s, e) => s + e.staffCount, 0);
  const eventCostTotal = events.reduce((s, e) => s + e.laborCost, 0);

  return (
    <div className="flex-1 flex flex-col">
      <TopBar title={`관리자 · ${storeName}`} onBack={onBack} />

      <div className="px-5 flex gap-2 mb-4 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
        {[
          { id: "today", label: "출근 현황" },
          { id: "sales", label: "매출일지" },
          { id: "stock", label: "입고일지" },
          { id: "events", label: "행사관리" },
          { id: "notices", label: "공지사항" },
          { id: "directives", label: "조치지시" },
          { id: "safety", label: "교육안전보고" },
          { id: "incidents", label: "아차사고신고" },
          { id: "staff", label: "직원 관리" },
          { id: "backup", label: "백업" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              tab === t.id ? "bg-[#F5A623] text-[#12151f]" : "bg-[#1c2333] text-[#8B93A7] border border-[#2E3650]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <div className="px-5 pb-8">
          <div className="grid grid-cols-3 gap-2 mb-5">
            <StatBox label="전체" value={employees.length} />
            <StatBox label="근무중" value={workingCount} color="text-[#F5A623]" />
            <StatBox label="퇴근" value={doneCount} color="text-[#2F9E44]" />
          </div>
          <div className="space-y-2">
            {employees.map((e) => {
              const rec = today.find((r) => r.employeeId === e.id);
              const st = !rec ? "미출근" : !rec.checkOut ? "근무중" : "퇴근";
              const stColor = !rec ? "text-[#4A5170]" : !rec.checkOut ? "text-[#F5A623]" : "text-[#2F9E44]";
              return (
                <div key={e.id} className="flex items-center justify-between bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3.5">
                  <div>
                    <div className="font-semibold text-sm">{e.name}</div>
                    <div className="text-[11px] text-[#4A5170] mt-0.5 tabular-nums">
                      {shortTime(rec?.checkIn)} → {shortTime(rec?.checkOut)}
                    </div>
                  </div>
                  <div className={`text-xs font-bold ${stColor}`}>{st}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "sales" && (
        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSalesDate(addDays(salesDate, -1))}
              className="w-8 h-8 flex items-center justify-center text-[#8B93A7] hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-bold">{fmtDateLabel(salesDate)}</div>
            <button
              onClick={() => !isToday && setSalesDate(addDays(salesDate, 1))}
              disabled={isToday}
              className="w-8 h-8 flex items-center justify-center text-[#8B93A7] hover:text-white disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5 mb-4 text-center">
            <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-1">총 매출</div>
            <div className="text-3xl font-extrabold tabular-nums text-[#F5A623]">{fmtWon(salesTotal)}원</div>
            <div className="flex justify-center gap-4 mt-3 text-xs text-[#8B93A7]">
              <span className="flex items-center gap-1">
                <Banknote size={12} /> 현금 {fmtWon(salesCash)}원
              </span>
              <span className="flex items-center gap-1">
                <CreditCard size={12} /> 카드 {fmtWon(salesCard)}원
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {salesEntries.map((e, i) => (
              <div key={e.id || i} className="bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{e.name}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold tabular-nums">{fmtWon(e.amount)}원</div>
                    <button
                      onClick={() =>
                        setDeleteTarget({ kind: "sales", id: e.id, date: salesDate, label: `${e.name}의 매출 기록 (${fmtWon(e.amount)}원)` })
                      }
                      className="text-[#4A5170] hover:text-[#E5484D] p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[11px] text-[#4A5170] tabular-nums">
                    현금 {fmtWon(e.cash)} · 카드 {fmtWon(e.card)}
                  </div>
                  <div className="text-[11px] text-[#4A5170]">{shortTime(e.submittedAt)}</div>
                </div>
                {e.memo && <div className="text-xs text-[#8B93A7] mt-1.5">{e.memo}</div>}
              </div>
            ))}
            {salesEntries.length === 0 && (
              <div className="text-center text-[#4A5170] text-sm py-10">이 날짜에 등록된 매출 기록이 없습니다</div>
            )}
          </div>
        </div>
      )}

      {tab === "stock" && (
        <div className="px-5 pb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setStockDate(addDays(stockDate, -1))}
              className="w-8 h-8 flex items-center justify-center text-[#8B93A7] hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-bold">{fmtDateLabel(stockDate)}</div>
            <button
              onClick={() => !isStockToday && setStockDate(addDays(stockDate, 1))}
              disabled={isStockToday}
              className="w-8 h-8 flex items-center justify-center text-[#8B93A7] hover:text-white disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5 mb-4 text-center">
            <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-1">입고 건수</div>
            <div className="text-3xl font-extrabold tabular-nums text-[#F5A623]">{stockEntries.length}건</div>
            <div className="text-xs text-[#8B93A7] mt-2">총 수량 {stockTotalQty}개 상당</div>
          </div>

          <div className="space-y-2">
            {stockEntries.map((r, i) => (
              <div key={r.id || i} className="bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">{r.productName}</div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold tabular-nums">
                      {r.qty}
                      {r.unit}
                    </div>
                    <button
                      onClick={() =>
                        setDeleteTarget({ kind: "stock", id: r.id, date: stockDate, label: `${r.productName} 입고 기록` })
                      }
                      className="text-[#4A5170] hover:text-[#E5484D] p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-[11px] text-[#4A5170]">
                    {r.name}
                    {r.supplier ? ` · ${r.supplier}` : ""}
                  </div>
                  <div className="text-[11px] text-[#4A5170]">{shortTime(r.submittedAt)}</div>
                </div>
                {r.memo && <div className="text-xs text-[#8B93A7] mt-1.5">{r.memo}</div>}
              </div>
            ))}
            {stockEntries.length === 0 && (
              <div className="text-center text-[#4A5170] text-sm py-10">이 날짜에 등록된 입고 기록이 없습니다</div>
            )}
          </div>
        </div>
      )}

      {tab === "events" && (
        <div className="px-5 pb-8">
          <div className="grid grid-cols-3 gap-2 mb-5">
            <StatBox label="행사 수" value={events.length} />
            <StatBox label="투입 인원" value={eventStaffTotal} color="text-[#F5A623]" />
            <StatBox label="총 인건비" value={`${fmtWon(eventCostTotal)}`} color="text-[#2F9E44]" />
          </div>

          <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5 mb-5">
            <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-4">새 행사 등록</div>

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">행사명</label>
            <input
              value={evTitle}
              onChange={(e) => setEvTitle(e.target.value)}
              placeholder="예) 여름 세일 프로모션"
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">날짜</label>
                <input
                  type="date"
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm outline-none focus:border-[#F5A623]"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-[#8B93A7] mb-1.5">
                  <MapPin size={12} /> 장소 (선택)
                </label>
                <input
                  value={evLocation}
                  onChange={(e) => setEvLocation(e.target.value)}
                  placeholder="예) 강남점"
                  className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm outline-none focus:border-[#F5A623]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="flex items-center gap-1 text-xs font-bold text-[#8B93A7] mb-1.5">
                  <Users size={12} /> 투입 단기직 인원
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={evStaffCount}
                  onChange={(e) => setEvStaffCount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm tabular-nums outline-none focus:border-[#F5A623]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">인건비 총액</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={evLaborCost}
                    onChange={(e) => setEvLaborCost(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm tabular-nums outline-none focus:border-[#F5A623] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A5170] text-xs">원</span>
                </div>
              </div>
            </div>

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">메모 (선택)</label>
            <textarea
              value={evMemo}
              onChange={(e) => setEvMemo(e.target.value)}
              placeholder="행사 내용, 특이사항 등"
              rows={2}
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none mb-4"
            />

            <button
              onClick={addEvent}
              disabled={!evTitle}
              className="w-full flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              <PartyPopper size={18} /> 행사 등록하기
            </button>
          </div>

          <div className="flex items-center gap-2 text-[#8B93A7] text-xs font-bold mb-3">
            <CalendarDays size={14} /> 등록된 행사
          </div>
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{e.title}</div>
                    <div className="text-[11px] text-[#4A5170] mt-0.5">
                      {fmtDateLabel(e.date)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ kind: "event", id: e.id, label: e.title })}
                    className="text-[#4A5170] hover:text-[#E5484D] p-1 shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#2E3650]">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users size={13} className="text-[#8B93A7]" />
                    <span className="font-bold tabular-nums">{e.staffCount}명</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Wallet size={13} className="text-[#8B93A7]" />
                    <span className="font-bold tabular-nums text-[#F5A623]">{fmtWon(e.laborCost)}원</span>
                  </div>
                  {e.staffCount > 0 && (
                    <div className="text-[11px] text-[#4A5170] tabular-nums">1인당 {fmtWon(Math.round(e.laborCost / e.staffCount))}원</div>
                  )}
                </div>
                {e.memo && <div className="text-xs text-[#8B93A7] mt-2">{e.memo}</div>}
              </div>
            ))}
            {events.length === 0 && <div className="text-center text-[#4A5170] text-sm py-10">등록된 행사가 없습니다</div>}
          </div>
        </div>
      )}

      {tab === "notices" && (
        <AdminBoardTab
          icon={Megaphone}
          label="공지사항"
          placeholder="예) 매장 마감 시간 변경 안내"
          items={notices}
          boardTitle={boardTitle}
          setBoardTitle={setBoardTitle}
          boardDate={boardDate}
          setBoardDate={setBoardDate}
          boardContent={boardContent}
          setBoardContent={setBoardContent}
          onAdd={() => addBoardItem(KEY.notices, notices, setNotices)}
          onDelete={(it) => setDeleteTarget({ kind: "notice", id: it.id, label: it.title })}
        />
      )}

      {tab === "directives" && (
        <AdminBoardTab
          icon={ClipboardList}
          label="조치지시"
          placeholder="예) 냉장고 온도 점검 지시"
          items={directives}
          boardTitle={boardTitle}
          setBoardTitle={setBoardTitle}
          boardDate={boardDate}
          setBoardDate={setBoardDate}
          boardContent={boardContent}
          setBoardContent={setBoardContent}
          onAdd={() => addBoardItem(KEY.directives, directives, setDirectives)}
          onDelete={(it) => setDeleteTarget({ kind: "directive", id: it.id, label: it.title })}
        />
      )}

      {tab === "safety" && (
        <AdminBoardTab
          icon={GraduationCap}
          label="교육안전보고"
          placeholder="예) 소화기 사용법 교육 실시"
          items={safetyReports}
          boardTitle={boardTitle}
          setBoardTitle={setBoardTitle}
          boardDate={boardDate}
          setBoardDate={setBoardDate}
          boardContent={boardContent}
          setBoardContent={setBoardContent}
          onAdd={() => addBoardItem(KEY.safety, safetyReports, setSafetyReports)}
          onDelete={(it) => setDeleteTarget({ kind: "safety", id: it.id, label: it.title })}
        />
      )}

      {tab === "incidents" && (
        <div className="px-5 pb-8">
          <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5 mb-5">
            <div className="text-[10px] tracking-[0.3em] text-[#4A5170] font-bold mb-4">아차사고 신고 등록</div>

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">발생일</label>
            <input
              type="date"
              value={inDate}
              onChange={(e) => setInDate(e.target.value)}
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
            />

            <label className="flex items-center gap-1 text-xs font-bold text-[#8B93A7] mb-1.5">
              <MapPin size={12} /> 장소 (선택)
            </label>
            <input
              value={inLocation}
              onChange={(e) => setInLocation(e.target.value)}
              placeholder="예) 창고, 매장 입구"
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#F5A623] mb-4"
            />

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">상황 설명</label>
            <textarea
              value={inContent}
              onChange={(e) => setInContent(e.target.value)}
              placeholder="어떤 상황이었는지 설명해주세요"
              rows={3}
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none mb-4"
            />

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">조치/건의사항 (선택)</label>
            <textarea
              value={inMemo}
              onChange={(e) => setInMemo(e.target.value)}
              placeholder="취한 조치나 개선 건의사항"
              rows={2}
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] resize-none"
            />

            <button
              onClick={addIncidentAdmin}
              disabled={!inContent.trim()}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              <AlertTriangle size={18} /> 신고 등록하기
            </button>
          </div>

          <div className="flex items-center gap-2 text-[#8B93A7] text-xs font-bold mb-3">
            <AlertTriangle size={14} /> 전체 신고 내역
          </div>
          <div className="space-y-2">
            {incidents.map((it) => (
              <div key={it.id} className="bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3.5">
                <div className="flex items-start justify-between">
                  <div className="text-xs font-bold text-[#8B93A7]">
                    {fmtDateLabel(it.date)} · {it.reporterName}
                    {it.location ? ` · ${it.location}` : ""}
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ kind: "incident", id: it.id, label: `${it.reporterName}의 신고 (${it.date})` })}
                    className="text-[#4A5170] hover:text-[#E5484D] p-1 shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="text-sm mt-1.5">{it.content}</div>
                {it.memo && <div className="text-xs text-[#8B93A7] mt-1">조치: {it.memo}</div>}
              </div>
            ))}
            {incidents.length === 0 && <div className="text-center text-[#4A5170] text-sm py-10">신고된 내역이 없습니다</div>}
          </div>
        </div>
      )}

      {tab === "staff" && (
        <div className="px-5 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#232b40] flex items-center justify-center shrink-0">
              <Users size={16} className="text-[#F5A623]" />
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmployee()}
              placeholder="새 직원 이름"
              className="flex-1 bg-[#1c2333] border border-[#2E3650] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#F5A623]"
            />
            <button onClick={addEmployee} className="w-9 h-9 rounded-lg bg-[#F5A623] text-[#12151f] flex items-center justify-center shrink-0">
              <Plus size={18} />
            </button>
          </div>
          <div className="space-y-2">
            {employees.map((e) => (
              <div key={e.id} className="flex items-center justify-between bg-[#1c2333] border border-[#2E3650] rounded-xl px-4 py-3">
                <span className="font-semibold text-sm">{e.name}</span>
                <button
                  onClick={() => setDeleteTarget({ kind: "employee", id: e.id, label: e.name })}
                  className="text-[#4A5170] hover:text-[#E5484D] p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {employees.length === 0 && <div className="text-center text-[#4A5170] text-sm py-8">등록된 직원이 없습니다</div>}
          </div>

          <div className="mt-8 bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#232b40] flex items-center justify-center shrink-0">
                <Shield size={16} className="text-[#F5A623]" />
              </div>
              <div className="font-bold text-sm">관리자 비밀번호 변경</div>
            </div>

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">현재 비밀번호</label>
            <input
              type="password"
              inputMode="numeric"
              value={curPin}
              onChange={(e) => setCurPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-[#F5A623] mb-3"
            />

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">새 비밀번호 (4자리 이상)</label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-[#F5A623] mb-3"
            />

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">새 비밀번호 확인</label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin2}
              onChange={(e) => setNewPin2(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#12151f] border border-[#2E3650] rounded-xl px-4 py-3 text-sm tracking-[0.3em] outline-none focus:border-[#F5A623] mb-3"
            />

            {pinMsg && (
              <div className={`text-xs mb-3 ${pinMsg.type === "error" ? "text-[#E5484D]" : "text-[#2F9E44]"}`}>{pinMsg.text}</div>
            )}

            <button
              onClick={changePin}
              disabled={!curPin || !newPin || !newPin2}
              className="w-full bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3 active:scale-[0.98] transition-transform disabled:opacity-40"
            >
              비밀번호 변경
            </button>
          </div>
        </div>
      )}

      {tab === "backup" && (
        <div className="px-5 pb-8">
          <div className="bg-[#1c2333] border border-[#2E3650] rounded-2xl p-5">
            <div className="w-11 h-11 rounded-xl bg-[#232b40] flex items-center justify-center mb-4">
              <Download size={20} className="text-[#F5A623]" />
            </div>
            <div className="font-bold text-sm mb-1.5">전체 데이터 백업</div>
            <p className="text-[#8B93A7] text-xs leading-relaxed mb-5">
              직원 목록, 출퇴근·매출·입고 기록, 행사 내역을 하나의 엑셀(CSV) 파일로 내려받습니다. 정기적으로 백업해두시는 걸
              권장해요.
            </p>

            <label className="block text-xs font-bold text-[#8B93A7] mb-1.5">출퇴근·매출·입고 기록 범위</label>
            <div className="flex gap-1.5 mb-5">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setBackupDays(d)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                    backupDays === d ? "bg-[#F5A623] text-[#12151f]" : "bg-[#12151f] text-[#8B93A7] border border-[#2E3650]"
                  }`}
                >
                  최근 {d}일
                </button>
              ))}
            </div>

            <button
              disabled={backupBusy}
              onClick={runBackup}
              className="w-full flex items-center justify-center gap-2 bg-[#F5A623] text-[#12151f] font-extrabold rounded-xl py-3.5 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              <Download size={18} />
              {backupBusy ? "백업 준비 중…" : "CSV로 내려받기"}
            </button>
          </div>

          <div className="mt-4 text-[11px] text-[#4A5170] leading-relaxed px-1">
            내려받은 파일은 엑셀이나 구글 시트로 열 수 있어요. 행사관리 항목은 등록된 전체 내역이 포함됩니다.
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-7 bg-black/60" onClick={() => setDeleteTarget(null)}>
          <div
            className="w-full max-w-xs bg-[#1c2333] border border-[#2E3650] rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#3a1f22] flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-[#E5484D]" />
            </div>
            <div className="font-bold text-base mb-1.5">정말 삭제하시겠습니까?</div>
            <div className="text-[#8B93A7] text-sm mb-6">
              <span className="text-[#F5F6FA] font-semibold">{deleteTarget.label}</span>
              {deleteTarget.kind === "employee" ? " 직원을" : "을"} 삭제하면 다시 되돌릴 수 없습니다.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl bg-[#232b40] text-[#F5F6FA] font-bold text-sm active:scale-[0.98] transition-transform"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-[#E5484D] text-white font-bold text-sm active:scale-[0.98] transition-transform"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color = "text-[#F5F6FA]" }) {
  return (
    <div className="bg-[#1c2333] border border-[#2E3650] rounded-xl py-3 text-center">
      <div className={`text-2xl font-extrabold tabular-nums ${color}`}>{value}</div>
      <div className="text-[10px] text-[#4A5170] font-bold mt-0.5">{label}</div>
    </div>
  );
}
