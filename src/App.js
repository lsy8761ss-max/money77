import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function App() {
  const today = new Date().toISOString().slice(0, 10);

  const APP_STATE_DOC_ID = "budgetTrackerMain";
  const [isLoaded, setIsLoaded] = useState(false);

  // =========================
  // 인증 / 계정 관련
  // =========================
  const ADMIN_ID = "lsy";
  const ADMIN_PW = "8761";

  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // { id, password, role, inviteCode }
  const [activePage, setActivePage] = useState("dashboard"); // dashboard | admin

  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const [signupId, setSignupId] = useState("");
  const [signupPw, setSignupPw] = useState("");
  const [signupCode, setSignupCode] = useState("");

  // 일반 사용자 목록
  const [users, setUsers] = useState([]);

  // 승인 코드 목록
  const [inviteCodes, setInviteCodes] = useState([]);

  const [newCodeName, setNewCodeName] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedMaxUsers, setSelectedMaxUsers] = useState("1");

  // =========================
  // 가계부 관련
  // =========================
  const [selectedDate, setSelectedDate] = useState(today);
  const [entryType, setEntryType] = useState("income");
  const [category, setCategory] = useState("급여");
  const [customCategory, setCustomCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("현금");
  const [filterMonth, setFilterMonth] = useState(today.slice(0, 7));
  const [carryMode, setCarryMode] = useState("auto");
  const [manualCarry, setManualCarry] = useState("0");
  const [extraCarry, setExtraCarry] = useState("0");
  const [expenseTab, setExpenseTab] = useState("all");

  const [categories, setCategories] = useState({
    income: ["급여", "부수입", "용돈", "환급", "판매수익"],
    expense: [
      "식비",
      "카페",
      "교통",
      "쇼핑",
      "생활",
      "병원",
      "통신",
      "주거",
      "적금",
      "기타",
    ],
  });

  const [entries, setEntries] = useState([]);

  // =========================
  // Firebase + 로그인 유지
  // =========================
  useEffect(() => {
    const loadAll = async () => {
      try {
        const savedLogin = localStorage.getItem("budget-login");
        if (savedLogin) {
          const parsed = JSON.parse(savedLogin);
          setIsLoggedIn(!!parsed.isLoggedIn);
          setCurrentUser(parsed.currentUser || null);
          setActivePage(parsed.activePage || "dashboard");
          setAuthMode(parsed.authMode || "login");
        }

        const ref = doc(db, "appState", APP_STATE_DOC_ID);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setUsers(data.users || []);
          setInviteCodes(data.inviteCodes || []);
          setEntries(data.entries || []);
        }
      } catch (error) {
        console.error("초기 데이터 불러오기 실패:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(
      "budget-login",
      JSON.stringify({
        isLoggedIn,
        currentUser,
        activePage,
        authMode,
      })
    );
  }, [isLoaded, isLoggedIn, currentUser, activePage, authMode]);

  useEffect(() => {
    if (!isLoaded) return;

    const saveAll = async () => {
      try {
        const ref = doc(db, "appState", APP_STATE_DOC_ID);
        await setDoc(
          ref,
          {
            users,
            inviteCodes,
            entries,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Firestore 저장 실패:", error);
      }
    };

    saveAll();
  }, [isLoaded, users, inviteCodes, entries]);

  const availableCategories = categories[entryType];

  // =========================
  // 인증 로직
  // =========================
  const handleLogin = () => {
    if (!loginId.trim() || !loginPw.trim()) {
      alert("아이디와 비밀번호를 입력해 주세요.");
      return;
    }

    if (loginId === ADMIN_ID && loginPw === ADMIN_PW) {
      setCurrentUser({
        id: ADMIN_ID,
        password: ADMIN_PW,
        role: "admin",
      });
      setIsLoggedIn(true);
      setActivePage("admin");
      return;
    }

    const foundUser = users.find(
      (u) => u.id === loginId.trim() && u.password === loginPw.trim()
    );

    if (!foundUser) {
      alert("아이디 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    setCurrentUser(foundUser);
    setIsLoggedIn(true);
    setActivePage("dashboard");
  };

  const handleSignup = () => {
    const id = signupId.trim();
    const pw = signupPw.trim();
    const code = signupCode.trim().toUpperCase();

    if (!id || !pw || !code) {
      alert("아이디, 비밀번호, 승인 코드를 모두 입력해 주세요.");
      return;
    }

    if (id === ADMIN_ID) {
      alert("해당 아이디는 사용할 수 없습니다.");
      return;
    }

    const duplicated = users.some((u) => u.id === id);
    if (duplicated) {
      alert("이미 사용 중인 아이디입니다.");
      return;
    }

    const targetCode = inviteCodes.find((item) => item.code === code);
    if (!targetCode) {
      alert("유효하지 않은 승인 코드입니다.");
      return;
    }

    const joinedUsersCount = users.filter((u) => u.inviteCode === code).length;
    if (joinedUsersCount >= targetCode.maxUsers) {
      alert("해당 승인 코드는 사용 가능 인원을 모두 채웠습니다.");
      return;
    }

    const newUser = {
      id,
      password: pw,
      role: "user",
      inviteCode: code,
    };

    setUsers((prev) => [...prev, newUser]);

    alert("회원가입이 완료되었습니다. 로그인해 주세요.");
    setSignupId("");
    setSignupPw("");
    setSignupCode("");
    setAuthMode("login");
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActivePage("dashboard");
    setLoginId("");
    setLoginPw("");
  };

  // =========================
  // 관리자 - 승인 코드 관리
  // =========================
  const createInviteCode = () => {
    const raw = newCodeName.trim().toUpperCase();

    if (!raw) {
      alert("코드를 입력해 주세요.");
      return;
    }

    if (inviteCodes.some((item) => item.code === raw)) {
      alert("이미 존재하는 코드입니다.");
      return;
    }

    setInviteCodes((prev) => [
      ...prev,
      {
        code: raw,
        maxUsers: 1,
      },
    ]);

    setNewCodeName("");
  };

  const selectCodeToEdit = (code, maxUsers) => {
    setSelectedCode(code);
    setSelectedMaxUsers(String(maxUsers));
  };

  const updateInviteCodeMaxUsers = () => {
    if (!selectedCode) {
      alert("수정할 코드를 선택해 주세요.");
      return;
    }

    const nextMax = Number(selectedMaxUsers);

    if (!nextMax || nextMax < 1 || nextMax > 5) {
      alert("사용 가능 인원은 1명 이상 5명 이하만 가능합니다.");
      return;
    }

    const currentUsed = users.filter(
      (u) => u.inviteCode === selectedCode
    ).length;

    if (nextMax < currentUsed) {
      alert(
        `현재 ${currentUsed}명이 사용 중이라 ${nextMax}명으로 줄일 수 없습니다.`
      );
      return;
    }

    setInviteCodes((prev) =>
      prev.map((item) =>
        item.code === selectedCode ? { ...item, maxUsers: nextMax } : item
      )
    );

    alert("사용 가능 인원이 수정되었습니다.");
  };

  const deleteInviteCode = (code) => {
    const usedCount = users.filter((u) => u.inviteCode === code).length;
    if (usedCount > 0) {
      alert("이미 사용자가 가입한 코드는 삭제할 수 없습니다.");
      return;
    }

    const ok = window.confirm(`승인 코드 ${code}를 삭제할까요?`);
    if (!ok) return;

    setInviteCodes((prev) => prev.filter((item) => item.code !== code));

    if (selectedCode === code) {
      setSelectedCode("");
      setSelectedMaxUsers("1");
    }
  };

  const deleteUser = (userId) => {
    const ok = window.confirm(`${userId} 사용자를 삭제할까요?`);
    if (!ok) return;

    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // =========================
  // 카테고리 / 내역 관련
  // =========================
  const addCustomCategory = () => {
    const value = customCategory.trim();
    if (!value) return;

    if (categories[entryType].includes(value)) {
      setCategory(value);
      setCustomCategory("");
      return;
    }

    setCategories((prev) => ({
      ...prev,
      [entryType]: [...prev[entryType], value],
    }));
    setCategory(value);
    setCustomCategory("");
  };

  const addEntry = () => {
    const finalCategory = customCategory.trim() || category;

    if (!selectedDate) {
      alert("날짜를 선택해 주세요.");
      return;
    }
    if (!finalCategory) {
      alert("항목을 입력해 주세요.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert("금액을 입력해 주세요.");
      return;
    }

    if (
      customCategory.trim() &&
      !categories[entryType].includes(customCategory.trim())
    ) {
      setCategories((prev) => ({
        ...prev,
        [entryType]: [...prev[entryType], customCategory.trim()],
      }));
    }

    const next = {
      id: Date.now(),
      userId: currentUser?.id || "guest",
      date: selectedDate,
      type: entryType,
      category: finalCategory,
      amount: Number(amount),
      memo,
      paymentMethod: entryType === "income" ? "계좌이체" : paymentMethod,
    };

    setEntries((prev) => [next, ...prev]);
    setAmount("");
    setMemo("");
    setCustomCategory("");
  };

  const deleteEntry = (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  // 현재 로그인한 일반 사용자 내역만 보이게
  const userEntries = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin") return entries;
    return entries.filter((e) => e.userId === currentUser.id);
  }, [entries, currentUser]);

const cumulativePreviousEntries = userEntries.filter(
  (e) => e.date.slice(0, 7) < filterMonth
);

const cumulativePreviousIncome = cumulativePreviousEntries
  .filter((e) => e.type === "income")
  .reduce((sum, e) => sum + e.amount, 0);

const cumulativePreviousExpense = cumulativePreviousEntries
  .filter((e) => e.type === "expense")
  .reduce((sum, e) => sum + e.amount, 0);

const previousMonthBalance =
  cumulativePreviousIncome - cumulativePreviousExpense;

const baseCarry =
  carryMode === "auto" ? previousMonthBalance : Number(manualCarry || 0);

const appliedCarry = baseCarry + Number(extraCarry || 0);

  const monthEntries = userEntries.filter((e) =>
    e.date.startsWith(filterMonth)
  );
  const monthIncome = monthEntries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const monthExpense = monthEntries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const monthBalance = monthIncome - monthExpense;
  const finalBalance = appliedCarry + monthBalance;

  const dayEntries = userEntries.filter((e) => e.date === selectedDate);

  const savingsEntries = monthEntries.filter(
    (e) => e.type === "expense" && e.category === "적금"
  );
  const savingsTotal = userEntries
    .filter((e) => e.type === "expense" && e.category === "적금")
    .reduce((sum, e) => sum + e.amount, 0);

  const creditEntries = monthEntries.filter(
    (e) => e.type === "expense" && e.paymentMethod === "신용카드"
  );
  const normalExpenseEntries = monthEntries.filter(
    (e) => e.type === "expense" && e.paymentMethod !== "신용카드"
  );

  const shownExpenseEntries =
    expenseTab === "all"
      ? monthEntries.filter((e) => e.type === "expense")
      : expenseTab === "card"
      ? creditEntries
      : normalExpenseEntries;

  const groupedByDate = Object.entries(
    monthEntries.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {})
  ).sort((a, b) => b[0].localeCompare(a[0]));

  const daysInMonth = useMemo(() => {
    const [year, month] = filterMonth.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  }, [filterMonth]);

  const calendarData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    const date = `${filterMonth}-${day}`;
    const target = monthEntries.filter((e) => e.date === date);
    const income = target
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);
    const expense = target
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);
    return { date, day: i + 1, income, expense, balance: income - expense };
  });

  const yearlyData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    const prefix = `${filterMonth.slice(0, 4)}-${month}`;
    const target = userEntries.filter((e) => e.date.startsWith(prefix));
    const income = target
      .filter((e) => e.type === "income")
      .reduce((sum, e) => sum + e.amount, 0);
    const expense = target
      .filter((e) => e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      label: `${i + 1}월`,
      income,
      expense,
      balance: income - expense,
    };
  });

  const maxYearValue = Math.max(
    1,
    ...yearlyData.map((d) => Math.max(d.income, d.expense, Math.abs(d.balance)))
  );

  const totalIncomeAllUsers = entries
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpenseAllUsers = entries
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalBalanceAllUsers = totalIncomeAllUsers - totalExpenseAllUsers;

  const formatCurrency = (v) => `₩${Number(v || 0).toLocaleString("ko-KR")}`;

  // =========================
  // 스타일
  // =========================
  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
      color: "#0f172a",
    },
    loginWrap: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    loginCard: {
      width: 420,
      background: "#ffffff",
      borderRadius: 24,
      padding: 28,
      boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
    },
    title: {
      fontSize: 34,
      fontWeight: 800,
      margin: 0,
    },
    sub: {
      color: "#64748b",
      marginTop: 8,
      lineHeight: 1.6,
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      marginTop: 10,
      fontSize: 14,
      background: "#fff",
    },
    btn: {
      width: "100%",
      padding: "13px 16px",
      background: "#0f172a",
      color: "white",
      border: "none",
      borderRadius: 12,
      marginTop: 16,
      cursor: "pointer",
      fontWeight: 700,
    },
    shell: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: 24,
    },
    topRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    logoutBtn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #cbd5e1",
      background: "#fff",
      cursor: "pointer",
    },
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 16,
      marginTop: 20,
    },
    summaryCard: {
      background: "#fff",
      borderRadius: 22,
      padding: 20,
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
    },
    section: {
      background: "#fff",
      borderRadius: 24,
      padding: 22,
      marginTop: 20,
      boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
    },
    sectionTitle: {
      margin: 0,
      fontSize: 22,
      fontWeight: 800,
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: 20,
      marginTop: 20,
    },
    label: {
      display: "block",
      fontSize: 13,
      color: "#475569",
      marginBottom: 6,
      fontWeight: 700,
    },
    row: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
    },
    toggleBtn: (active) => ({
      flex: 1,
      minWidth: 120,
      padding: "12px 14px",
      borderRadius: 12,
      border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
      background: active ? "#0f172a" : "#fff",
      color: active ? "#fff" : "#0f172a",
      cursor: "pointer",
      fontWeight: 700,
    }),
    badge: {
      display: "inline-block",
      padding: "8px 12px",
      borderRadius: 999,
      background: "#f1f5f9",
      fontSize: 13,
      marginRight: 8,
      marginBottom: 8,
    },
    calendarGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: 10,
      marginTop: 16,
    },
    calendarCell: (active) => ({
      border: active ? "1px solid #0f172a" : "1px solid #e2e8f0",
      background: active ? "#0f172a" : "#fff",
      color: active ? "#fff" : "#0f172a",
      borderRadius: 18,
      padding: 12,
      textAlign: "left",
      cursor: "pointer",
    }),
    listItem: {
      border: "1px solid #e2e8f0",
      borderRadius: 18,
      padding: 14,
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "flex-start",
      marginTop: 10,
    },
    chartWrap: {
      marginTop: 18,
    },
    barRow: {
      marginBottom: 14,
    },
    barLabel: {
      fontSize: 13,
      marginBottom: 6,
      color: "#475569",
    },
    barTrack: {
      height: 12,
      background: "#e2e8f0",
      borderRadius: 999,
      overflow: "hidden",
    },
    barFill: (w, color) => ({
      width: `${w}%`,
      height: "100%",
      background: color,
      borderRadius: 999,
    }),
    small: {
      fontSize: 13,
      color: "#64748b",
    },
    moneyPositive: {
      color: "#059669",
      fontWeight: 800,
    },
    moneyNegative: {
      color: "#dc2626",
      fontWeight: 800,
    },
    dangerBtn: {
      padding: "10px 14px",
      borderRadius: 12,
      border: "none",
      background: "#dc2626",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 700,
    },
  };

  if (!isLoaded) {
    return (
      <div style={styles.page}>
        <div style={styles.loginWrap}>
          <div style={styles.loginCard}>
            <h1 style={styles.title}>Budget Tracker</h1>
            <p style={styles.sub}>데이터를 불러오는 중입니다...</p>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // 로그인 / 회원가입 화면
  // =========================
  if (!isLoggedIn) {
    return (
      <div style={styles.page}>
        <div style={styles.loginWrap}>
          <div style={styles.loginCard}>
            <h1 style={styles.title}>Budget Tracker</h1>
            <p style={styles.sub}>
              관리자 승인 코드가 있어야 회원가입할 수 있는 가계부 앱입니다.
            </p>

            <div style={styles.row}>
              <button
                style={styles.toggleBtn(authMode === "login")}
                onClick={() => setAuthMode("login")}
              >
                로그인
              </button>
              <button
                style={styles.toggleBtn(authMode === "signup")}
                onClick={() => setAuthMode("signup")}
              >
                회원가입
              </button>
            </div>

            {authMode === "login" ? (
              <>
                <input
                  style={styles.input}
                  placeholder="아이디"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                />
                <input
                  style={styles.input}
                  type="password"
                  placeholder="비밀번호"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                />
                <button style={styles.btn} onClick={handleLogin}>
                  로그인
                </button>
              </>
            ) : (
              <>
                <input
                  style={styles.input}
                  placeholder="가입할 아이디"
                  value={signupId}
                  onChange={(e) => setSignupId(e.target.value)}
                />
                <input
                  style={styles.input}
                  type="password"
                  placeholder="가입할 비밀번호"
                  value={signupPw}
                  onChange={(e) => setSignupPw(e.target.value)}
                />
                <input
                  style={styles.input}
                  placeholder="관리자가 부여한 승인 코드"
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value.toUpperCase())}
                />
                <button style={styles.btn} onClick={handleSignup}>
                  회원가입
                </button>

                <div style={{ marginTop: 16, ...styles.small }}>
                  승인 코드가 있어야 가입 가능합니다.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // 관리자 페이지
  // =========================
  if (currentUser?.role === "admin" && activePage === "admin") {
    return (
      <div style={styles.page}>
        <div style={styles.shell}>
          <div style={styles.topRow}>
            <div>
              <h1 style={styles.title}>관리자 페이지</h1>
              <div style={styles.sub}>
                승인 코드 발급, 사용 인원 설정, 가입 사용자 관리
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={styles.logoutBtn}
                onClick={() => setActivePage("dashboard")}
              >
                사용자 화면 보기
              </button>
              <button style={styles.logoutBtn} onClick={logout}>
                로그아웃
              </button>
            </div>
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.small}>발급된 승인 코드</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
                {inviteCodes.length}개
              </div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.small}>가입된 사용자</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
                {users.length}명
              </div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.small}>전체 수입</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
                {formatCurrency(totalIncomeAllUsers)}
              </div>
            </div>
            <div style={styles.summaryCard}>
              <div style={styles.small}>전체 지출</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
                {formatCurrency(totalExpenseAllUsers)}
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>승인 코드 생성</h2>
            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>새 승인 코드</div>
                <input
                  style={styles.input}
                  placeholder="예: FAN2026A"
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value.toUpperCase())}
                />
              </div>

              <div style={{ display: "flex", alignItems: "end" }}>
                <button style={styles.btn} onClick={createInviteCode}>
                  코드 생성
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, ...styles.small }}>
              새로 만든 코드는 기본 사용 가능 인원이 1명입니다.
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>승인 코드 목록</h2>

              {inviteCodes.length === 0 ? (
                <div style={{ marginTop: 16, ...styles.small }}>
                  아직 생성된 승인 코드가 없습니다.
                </div>
              ) : (
                <div style={{ marginTop: 16 }}>
                  {inviteCodes.map((item) => {
                    const used = users.filter(
                      (u) => u.inviteCode === item.code
                    ).length;
                    return (
                      <div key={item.code} style={styles.listItem}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{item.code}</div>
                          <div style={{ ...styles.small, marginTop: 6 }}>
                            사용 {used} / {item.maxUsers}
                          </div>
                        </div>

                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          <button
                            style={styles.logoutBtn}
                            onClick={() =>
                              selectCodeToEdit(item.code, item.maxUsers)
                            }
                          >
                            수정
                          </button>
                          <button
                            style={styles.logoutBtn}
                            onClick={() => deleteInviteCode(item.code)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>사용 가능 인원 수정</h2>

              <div style={{ marginTop: 16 }}>
                <div style={styles.label}>선택된 코드</div>
                <input
                  style={styles.input}
                  value={selectedCode}
                  placeholder="왼쪽 목록에서 수정 버튼을 눌러 선택"
                  readOnly
                />
              </div>

              <div>
                <div style={styles.label}>허용 인원 (1~5명)</div>
                <select
                  style={styles.input}
                  value={selectedMaxUsers}
                  onChange={(e) => setSelectedMaxUsers(e.target.value)}
                >
                  <option value="1">1명</option>
                  <option value="2">2명</option>
                  <option value="3">3명</option>
                  <option value="4">4명</option>
                  <option value="5">5명</option>
                </select>
              </div>

              <button style={styles.btn} onClick={updateInviteCodeMaxUsers}>
                인원 수정 저장
              </button>

              <div style={{ marginTop: 14, ...styles.small }}>
                하나의 승인 코드는 최대 5명까지 가입 가능하게 설정할 수
                있습니다.
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>가입 사용자 목록</h2>

            {users.length === 0 ? (
              <div style={{ marginTop: 16, ...styles.small }}>
                아직 가입한 사용자가 없습니다.
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {users.map((user) => {
                  const userEntryCount = entries.filter(
                    (e) => e.userId === user.id
                  ).length;
                  return (
                    <div key={user.id} style={styles.listItem}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{user.id}</div>
                        <div style={{ ...styles.small, marginTop: 6 }}>
                          승인 코드: {user.inviteCode} · 내역 수:{" "}
                          {userEntryCount}건
                        </div>
                      </div>

                      <button
                        style={styles.dangerBtn}
                        onClick={() => deleteUser(user.id)}
                      >
                        사용자 삭제
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>전체 가계부 현황</h2>
            <div style={{ marginTop: 16 }}>
              <span style={styles.badge}>
                전체 수입 {formatCurrency(totalIncomeAllUsers)}
              </span>
              <span style={styles.badge}>
                전체 지출 {formatCurrency(totalExpenseAllUsers)}
              </span>
              <span style={styles.badge}>
                전체 잔액 {formatCurrency(totalBalanceAllUsers)}
              </span>
              <span style={styles.badge}>전체 내역 {entries.length}건</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // 사용자 가계부 페이지
  // =========================
  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topRow}>
          <div>
            <h1 style={styles.title}>Budget Tracker</h1>
            <div style={styles.sub}>
              {currentUser?.role === "admin"
                ? "관리자 계정으로 사용자 화면을 보고 있습니다."
                : `${currentUser?.id} 님의 가계부`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {currentUser?.role === "admin" && (
              <button
                style={styles.logoutBtn}
                onClick={() => setActivePage("admin")}
              >
                관리자 페이지
              </button>
            )}
            <button style={styles.logoutBtn} onClick={logout}>
              로그아웃
            </button>
          </div>
        </div>

        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.small}>이번 달 수입</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
              {formatCurrency(monthIncome)}
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.small}>이번 달 지출</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
              {formatCurrency(monthExpense)}
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.small}>이월 금액</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
              {formatCurrency(appliedCarry)}
            </div>
          </div>
          <div style={styles.summaryCard}>
            <div style={styles.small}>최종 잔액</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
              {formatCurrency(finalBalance)}
            </div>
          </div>
        </div>

<div style={styles.section}>
  <h2 style={styles.sectionTitle}>이월 설정</h2>

  <div style={styles.grid2}>
    <div>
      <div style={styles.label}>이월 방식</div>
      <div style={styles.row}>
        <button
          style={styles.toggleBtn(carryMode === "auto")}
          onClick={() => setCarryMode("auto")}
        >
          자동 이월
        </button>
        <button
          style={styles.toggleBtn(carryMode === "manual")}
          onClick={() => setCarryMode("manual")}
        >
          직접 입력
        </button>
      </div>
    </div>

    <div>
      <div style={styles.label}>직접 입력 금액</div>
      <input
        style={styles.input}
        type="number"
        disabled={carryMode === "auto"}
        value={manualCarry}
        onChange={(e) => setManualCarry(e.target.value)}
        placeholder="직접 이월할 금액 입력"
      />
    </div>
  </div>

  <div style={styles.grid2}>
    <div>
      <div style={styles.label}>이월 추가금</div>
      <input
        style={styles.input}
        type="number"
        value={extraCarry}
        onChange={(e) => setExtraCarry(e.target.value)}
        placeholder="정리 안 된 금액 추가 입력"
      />
    </div>

<div style={styles.section}>
  <h2 style={styles.sectionTitle}>이월 설정</h2>

  <div style={styles.grid2}>
    <div>
      <div style={styles.label}>이월 방식</div>
      <div style={styles.row}>
        <button
          style={styles.toggleBtn(carryMode === "auto")}
          onClick={() => setCarryMode("auto")}
        >
          자동 이월
        </button>
        <button
          style={styles.toggleBtn(carryMode === "manual")}
          onClick={() => setCarryMode("manual")}
        >
          직접 입력
        </button>
      </div>
    </div>

    <div>
      <div style={styles.label}>직접 입력 금액</div>
      <input
        style={styles.input}
        type="number"
        disabled={carryMode === "auto"}
        value={manualCarry}
        onChange={(e) => setManualCarry(e.target.value)}
        placeholder="직접 이월할 금액 입력"
      />
    </div>
  </div>

  <div style={styles.grid2}>
    <div>
      <div style={styles.label}>이월 추가금</div>
      <input
        style={styles.input}
        type="number"
        value={extraCarry}
        onChange={(e) => setExtraCarry(e.target.value)}
        placeholder="정리 안 된 금액 추가 입력"
      />
    </div>

    <div>
      <div style={styles.label}>적용 방식 안내</div>
      <div style={{ ...styles.input, background: "#f8fafc" }}>
        {carryMode === "auto"
          ? "자동 이월 + 이월 추가금"
          : "직접 입력 금액 + 이월 추가금"}
      </div>
    </div>
  </div>

  <div style={{ marginTop: 16 }}>
    <span style={styles.badge}>
      누적 이전 잔액 {formatCurrency(previousMonthBalance)}
    </span>
    <span style={styles.badge}>
      기본 이월금 {formatCurrency(baseCarry)}
    </span>
    <span style={styles.badge}>
      이월 추가금 {formatCurrency(extraCarry)}
    </span>
    <span style={styles.badge}>
      현재 적용 이월 {formatCurrency(appliedCarry)}
    </span>
    <span style={styles.badge}>
      최종 잔액 {formatCurrency(finalBalance)}
    </span>
  </div>
</div>
        <div style={styles.section}>
          <div style={styles.topRow}>
            <h2 style={styles.sectionTitle}>달력 요약</h2>
            <input
              style={{ ...styles.input, width: 180, marginTop: 0 }}
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>

          <div style={styles.calendarGrid}>
            {calendarData.map((item) => (
              <button
                key={item.date}
                style={styles.calendarCell(selectedDate === item.date)}
                onClick={() => setSelectedDate(item.date)}
              >
                <div style={{ fontWeight: 800 }}>{item.day}일</div>
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 8,
                    color: selectedDate === item.date ? "#cbd5e1" : "#059669",
                  }}
                >
                  수입 {item.income.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: selectedDate === item.date ? "#cbd5e1" : "#dc2626",
                  }}
                >
                  지출 {item.expense.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, fontWeight: 700 }}>
                  잔액 {item.balance.toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>기록 추가</h2>

            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>날짜</div>
                <input
                  style={styles.input}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div>
                <div style={styles.label}>구분</div>
                <div style={styles.row}>
                  <button
                    style={styles.toggleBtn(entryType === "income")}
                    onClick={() => {
                      setEntryType("income");
                      setCategory(categories.income[0] || "");
                    }}
                  >
                    수입
                  </button>
                  <button
                    style={styles.toggleBtn(entryType === "expense")}
                    onClick={() => {
                      setEntryType("expense");
                      setCategory(categories.expense[0] || "");
                    }}
                  >
                    지출
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>항목 선택</div>
                <select
                  style={styles.input}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {availableCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={styles.label}>금액</div>
                <input
                  style={styles.input}
                  type="number"
                  placeholder="금액 입력"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {entryType === "expense" && (
              <div>
                <div style={styles.label}>결제 수단</div>
                <select
                  style={styles.input}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option>현금</option>
                  <option>계좌이체</option>
                  <option>체크카드</option>
                  <option>신용카드</option>
                </select>
              </div>
            )}

            <div style={styles.grid2}>
              <div>
                <div style={styles.label}>항목 직접 입력</div>
                <input
                  style={styles.input}
                  placeholder="예: 보험료, 강의수익"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "end" }}>
                <button style={styles.btn} onClick={addCustomCategory}>
                  항목 추가
                </button>
              </div>
            </div>

            <div>
              <div style={styles.label}>메모</div>
              <input
                style={styles.input}
                placeholder="간단한 메모"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            <button style={styles.btn} onClick={addEntry}>
              저장하기
            </button>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>{selectedDate} 내역</h2>

            {dayEntries.length === 0 ? (
              <div style={{ ...styles.small, marginTop: 16 }}>
                해당 날짜의 내역이 아직 없어요.
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {dayEntries.map((item) => (
                  <div key={item.id} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {item.type === "income" ? "수입" : "지출"} ·{" "}
                        {item.category}
                      </div>
                      <div style={{ ...styles.small, marginTop: 6 }}>
                        {item.memo || "메모 없음"}
                        {item.type === "expense"
                          ? ` · ${item.paymentMethod}`
                          : ""}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={
                          item.type === "income"
                            ? styles.moneyPositive
                            : styles.moneyNegative
                        }
                      >
                        {item.type === "income" ? "+" : "-"}{" "}
                        {formatCurrency(item.amount)}
                      </div>
                      <button
                        onClick={() => deleteEntry(item.id)}
                        style={{
                          marginTop: 8,
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          borderRadius: 10,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>적금 현황</h2>
            <div style={styles.grid2}>
              <div style={styles.summaryCard}>
                <div style={styles.small}>이번 달 적금</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
                  {formatCurrency(
                    savingsEntries.reduce((sum, e) => sum + e.amount, 0)
                  )}
                </div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.small}>적금 총액</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
                  {formatCurrency(savingsTotal)}
                </div>
              </div>
            </div>

            <div style={styles.chartWrap}>
              {savingsEntries.length === 0 ? (
                <div style={styles.small}>이번 달 적금 내역이 없어요.</div>
              ) : (
                savingsEntries.map((item, idx) => (
                  <div key={item.id} style={styles.barRow}>
                    <div style={styles.barLabel}>
                      {idx + 1}. {item.date} / {item.memo || item.category}
                    </div>
                    <div style={styles.barTrack}>
                      <div
                        style={styles.barFill(
                          (item.amount /
                            Math.max(
                              ...savingsEntries.map((e) => e.amount),
                              1
                            )) *
                            100,
                          "#6366f1"
                        )}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>지출 내역 분리 보기</h2>

            <div style={styles.row}>
              <button
                style={styles.toggleBtn(expenseTab === "all")}
                onClick={() => setExpenseTab("all")}
              >
                전체 지출
              </button>
              <button
                style={styles.toggleBtn(expenseTab === "normal")}
                onClick={() => setExpenseTab("normal")}
              >
                일반 지출
              </button>
              <button
                style={styles.toggleBtn(expenseTab === "card")}
                onClick={() => setExpenseTab("card")}
              >
                신용카드
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              {shownExpenseEntries.length === 0 ? (
                <div style={styles.small}>선택한 탭의 지출 내역이 없어요.</div>
              ) : (
                shownExpenseEntries.map((item) => (
                  <div key={item.id} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.category}</div>
                      <div style={{ ...styles.small, marginTop: 6 }}>
                        {item.date} · {item.paymentMethod}
                      </div>
                    </div>
                    <div style={styles.moneyNegative}>
                      - {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>연도별 가계부 리포트</h2>
          <div style={styles.chartWrap}>
            {yearlyData.map((item) => (
              <div key={item.label} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>
                  {item.label}
                </div>

                <div style={styles.barLabel}>
                  수입 {formatCurrency(item.income)}
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={styles.barFill(
                      (item.income / maxYearValue) * 100,
                      "#059669"
                    )}
                  />
                </div>

                <div style={{ ...styles.barLabel, marginTop: 8 }}>
                  지출 {formatCurrency(item.expense)}
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={styles.barFill(
                      (item.expense / maxYearValue) * 100,
                      "#dc2626"
                    )}
                  />
                </div>

                <div style={{ ...styles.barLabel, marginTop: 8 }}>
                  잔액 {formatCurrency(item.balance)}
                </div>
                <div style={styles.barTrack}>
                  <div
                    style={styles.barFill(
                      (Math.abs(item.balance) / maxYearValue) * 100,
                      "#2563eb"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.topRow}>
            <h2 style={styles.sectionTitle}>월별 전체 내역</h2>
            <input
              style={{ ...styles.input, width: 180, marginTop: 0 }}
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>

          {groupedByDate.length === 0 ? (
            <div style={{ ...styles.small, marginTop: 16 }}>
              선택한 월의 내역이 아직 없어요.
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              {groupedByDate.map(([date, items]) => {
                const income = items
                  .filter((i) => i.type === "income")
                  .reduce((sum, i) => sum + i.amount, 0);
                const expense = items
                  .filter((i) => i.type === "expense")
                  .reduce((sum, i) => sum + i.amount, 0);

                return (
                  <div
                    key={date}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 20,
                      padding: 16,
                      marginBottom: 16,
                    }}
                  >
                    <div style={styles.topRow}>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>
                        {date}
                      </div>
                      <div>
                        <span style={styles.badge}>
                          수입 {formatCurrency(income)}
                        </span>
                        <span style={styles.badge}>
                          지출 {formatCurrency(expense)}
                        </span>
                        <span style={styles.badge}>
                          잔액 {formatCurrency(income - expense)}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            background: "#f8fafc",
                            borderRadius: 14,
                            padding: 12,
                            marginTop: 8,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {item.category}
                            </div>
                            <div style={styles.small}>
                              {item.memo || "메모 없음"}
                              {item.type === "expense"
                                ? ` · ${item.paymentMethod}`
                                : ""}
                            </div>
                          </div>
                          <div
                            style={
                              item.type === "income"
                                ? styles.moneyPositive
                                : styles.moneyNegative
                            }
                          >
                            {item.type === "income" ? "+" : "-"}{" "}
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
