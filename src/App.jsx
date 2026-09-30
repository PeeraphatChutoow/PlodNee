import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  HandCoins,
  Landmark,
  LogOut,
  Pencil,
  PiggyBank,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { AnimatePresence, animate, motion } from 'framer-motion'
import { initialDebts } from './data/mockData'

const NAV_ITEMS = [
  { label: 'แดชบอร์ด', icon: Landmark },
  { label: 'จัดการหนี้', icon: CreditCard },
  { label: 'ประวัติการชำระ', icon: HandCoins },
  { label: 'ที่ปรึกษาการเงิน', icon: Sparkles },
]

const STATUS_STYLES = {
  'ใกล้กำหนด': 'bg-amber-100 text-amber-700 ring-amber-200',
  'ค้างชำระเกินกำหนด': 'bg-rose-100 text-rose-700 ring-rose-200',
  'ค้างชำระ': 'bg-slate-200 text-slate-700 ring-slate-300',
  'ชำระแล้ว': 'bg-emerald-100 text-emerald-700 ring-emerald-200',
}

const safeNumber = (value) => {
  const normalized = typeof value === 'string' ? value.replace(/[^0-9.-]/g, '') : value
  const num = Number(normalized)
  return Number.isFinite(num) ? num : 0
}

const formatCurrency = (value) => {
  const num = safeNumber(value)
  return `THB ${num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatCompactCurrency = (value) => {
  const num = safeNumber(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num)
}

const toInputDate = (dateValue) => {
  if (!dateValue) return new Date().toISOString().slice(0, 10)
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

const diffInDays = (dateString) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dateString)
  due.setHours(0, 0, 0, 0)
  return Math.ceil((due - today) / (1000 * 60 * 60 * 24))
}

const resolveDebtStatus = (debt) => {
  const balance = Number(debt.balance || 0)
  if (balance <= 0) return 'ชำระแล้ว'
  const daysLeft = diffInDays(debt.dueDate)
  if (daysLeft < 0) return 'ค้างชำระเกินกำหนด'
  if (daysLeft <= 7) return 'ใกล้กำหนด'
  return 'ค้างชำระ'
}

const getPriority = (debt) => {
  const balance = Number(debt.balance || 0)
  const rate = Number(debt.rate || 0)
  const daysLeft = diffInDays(debt.dueDate)
  const urgency = Math.max(0, 30 - daysLeft) * 1.4
  const score = rate * 1.8 + balance / 400 + urgency

  if (score > 95) return 'สูง'
  if (score > 60) return 'กลาง'
  return 'ต่ำ'
}

const createEmptyDebt = () => ({
  debtId: '',
  debtorId: '66010001',
  title: '',
  principal: 0,
  balance: 0,
  rate: 0,
  dueDate: toInputDate(new Date()),
  status: 'ค้างชำระ',
})

const AnimatedNumber = ({ value, formatter, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const targetValue = safeNumber(value)
    const controls = animate(0, targetValue, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplayValue(latest),
    })

    return () => controls.stop()
  }, [value])

  return <span className={className}>{formatter ? formatter(displayValue) : displayValue}</span>
}

function App() {
  const [debts, setDebts] = useState(initialDebts)
  const [activeTab, setActiveTab] = useState('แดชบอร์ด')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด')
  const [isDebtModalOpen, setDebtModalOpen] = useState(false)
  const [editingDebtId, setEditingDebtId] = useState(null)
  const [debtForm, setDebtForm] = useState(() => createEmptyDebt())
  const [paymentDebtId, setPaymentDebtId] = useState(null)
  const [paymentForm, setPaymentForm] = useState(() => ({ amount: '', date: toInputDate(new Date()) }))
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  const pushToast = (message, tone = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2400)
  }

  const dataRows = useMemo(
    () =>
      debts
        .map((debt) => ({
          ...debt,
          status: resolveDebtStatus(debt),
          priority: getPriority(debt),
        }))
        .filter((debt) => {
          const searchTerm = query.trim().toLowerCase()
          if (!searchTerm && statusFilter === 'ทั้งหมด') return true

          const matchesQuery =
            !searchTerm ||
            debt.debtId.toLowerCase().includes(searchTerm) ||
            debt.debtorId.toLowerCase().includes(searchTerm) ||
            debt.title.toLowerCase().includes(searchTerm)

          const matchesStatus =
            statusFilter === 'ทั้งหมด' || debt.status === statusFilter || debt.priority === statusFilter

          return matchesQuery && matchesStatus
        }),
    [debts, query, statusFilter],
  )

  const alerts = useMemo(
    () =>
      debts
        .map((debt) => ({ ...debt, status: resolveDebtStatus(debt) }))
        .filter((debt) => Number(debt.balance) > 0 && (debt.status === 'ใกล้กำหนด' || debt.status === 'ค้างชำระเกินกำหนด'))
        .sort((a, b) => diffInDays(a.dueDate) - diffInDays(b.dueDate)),
    [debts],
  )

  const summary = useMemo(() => {
    const totalDebtAmount = debts.reduce(
      (sum, debt) => sum + (safeNumber(debt.amount) || safeNumber(debt.principal) || 0),
      0,
    )
    const totalRemainingBalance = debts.reduce(
      (sum, debt) => sum + (safeNumber(debt.remainingAmount) || safeNumber(debt.balance) || 0),
      0,
    )
    const paidDebtAmount = debts.reduce(
      (sum, debt) =>
        sum + Math.max(safeNumber(debt.amount) || safeNumber(debt.principal) || 0 - (safeNumber(debt.remainingAmount) || safeNumber(debt.balance) || 0), 0),
      0,
    )
    const dueSoonCount = debts.filter((debt) => resolveDebtStatus(debt) === 'ใกล้กำหนด').length

    return {
      totalDebtAmount,
      totalRemainingBalance,
      paidDebtAmount,
      dueSoonCount,
    }
  }, [debts])

  const paymentHistory = useMemo(
    () =>
      debts
        .flatMap((debt) =>
          (debt.paymentHistory || []).map((payment) => ({
            ...payment,
            debtId: debt.debtId,
            debtorId: debt.debtorId,
            title: debt.title,
          })),
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [debts],
  )

  const priorityAdvice = useMemo(
    () =>
      debts
        .map((debt) => ({ ...debt, status: resolveDebtStatus(debt), priority: getPriority(debt) }))
        .sort((a, b) => {
          const priorityScore = {
            สูง: 3,
            กลาง: 2,
            ต่ำ: 1,
          }
          return priorityScore[b.priority] - priorityScore[a.priority]
        })
        .slice(0, 3),
    [debts],
  )

  const savingsPlan = useMemo(() => {
    const activeDebts = debts
      .filter((debt) => Number(debt.balance) > 0)
      .map((debt) => ({
        ...debt,
        daysLeft: diffInDays(debt.dueDate),
      }))
      .filter((debt) => debt.daysLeft >= 0 && debt.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    const totalDaily = activeDebts.reduce((sum, debt) => {
      const days = Math.max(1, debt.daysLeft)
      return sum + Number(debt.balance) / days
    }, 0)

    const totalWeekly = totalDaily * 7

    return {
      activeDebts,
      totalDaily,
      totalWeekly,
    }
  }, [debts])

  const openCreateDebtModal = () => {
    setEditingDebtId(null)
    setDebtForm(createEmptyDebt())
    setDebtModalOpen(true)
  }

  const openEditDebtModal = (debt) => {
    setEditingDebtId(debt.debtId)
    setDebtForm({
      debtId: debt.debtId,
      debtorId: debt.debtorId,
      title: debt.title,
      principal: debt.principal,
      balance: debt.balance,
      rate: debt.rate,
      dueDate: toInputDate(debt.dueDate),
      status: resolveDebtStatus(debt),
    })
    setDebtModalOpen(true)
  }

  const confirmDebtSubmit = (event) => {
    event.preventDefault()

    const normalizedForm = {
      ...debtForm,
      debtId: debtForm.debtId.trim(),
      debtorId: debtForm.debtorId.trim(),
      title: debtForm.title.trim(),
      principal: Number(debtForm.principal || 0),
      balance: Number(debtForm.balance || 0),
      rate: Number(debtForm.rate || 0),
      status: Number(debtForm.balance || 0) <= 0 ? 'ชำระแล้ว' : debtForm.status,
    }

    if (!normalizedForm.debtId || !normalizedForm.debtorId || !normalizedForm.title) {
      pushToast('กรุณากรอกข้อมูลหนี้ให้ครบถ้วน', 'warning')
      return
    }

    if (
      !editingDebtId &&
      debts.some((debt) => debt.debtId.toLowerCase() === normalizedForm.debtId.toLowerCase())
    ) {
      pushToast('รหัสหนี้นี้มีอยู่แล้ว', 'warning')
      return
    }

    setDebts((current) => {
      if (editingDebtId) {
        return current.map((debt) => {
          if (debt.debtId !== editingDebtId) return debt

          const nextDebt = {
            ...debt,
            ...normalizedForm,
            paymentHistory: debt.paymentHistory || [],
          }
          nextDebt.status = Number(nextDebt.balance || 0) <= 0 ? 'ชำระแล้ว' : resolveDebtStatus(nextDebt)
          return nextDebt
        })
      }

      return [
        ...current,
        {
          ...normalizedForm,
          paymentHistory: [],
        },
      ]
    })

    pushToast(editingDebtId ? 'อัปเดตข้อมูลหนี้สำเร็จ' : 'เพิ่มข้อมูลหนี้สำเร็จ')
    setDebtModalOpen(false)
  }

  const deleteDebt = (debtId) => {
    setDebts((current) => current.filter((debt) => debt.debtId !== debtId))
    pushToast('ลบข้อมูลหนี้สำเร็จ')
  }

  const openPaymentModal = (debt) => {
    setPaymentDebtId(debt.debtId)
    setPaymentForm({ amount: '', date: toInputDate(new Date()) })
  }

  const confirmPayment = (event) => {
    event.preventDefault()

    const targetDebt = debts.find((debt) => debt.debtId === paymentDebtId)
    if (!targetDebt) {
      pushToast('ไม่พบข้อมูลหนี้', 'warning')
      return
    }

    const amount = Number(paymentForm.amount || 0)
    if (amount <= 0) {
      pushToast('กรุณาใส่จำนวนเงินชำระที่ถูกต้อง', 'warning')
      return
    }

    if (amount > Number(targetDebt.balance || 0)) {
      pushToast('จำนวนเงินชำระมากกว่ายอดคงค้าง', 'warning')
      return
    }

    const updatedBalance = Math.max(0, Number(targetDebt.balance || 0) - amount)
    const newPayment = {
      id: Date.now(),
      amount,
      date: paymentForm.date,
      note: 'บันทึกการชำระเงิน',
    }

    const fullyPaid = updatedBalance <= 0
    if (fullyPaid) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#f8fafc', '#0f172a'],
      })
    }

    setDebts((current) =>
      current.map((debt) => {
        if (debt.debtId !== paymentDebtId) return debt

        const nextDebt = {
          ...debt,
          balance: updatedBalance,
          paymentHistory: [...(debt.paymentHistory || []), newPayment],
        }

        nextDebt.status = Number(nextDebt.balance || 0) <= 0 ? 'ชำระแล้ว' : resolveDebtStatus(nextDebt)
        return nextDebt
      }),
    )

    pushToast(fullyPaid ? `ชำระหนี้ครบแล้ว ${formatCurrency(amount)}` : `บันทึกการชำระเงิน ${formatCurrency(amount)} สำเร็จ`)
    setPaymentDebtId(null)
  }

  const statCards = [
    {
      label: 'ยอดหนี้ทั้งหมด',
      value: formatCompactCurrency(summary.totalDebtAmount),
      detail: 'รวมเงินต้นทั้งหมด',
      icon: Landmark,
      tone: 'bg-slate-900 text-white',
      trend: '+2.4%',
    },
    {
      label: 'ยอดคงค้าง',
      value: formatCompactCurrency(summary.totalRemainingBalance),
      detail: 'ยอดคงเหลือที่ต้องชำระ',
      icon: Wallet,
      tone: 'bg-zinc-100 text-zinc-800',
      trend: 'ติดตาม',
    },
    {
      label: 'ใกล้ครบกำหนด',
      value: String(summary.dueSoonCount),
      detail: 'ภายใน 7 วัน',
      icon: CalendarClock,
      tone: 'bg-amber-100 text-amber-800',
      trend: 'ต้องตรวจสอบ',
    },
    {
      label: 'ยอดหนี้ที่ชำระแล้ว',
      value: formatCompactCurrency(summary.paidDebtAmount),
      detail: 'มูลค่ที่ชำระแล้ว',
      icon: CheckCircle2,
      tone: 'bg-emerald-100 text-emerald-800',
      trend: 'ดี',
    },
  ]

  return (
    <div className="min-h-screen bg-zinc-100 text-slate-800">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mx-auto max-w-[1600px] px-4 py-4 lg:px-6 lg:py-6"
      >
        <div className="flex flex-col gap-6 xl:flex-row">
          <aside className="w-full rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur xl:w-[270px]">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                DM
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ระบบ</p>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">จัดการหนี้</h1>
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>บัญชี</span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700">
                  ใช้งาน
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">66010001</p>
              <p className="mt-1 text-sm text-slate-500">รหัสลูกหนี้ / โปรไฟล์</p>
            </div>

            <nav className="space-y-2">
              {NAV_ITEMS.map(({ label, icon: Icon }) => {
                const isActive = activeTab === label
                return (
                  <div key={label} className="relative overflow-hidden rounded-2xl">
                    {isActive && (
                      <motion.span
                        layoutId="activeNav"
                        className="absolute inset-0 rounded-2xl bg-slate-900"
                        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab(label)}
                      className={`relative z-10 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
                        isActive ? 'text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  </div>
                )
              })}
            </nav>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                สถานะสิทธิ์
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900">เปิดใช้งานเต็มรูปแบบ</p>
              <p className="mt-1 text-xs text-slate-500">จัดการหนี้ • บันทึกการชำระ • ตรวจสอบแจ้งเตือน</p>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
            <header className="rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาด้วยรหัสหนี้ รหัสลูกหนี้ หรือเจ้าหนี้"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-3 self-end lg:self-auto">
                  <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
                    <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">กระแสเงิน</p>
                      <p className="text-sm font-semibold text-slate-900">+฿8,460</p>
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setNotificationOpen((open) => !open)}
                      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      <Bell className="h-4 w-4" />
                      {alerts.length > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                          {alerts.length}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {notificationOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className="absolute right-0 z-20 mt-3 w-[320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_25px_50px_rgba(15,23,42,0.12)]"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BellRing className="h-4 w-4 text-slate-700" />
                              <p className="text-sm font-semibold text-slate-900">การแจ้งเตือน</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                              {alerts.length} รายการ
                            </span>
                          </div>

                          <div className="space-y-3">
                            {alerts.length === 0 ? (
                              <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
                                ไม่มีการแจ้งเตือนหนี้ที่ใช้งานอยู่
                              </div>
                            ) : (
                              alerts.map((alert) => (
                                <motion.div
                                  key={alert.debtId}
                                  initial={{ opacity: 0, x: 8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.2, ease: 'easeOut' }}
                                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                                      <p className="mt-1 text-xs text-slate-500">{alert.debtId} • {alert.debtorId}</p>
                                    </div>
                                    <motion.span
                                      animate={
                                        alert.status === 'ใกล้กำหนด' || alert.status === 'ค้างชำระเกินกำหนด'
                                          ? {
                                              boxShadow: [
                                                '0 0 0 rgba(251, 191, 36, 0)',
                                                '0 0 0 4px rgba(251, 191, 36, 0.15)',
                                                '0 0 0 rgba(251, 191, 36, 0)',
                                              ],
                                            }
                                          : {}
                                      }
                                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                      className={`rounded-full px-2 py-1 text-[10px] font-medium ${STATUS_STYLES[alert.status]}`}
                                    >
                                      {alert.status}
                                    </motion.span>
                                  </div>
                                  <p className="mt-2 text-xs text-slate-500">
                                    กำหนดชำระในอีก {Math.abs(diffInDays(alert.dueDate))} วัน
                                  </p>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
                      U
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">ลูกหนี้</p>
                      <p className="text-sm font-semibold text-slate-900">66010001</p>
                    </div>
                    <button
                      type="button"
                      className="ml-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <motion.section
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="rounded-[28px] border border-slate-200 bg-zinc-900 p-5 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">แจ้งเตือนอัจฉริยะ</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">มี {alerts.length} รายการที่ต้องตรวจสอบ</h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200">
                  <CircleAlert className="h-4 w-4 text-amber-300" />
                  อัปเดตเมื่อสักครู่
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {alerts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 text-slate-300">
                    ไม่มีแจ้งเตือนที่ใช้งานอยู่
                  </div>
                ) : (
                  alerts.slice(0, 3).map((alert) => (
                    <motion.div
                      key={alert.debtId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">{alert.title}</p>
                        <motion.span
                          animate={
                            alert.status === 'ใกล้กำหนด' || alert.status === 'ค้างชำระเกินกำหนด'
                              ? { boxShadow: ['0 0 0 rgba(251, 191, 36, 0)', '0 0 0 4px rgba(251, 191, 36, 0.18)', '0 0 0 rgba(251, 191, 36, 0)'] }
                              : {}
                          }
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                          className={`rounded-full px-2 py-1 text-[10px] font-medium ${STATUS_STYLES[alert.status]}`}
                        >
                          {alert.status}
                        </motion.span>
                      </div>
                      <p className="mt-3 text-xs text-slate-300">{alert.debtId} • กำหนดชำระ {toInputDate(alert.dueDate)}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(alert.balance)}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.section>

            <AnimatePresence mode="wait">
              {activeTab === 'แดชบอร์ด' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {statCards.map(({ label, value, detail, icon: Icon, tone, trend }, index) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 18, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.25, delay: index * 0.06, ease: 'easeOut' }}
                        whileHover={{ y: -2, scale: 1.01 }}
                        className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            {trend}
                          </span>
                        </div>
                        <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                          <AnimatedNumber
                            value={String(value).replace(/[^\d.-]/g, '')}
                            formatter={(digits) =>
                              label.includes('ยอดหนี้ทั้งหมด') ||
                              label.includes('ยอดคงค้าง') ||
                              label.includes('ยอดหนี้ที่ชำระแล้ว')
                                ? formatCompactCurrency(digits)
                                : String(Math.round(digits))
                            }
                            className="inline-block"
                          />
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{detail}</p>
                      </motion.div>
                    ))}
                  </section>

                  <section className="grid gap-6 xl:grid-cols-[1.55fr_0.9fr]">
                    <motion.div whileHover={{ y: -1 }} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
                      <div className="mb-5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">พอร์ตโฟลิโอ</p>
                          <h3 className="mt-2 text-xl font-semibold text-slate-900">ภาพรวมหนี้</h3>
                        </div>
                        <button
                          type="button"
                          onClick={openCreateDebtModal}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                        >
                          <Plus className="h-4 w-4" />
                          เพิ่มหนี้
                        </button>
                      </div>

                      <div className="space-y-3">
                        {dataRows.slice(0, 4).map((debt, index) => (
                          <motion.div
                            key={debt.debtId}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
                            whileHover={{ y: -2, boxShadow: '0 16px 32px rgba(15, 23, 42, 0.08)' }}
                            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-base font-semibold text-slate-900">{debt.title}</p>
                                <motion.span
                                  animate={
                                    debt.status === 'ใกล้กำหนด' || debt.status === 'ค้างชำระเกินกำหนด'
                                      ? { boxShadow: ['0 0 0 rgba(251, 191, 36, 0)', '0 0 0 4px rgba(251, 191, 36, 0.16)', '0 0 0 rgba(251, 191, 36, 0)'] }
                                      : debt.status === 'ชำระแล้ว'
                                        ? { boxShadow: ['0 0 0 rgba(16, 185, 129, 0)', '0 0 0 4px rgba(16, 185, 129, 0.14)', '0 0 0 rgba(16, 185, 129, 0)'] }
                                        : {}
                                  }
                                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${STATUS_STYLES[debt.status]}`}
                                >
                                  {debt.status}
                                </motion.span>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">{debt.debtId} • {debt.debtorId}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">ยอดคงเหลือ</p>
                                <p className="mt-1 font-semibold text-slate-900">{formatCurrency(debt.balance)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">อัตราดอกเบี้ย</p>
                                <p className="mt-1 font-semibold text-slate-900">{debt.rate}%</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">วันครบกำหนด</p>
                                <p className="mt-1 font-semibold text-slate-900">{toInputDate(debt.dueDate)}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -1 }} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
                      <div className="mb-4 flex items-center gap-2">
                        <Target className="h-5 w-5 text-slate-700" />
                        <h3 className="text-xl font-semibold text-slate-900">คำแนะนำลำดับความสำคัญ</h3>
                      </div>

                      <div className="space-y-3">
                        {priorityAdvice.map((debt, index) => (
                          <motion.div
                            key={debt.debtId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05, ease: 'easeOut' }}
                            whileHover={{ x: 2 }}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">#{index + 1} {debt.title}</p>
                                <p className="text-xs text-slate-500">{debt.debtId}</p>
                              </div>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                debt.priority === 'สูง'
                                  ? 'bg-rose-100 text-rose-700'
                                  : debt.priority === 'กลาง'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {debt.priority}
                              </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                              <span>{debt.rate}% ดอกเบี้ย</span>
                              <span>{formatCurrency(debt.balance)}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'จัดการหนี้' && (
                <motion.section
                  key="manage"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]"
                >
                  <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">การจัดการหนี้</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">จัดการรายการหนี้</h3>
                    </div>
                    <button
                      type="button"
                      onClick={openCreateDebtModal}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" />
                      เพิ่มหนี้
                    </button>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300"
                    >
                      <option value="ทั้งหมด">ทั้งหมด</option>
                      <option value="ใกล้กำหนด">ใกล้กำหนด</option>
                      <option value="ค้างชำระเกินกำหนด">ค้างชำระเกินกำหนด</option>
                      <option value="ค้างชำระ">ค้างชำระ</option>
                      <option value="ชำระแล้ว">ชำระแล้ว</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-400">
                          <th className="pb-3 pr-4 font-medium">รหัสหนี้</th>
                          <th className="pb-3 pr-4 font-medium">เจ้าหนี้</th>
                          <th className="pb-3 pr-4 font-medium">เงินต้น</th>
                          <th className="pb-3 pr-4 font-medium">ยอดคงเหลือ</th>
                          <th className="pb-3 pr-4 font-medium">อัตราดอกเบี้ย</th>
                          <th className="pb-3 pr-4 font-medium">วันครบกำหนด</th>
                          <th className="pb-3 pr-4 font-medium">สถานะ</th>
                          <th className="pb-3 pr-4 font-medium text-right">การกระทำ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence initial={false} mode="popLayout">
                          {dataRows.map((debt, index) => (
                            <motion.tr
                              layout
                              key={debt.debtId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -10 }}
                              transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.02 }}
                              className="border-b border-slate-100 align-middle"
                            >
                              <td className="py-4 pr-4">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{debt.debtId}</p>
                                  <p className="text-xs text-slate-500">ลูกหนี้ {debt.debtorId}</p>
                                </div>
                              </td>
                              <td className="py-4 pr-4 text-sm text-slate-600">{debt.title}</td>
                              <td className="py-4 pr-4 text-sm font-medium text-slate-900">{formatCurrency(debt.principal)}</td>
                              <td className="py-4 pr-4 text-sm font-medium text-slate-900">{formatCurrency(debt.balance)}</td>
                              <td className="py-4 pr-4 text-sm text-slate-700">{debt.rate}%</td>
                              <td className="py-4 pr-4 text-sm text-slate-700">{toInputDate(debt.dueDate)}</td>
                              <td className="py-4 pr-4">
                                <motion.span
                                  animate={
                                    debt.status === 'ใกล้กำหนด' || debt.status === 'ค้างชำระเกินกำหนด'
                                      ? { boxShadow: ['0 0 0 rgba(251, 191, 36, 0)', '0 0 0 4px rgba(251, 191, 36, 0.12)', '0 0 0 rgba(251, 191, 36, 0)'] }
                                      : debt.status === 'ชำระแล้ว'
                                        ? { boxShadow: ['0 0 0 rgba(16, 185, 129, 0)', '0 0 0 4px rgba(16, 185, 129, 0.12)', '0 0 0 rgba(16, 185, 129, 0)'] }
                                        : {}
                                  }
                                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${STATUS_STYLES[debt.status]}`}
                                >
                                  {debt.status}
                                </motion.span>
                              </td>
                              <td className="py-4 pr-4">
                                <div className="flex justify-end gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    type="button"
                                    onClick={() => openEditDebtModal(debt)}
                                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                                    aria-label={`แก้ไข ${debt.debtId}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    type="button"
                                    onClick={() => openPaymentModal(debt)}
                                    className="rounded-xl bg-slate-900 p-2 text-white transition hover:bg-slate-800"
                                    aria-label={`ชำระ ${debt.debtId}`}
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    type="button"
                                    onClick={() => deleteDebt(debt.debtId)}
                                    className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                                    aria-label={`ลบ ${debt.debtId}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </motion.section>
              )}

              {activeTab === 'ประวัติการชำระ' && (
                <motion.section
                  key="history"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">บันทึกการชำระ</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">ประวัติการชำระเงิน</h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {paymentHistory.map((payment, index) => (
                      <motion.div
                        key={`${payment.debtId}-${payment.id}`}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
                        whileHover={{ y: -1 }}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                            <ArrowDownRight className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{payment.debtId}</p>
                            <p className="text-xs text-slate-500">{payment.title} • {payment.debtorId}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-slate-600">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">จำนวนเงิน</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatCurrency(payment.amount)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">วันที่</p>
                            <p className="mt-1 font-semibold text-slate-900">{toInputDate(payment.date)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">หมายเหตุ</p>
                            <p className="mt-1 font-medium text-slate-700">{payment.note}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}

              {activeTab === 'ที่ปรึกษาการเงิน' && (
                <motion.section
                  key="advisor"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-6"
                >
                  <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <motion.div whileHover={{ y: -1 }} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
                      <div className="mb-5 flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-slate-700" />
                        <h3 className="text-xl font-semibold text-slate-900">แผนการออมที่แนะนำ</h3>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">เป้าหมายรายวัน</p>
                          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                            {formatCurrency(savingsPlan.totalDaily)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">แนะนำต่อวัน</p>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05, ease: 'easeOut' }} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">เป้าหมายรายสัปดาห์</p>
                          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
                            {formatCurrency(savingsPlan.totalWeekly)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">แนะนำต่อสัปดาห์</p>
                        </motion.div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {savingsPlan.activeDebts.map((debt, index) => (
                          <motion.div
                            key={debt.debtId}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.04, ease: 'easeOut' }}
                            whileHover={{ x: 2 }}
                            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{debt.title}</p>
                              <p className="text-xs text-slate-500">{debt.debtId} • เหลืออีก {debt.daysLeft} วัน</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(debt.balance) / Math.max(1, debt.daysLeft))}</p>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">ต่อวัน</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ y: -1 }} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
                      <div className="mb-5 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-slate-700" />
                        <h3 className="text-xl font-semibold text-slate-900">ลำดับการชำระที่แนะนำ</h3>
                      </div>

                      <div className="space-y-3">
                        {priorityAdvice.map((debt, index) => (
                          <motion.div
                            key={debt.debtId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.05, ease: 'easeOut' }}
                            whileHover={{ x: 2 }}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-medium text-white">
                                ความสำคัญ #{index + 1}
                              </span>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                debt.priority === 'สูง'
                                  ? 'bg-rose-100 text-rose-700'
                                  : debt.priority === 'กลาง'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {debt.priority}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-semibold text-slate-900">{debt.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{debt.debtId} • เหลือ {formatCurrency(debt.balance)}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </main>
        </div>
      </motion.div>

      <AnimatePresence>
        {isDebtModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_40px_100px_rgba(15,23,42,0.25)]"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ข้อมูลหนี้</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    {editingDebtId ? 'แก้ไขหนี้' : 'เพิ่มหนี้'}
                  </h3>
                </div>
                <button type="button" onClick={() => setDebtModalOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  ปิด
                </button>
              </div>

              <form onSubmit={confirmDebtSubmit} className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-600 md:col-span-1">
                  <span>รหัสหนี้</span>
                  <input
                    value={debtForm.debtId}
                    onChange={(event) => setDebtForm((current) => ({ ...current, debtId: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                    placeholder="DEBT006"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600 md:col-span-1">
                  <span>รหัสลูกหนี้</span>
                  <input
                    value={debtForm.debtorId}
                    onChange={(event) => setDebtForm((current) => ({ ...current, debtorId: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                    placeholder="66010001"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                  <span>ชื่อเจ้าหนี้ / หัวข้อหนี้</span>
                  <input
                    value={debtForm.title}
                    onChange={(event) => setDebtForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                    placeholder="บัตรเครดิตกรุงเทพ"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>จำนวนเงินต้น</span>
                  <input
                    type="number"
                    min="0"
                    value={debtForm.principal}
                    onChange={(event) => setDebtForm((current) => ({ ...current, principal: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>ยอดคงเหลือ</span>
                  <input
                    type="number"
                    min="0"
                    value={debtForm.balance}
                    onChange={(event) => setDebtForm((current) => ({ ...current, balance: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>อัตราดอกเบี้ย (%)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={debtForm.rate}
                    onChange={(event) => setDebtForm((current) => ({ ...current, rate: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600">
                  <span>วันครบกำหนด</span>
                  <input
                    type="date"
                    value={debtForm.dueDate}
                    onChange={(event) => setDebtForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                  <span>สถานะ</span>
                  <select
                    value={debtForm.status}
                    onChange={(event) => setDebtForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                  >
                    <option value="ค้างชำระ">ค้างชำระ</option>
                    <option value="ใกล้กำหนด">ใกล้กำหนด</option>
                    <option value="ค้างชำระเกินกำหนด">ค้างชำระเกินกำหนด</option>
                    <option value="ชำระแล้ว">ชำระแล้ว</option>
                  </select>
                </label>

                <div className="md:col-span-2 mt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDebtModalOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    {editingDebtId ? 'บันทึกการแก้ไข' : 'เพิ่มหนี้'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentDebtId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_40px_100px_rgba(15,23,42,0.25)]"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">การชำระ</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">บันทึกการชำระเงิน</h3>
                </div>
                <button type="button" onClick={() => setPaymentDebtId(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  ปิด
                </button>
              </div>

              <form onSubmit={confirmPayment} className="space-y-4">
                <label className="block space-y-2 text-sm text-slate-600">
                  <span>จำนวนเงินชำระ</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                    placeholder="500"
                  />
                </label>

                <label className="block space-y-2 text-sm text-slate-600">
                  <span>วันที่ชำระ</span>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 outline-none focus:border-slate-300"
                  />
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentDebtId(null)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
                    บันทึกการชำระ
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg ${
                toast.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {toast.tone === 'warning' ? <CircleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default App
