
import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'http://localhost:8080/api/expenses'

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Other',
]

function App() {
  const [expenses, setExpenses] = useState([])
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [message, setMessage] = useState('Loading expenses...')
  const [messageType, setMessageType] = useState('info')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterDate, setFilterDate] = useState('')
  const [monthlyBudget, setMonthlyBudget] = useState(() => {
  const savedBudget = localStorage.getItem('smartspend-monthly-budget')
  return savedBudget ? Number(savedBudget) : 25000
})

const [budgetInput, setBudgetInput] = useState(() => {
  const savedBudget = localStorage.getItem('smartspend-monthly-budget')
  return savedBudget ? String(savedBudget) : '25000'
})


  // Load expenses from MySQL through Spring Boot
  useEffect(() => {
    async function loadExpenses() {
      try {
        const response = await fetch(API_URL)

        if (!response.ok) {
          throw new Error('Unable to load expenses.')
        }

        const data = await response.json()
        setExpenses(data)
        setMessage('')
      } catch {
        setMessage(
          'Could not connect to the backend. Make sure Spring Boot is running.'
        )
        setMessageType('error')
      } finally {
        setLoading(false)
      }
    }

    loadExpenses()
  }, [])

  const money = value =>
    '₹' +
    Number(value).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })

  const today = new Date()
  const currentMonth =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const filteredExpenses = expenses.filter(item => {
  const matchesSearch = item.title
    .toLowerCase()
    .includes(searchTerm.trim().toLowerCase())

  const matchesCategory =
    filterCategory === 'All' ||
    item.category === filterCategory

  const matchesDate =
    filterDate === '' || item.date === filterDate

  return matchesSearch && matchesCategory && matchesDate
})
  const total = expenses.reduce(
    (sum, item) => sum + Number(item.amount),
    0
  )

  const thisMonth = expenses
    .filter(item => item.date?.slice(0, 7) === currentMonth)
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const budgetUsed = monthlyBudget > 0
  ? (thisMonth / monthlyBudget) * 100
  : 0

  const remainingBudget = monthlyBudget - thisMonth

  const budgetProgress = Math.min(budgetUsed, 100)
  // Prepare the last six calendar months
  const monthlyData = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(
      today.getFullYear(),
      today.getMonth() - (5 - index),
      1
    )

    const key =
      `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`

    const monthTotal = expenses
      .filter(item => item.date?.slice(0, 7) === key)
      .reduce((sum, item) => sum + Number(item.amount), 0)

    return {
      key,
      label: monthDate.toLocaleDateString('en-IN', {
        month: 'short',
      }),
      amount: monthTotal,
    }
  })

  const maxMonthlyAmount = Math.max(
    ...monthlyData.map(item => item.amount),
    1
  )

  // Prepare category spending data
  const categoryData = CATEGORIES.map(name => ({
    name,
    amount: expenses
      .filter(item => item.category === name)
      .reduce((sum, item) => sum + Number(item.amount), 0),
  }))

  const maxCategoryAmount = Math.max(
    ...categoryData.map(item => item.amount),
    1
  )
  function saveMonthlyBudget(event) {
   event.preventDefault()

   const value = Number(budgetInput)

   if (
    budgetInput.trim() === '' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    value > 100000000
   ) {
    showMessage('Enter a budget greater than ₹0 and at most ₹10 crore.', 'error')
    return
   }

   setMonthlyBudget(value)
   localStorage.setItem('smartspend-monthly-budget', String(value))
   showMessage('Monthly budget saved successfully!')
  }
  function resetForm() {
    setTitle('')
    setAmount('')
    setCategory('Food')
    setDate(new Date().toISOString().slice(0, 10))
    setEditingId(null)
  }
  function exportExpensesToCSV() {
    if (expenses.length === 0) {
      showMessage('No expenses available to export.', 'error')
      return
    }

    const headers = ['ID', 'Title', 'Amount (INR)', 'Category', 'Date']

    const rows = expenses.map((item, index) => [
      index + 1,
      item.title,
      item.amount,
      item.category,
      item.date,
    ])

    const csvContent = [headers, ...rows]
      .map(row =>
        row
          .map(value => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\r\n')

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'SmartSpend-Expenses.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    showMessage('Expenses exported successfully!')
  }

  function showMessage(text, type = 'success') {
    setMessage(text)
    setMessageType(type)
  }

  function startEditing(item) {
    setEditingId(item.id)
    setTitle(item.title)
    setAmount(String(item.amount))
    setCategory(item.category)
    setDate(item.date)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Add a new expense or update an existing expense
  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    const numericAmount = Number(amount)

    if (!trimmedTitle) {
      showMessage('Please enter an expense name.', 'error')
      return
    }

    if (
      amount.trim() === '' ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > 10000000
    ) {
      showMessage(
        'Enter an amount greater than ₹0 and not exceeding ₹1,00,00,000.',
        'error'
      )
      return
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      showMessage('Please select a valid date.', 'error')
      return
    }

    if (!CATEGORIES.includes(category)) {
      showMessage('Please select a valid category.', 'error')
      return
    }

    setSaving(true)
    setMessage('')

    const isEditing = editingId !== null
    const expenseData = {
      title: trimmedTitle,
      amount: numericAmount,
      category,
      date,
    }

    try {
      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expenseData),
        }
      )

      if (!response.ok) {
        throw new Error('Could not save the expense.')
      }

      const savedExpense = await response.json()

      if (isEditing) {
        setExpenses(previous =>
          previous.map(item =>
            item.id === editingId ? savedExpense : item
          )
        )
      } else {
        setExpenses(previous => [savedExpense, ...previous])
      }

      resetForm()

      showMessage(
        isEditing
          ? 'Expense updated successfully!'
          : 'Expense added successfully!'
      )
    } catch {
      showMessage(
        isEditing
          ? 'Could not update the expense. Please try again.'
          : 'Could not add the expense. Check your backend connection.',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  // Delete an expense from the database
async function deleteExpense(id) {
  setDeletingId(id)

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Could not delete expense.')
    }

    setExpenses(previous =>
      previous.filter(item => item.id !== id)
    )

    if (editingId === id) {
      resetForm()
    }

    setExpenseToDelete(null)
    showMessage('Expense deleted successfully!')
  } catch {
    showMessage(
      'Could not delete the expense. Please try again.',
      'error'
    )
  } finally {
    setDeletingId(null)
  }
}


  function categoryIcon(name) {
    const icons = {
      Food: '🍲',
      Transport: '🚌',
      Shopping: '🛍️',
      Bills: '🧾',
      Health: '💊',
      Education: '📚',
      Other: '💰',
    }

    return icons[name] || '💰'
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">₹</span>
          <span>SmartSpend</span>
        </div>

        <p className="nav-heading">MENU</p>

        <a className="nav-item active" href="#dashboard">
          <span>▦</span> Dashboard
        </a>

        <a className="nav-item" href="#transactions">
          <span>↔</span> Transactions
        </a>

        <a className="nav-item" href="#analytics">
          <span>▥</span> Spending analytics
        </a>

        <div className="sidebar-note">
          <span className="tip-icon">💡</span>
          <strong>Small steps matter</strong>
          <p>
            Track your spending today to make smarter decisions tomorrow.
          </p>
        </div>

        <div className="sidebar-footer">
          Personal finance tracker
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">PERSONAL FINANCE</p>
            <h1>Dashboard</h1>
            <p className="muted">
              Welcome back! Here is your spending overview.
            </p>
          </div>

          <div className="profile">
            <span className="profile-icon">👤</span>
            <div>
              <strong>My Wallet</strong>
              <small>Personal account</small>
            </div>
          </div>
        </header>

        {message && (
          <div
            className={`status-message ${messageType}`}
            role="status"
            aria-live="polite"
          >
            {message}
          </div>
        )}

        <section className="summary-grid">
          <article className="summary-card dark-card">
            <div className="card-label">
              Total recorded expenses
              <span className="card-symbol">↗</span>
            </div>
            <h2>{money(total)}</h2>
            <p>Across all recorded transactions</p>
          </article>

          <article className="summary-card">
            <div className="card-label">
              This month's spending
              <span className="card-symbol">▤</span>
            </div>
            <h2>{money(thisMonth)}</h2>
            <p>Expenses recorded this month</p>
          </article>

          <article className="summary-card">
            <div className="card-label">
              Transactions
              <span className="card-symbol">↔</span>
            </div>
            <h2>{expenses.length}</h2>
            <p>Expenses you've recorded</p>
          </article>
        </section>
<section className="panel budget-panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">MONTHLY FINANCIAL GOAL</p>
      <h3>Monthly budget</h3>
      <p className="muted">
        Track your spending against your monthly limit.
      </p>
    </div>
    <span className="panel-icon">₹</span>
  </div>
  <form className="budget-form" onSubmit={saveMonthlyBudget}>
    <label>
      Monthly budget (₹)
      <input
        type="number"
        min="1"
        max="100000000"
        step="0.01"
        value={budgetInput}
        onChange={event => setBudgetInput(event.target.value)}
        required
      />
    </label>

    <button className="primary-button" type="submit">
      Save budget
    </button>
  </form>

  <div className="budget-summary">
    <div>
      <span>Spent this month</span>
      <strong>{money(thisMonth)}</strong>
    </div>
    <div>
      <span>Monthly limit</span>
      <strong>{money(monthlyBudget)}</strong>
    </div>
    <div>
      <span>{remainingBudget >= 0 ? 'Remaining' : 'Over budget'}</span>
      <strong>{money(Math.abs(remainingBudget))}</strong>
    </div>
  </div>

  <div
    className="budget-progress-track"
    role="progressbar"
    aria-label="Monthly budget used"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(budgetProgress)}
  >
    <div
      className={`budget-progress-fill ${
        budgetUsed >= 100
          ? 'budget-exceeded'
          : budgetUsed >= 80
            ? 'budget-warning'
            : ''
      }`}
      style={{ width: `${budgetProgress}%` }}
    />
  </div>

  <p className="budget-status">
    {budgetUsed >= 100
      ? 'You have reached or exceeded your monthly budget.'
      : budgetUsed >= 80
        ? `Warning: You have used ${Math.round(budgetUsed)}% of your budget.`
        : `${Math.round(budgetUsed)}% of your monthly budget used.`}
         </p>
        </section>

        <div className="content-grid">
          <section className="panel expense-panel">
            <div className="panel-heading">
              <div>
                <h3>
                  {editingId !== null
                    ? 'Edit expense'
                    : 'Add an expense'}
                </h3>
                <p className="muted">
                  {editingId !== null
                    ? 'Update the details of your transaction.'
                    : 'Record where your money goes.'}
                </p>
              </div>

              <span className="panel-icon">
                {editingId !== null ? '✎' : '＋'}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="expense-form">
              <label>
                Expense name
                <input
                  type="text"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder="e.g. Lunch, groceries"
                  maxLength={80}
                  required
                />
              </label>

              <label>
                Amount (₹)
                <input
                  type="number"
                  min="0.01"
                  max="10000000"
                  step="0.01"
                  value={amount}
                  onChange={event => setAmount(event.target.value)}
                  placeholder="e.g. 250"
                  required
                />
              </label>

              <label>
                Category
                <select
                  value={category}
                  onChange={event => setCategory(event.target.value)}
                >
                  {CATEGORIES.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  required
                />
              </label>

              <button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingId !== null
                    ? '✓ Save changes'
                    : '＋ Add expense'}
              </button>

              {editingId !== null && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel editing
                </button>
              )}
            </form>
          </section>

          <section
            className="panel transactions-panel"
            id="transactions"
          >
            <div className="panel-heading">
              <div>
                <h3>Recent transactions</h3>
                <p className="muted">
                  Your latest recorded expenses.
                </p>
              </div>
              <div className="transaction-heading-actions">
               <button
                type="button"
                className="export-button"
                onClick={exportExpensesToCSV}
               >
                ↓ Export CSV
               </button>
                <span className="count-badge">{expenses.length}</span>
              </div>
             </div>
            <div className="transaction-filters">
             <input
              type="search"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              aria-label="Search expenses by title"
             />

            <select
             value={filterCategory}
             onChange={event => setFilterCategory(event.target.value)}
             aria-label="Filter expenses by category"
           >
            <option value="All">All categories</option>
            {CATEGORIES.map(name => (
             <option key={name} value={name}>
              {name}
             </option>
           ))}
           </select>
           <input
            type="date"
            value={filterDate}
            onChange={event => setFilterDate(event.target.value)}
            aria-label="Filter expenses by date"
          />

          <button
           type="button"
           className="secondary-button"
           onClick={() => {
            setSearchTerm('')
            setFilterCategory('All')
            setFilterDate('')
        }}
    >
        Clear filters
      </button>
     </div>

            {loading ? (
              <p className="empty-state">Loading transactions...</p>
            ) : filteredExpenses.length === 0 ? (
            <p className="empty-state">
             No matching expenses found. Try changing your filters.
            </p>

            ) : (
              <div className="transaction-list">
                {filteredExpenses.map(item => (
                  <article className="transaction" key={item.id}>
                    <div className="transaction-icon">
                      {categoryIcon(item.category)}
                    </div>

                    <div className="transaction-info">
                      <strong>{item.title}</strong>
                      <small>
                        {item.category} · {item.date}
                      </small>
                    </div>

                    <div className="transaction-right">
                      <strong className="transaction-amount">
                        {money(item.amount)}
                      </strong>

                      <div className="transaction-actions">
                        <button
                          className="edit-button"
                          type="button"
                          onClick={() => startEditing(item)}
                          disabled={
                            saving ||
                            deletingId !== null
                          }
                          aria-label={`Edit ${item.title}`}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          type="button"
                          onClick={() => deleteExpense(item.id)}
                          disabled={
                            saving ||
                            deletingId !== null
                          }
                          aria-label={`Delete ${item.title}`}
                        >
                          {deletingId === item.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="panel analytics-panel" id="analytics">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">YOUR FINANCIAL SUMMARY</p>
              <h3>Spending analytics</h3>
              <p className="muted">
                Understand your spending habits at a glance.
              </p>
            </div>
            <span className="panel-icon">▥</span>
          </div>

          <div className="analytics-grid">
            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <h3>Spending by category</h3>
                  <p className="muted">
                    Compare total spending across categories.
                  </p>
                </div>
              </div>

              {expenses.length === 0 ? (
                <p className="empty-state">
                  Add expenses to see your category chart.
                </p>
              ) : (
                <div className="category-chart">
                  {categoryData.map(item => (
                    <div className="category-row" key={item.name}>
                      <div className="category-label">
                        <span>
                          {categoryIcon(item.name)} {item.name}
                        </span>
                        <strong>{money(item.amount)}</strong>
                      </div>

                      <div
                        className="bar-track"
                        role="progressbar"
                        aria-label={`${item.name} spending`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={
                          Math.round(
                            (item.amount / maxCategoryAmount) * 100
                          )
                        }
                      >
                        <div
                          className="bar-fill"
                          style={{
                            width: `${
                              (item.amount / maxCategoryAmount) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <div>
                  <h3>Monthly spending</h3>
                  <p className="muted">
                    Spending during the last six calendar months.
                  </p>
                </div>
              </div>

              {expenses.length === 0 ? (
                <p className="empty-state">
                  Add expenses to see your monthly chart.
                </p>
              ) : (
                <>
                  <div className="monthly-chart">
                    {monthlyData.map(item => (
                      <div className="month-column" key={item.key}>
                        <span
                          className="month-value"
                          title={money(item.amount)}
                        >
                          {item.amount > 0
                            ? money(item.amount)
                            : '—'}
                        </span>

                        <div className="month-bar-track">
                          <div
                            className={`month-bar-fill ${
                              item.key === currentMonth
                                ? 'current-month-bar'
                                : ''
                            }`}
                            style={{
                              height:
                                item.amount > 0
                                  ? `${Math.max(
                                      (item.amount /
                                        maxMonthlyAmount) *
                                        100,
                                      4
                                    )}%`
                                  : '0%',
                            }}
                          />
                        </div>

                        <span className="month-label">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="chart-footnote">
                    Monthly totals are based on expense dates.
                  </p>
                </>
              )}
            </article>
          </div>
        </section>

        <footer className="app-footer">
          SmartSpend · Simple tracking for smarter spending
        </footer>
      </main>
    </div>
  )
}

export default App
