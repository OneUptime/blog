# How to Build a Full-Stack Application with React Frontend and Azure Functions Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: React, Azure Functions, Full-Stack, Serverless, TypeScript, API, Node.js

Description: Build a complete full-stack application with a React frontend and Azure Functions serverless backend for cost-effective scalable apps.

---

The promise of serverless backends is compelling - you write functions, deploy them, and stop worrying about servers, scaling, and idle costs. Azure Functions delivers on that promise particularly well when paired with a React frontend. Your React app handles the UI, Azure Functions handles the business logic and data access, and you pay only for the compute time your functions actually use. No Express server running 24/7 waiting for requests.

This guide builds a complete expense tracker application with a React frontend and Azure Functions backend, covering everything from project structure to deployment.

## Prerequisites

- Node.js 18 or later
- Azure Functions Core Tools v4
- Azure CLI installed and authenticated
- Basic React and TypeScript knowledge

## Project Structure

The project uses a monorepo structure with the frontend and backend in the same repository:

```
expense-tracker/
  client/           # React frontend
    src/
    package.json
  api/              # Azure Functions backend
    src/functions/
    package.json
  package.json      # Root package.json for scripts
```

```bash
# Create the project structure
mkdir expense-tracker && cd expense-tracker
npm init -y

# Create the React frontend
npm create vite@latest client -- --template react-ts

# Create the Azure Functions backend
mkdir -p api/src/functions
cd api && func init --typescript && cd ..
```

## Building the Azure Functions Backend

Define the data types shared between frontend and backend:

```typescript
// api/src/types.ts - Shared type definitions
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
}
```

Build the API functions:

```typescript
// api/src/functions/expenses.ts - Expense management API
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';

// In-memory store (use Cosmos DB or SQL in production)
const expenses: any[] = [
  { id: '1', description: 'Office supplies', amount: 45.99, category: 'Office', date: '2026-02-10', createdBy: 'user1', createdAt: '2026-02-10T10:00:00Z' },
  { id: '2', description: 'Team lunch', amount: 120.00, category: 'Food', date: '2026-02-12', createdBy: 'user1', createdAt: '2026-02-12T12:00:00Z' },
  { id: '3', description: 'Cloud hosting', amount: 250.00, category: 'Technology', date: '2026-02-14', createdBy: 'user1', createdAt: '2026-02-14T09:00:00Z' },
];

// GET /api/expenses - List expenses with optional filtering
app.http('getExpenses', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'expenses',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const category = request.query.get('category');
    const startDate = request.query.get('startDate');
    const endDate = request.query.get('endDate');

    let result = [...expenses];

    // Apply filters
    if (category) {
      result = result.filter((e) => e.category === category);
    }
    if (startDate) {
      result = result.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      result = result.filter((e) => e.date <= endDate);
    }

    // Sort by date descending
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { jsonBody: result };
  },
});

// POST /api/expenses - Create a new expense
app.http('createExpense', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'expenses',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const body = (await request.json()) as any;

    // Validate required fields
    if (!body.description || !body.amount || !body.category || !body.date) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: description, amount, category, date' },
      };
    }

    if (body.amount <= 0) {
      return {
        status: 400,
        jsonBody: { error: 'Amount must be greater than zero' },
      };
    }

    const newExpense = {
      id: Date.now().toString(),
      description: body.description,
      amount: parseFloat(body.amount),
      category: body.category,
      date: body.date,
      createdBy: 'user1',
      createdAt: new Date().toISOString(),
    };

    expenses.push(newExpense);
    return { status: 201, jsonBody: newExpense };
  },
});

// DELETE /api/expenses/:id - Delete an expense
app.http('deleteExpense', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'expenses/{id}',
  handler: async (request: HttpRequest): Promise<HttpResponseInit> => {
    const id = request.params.id;
    const index = expenses.findIndex((e) => e.id === id);

    if (index === -1) {
      return { status: 404, jsonBody: { error: 'Expense not found' } };
    }

    expenses.splice(index, 1);
    return { status: 204 };
  },
});

// GET /api/expenses/summary - Get expense summary statistics
app.http('getExpenseSummary', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'expenses/summary',
  handler: async (): Promise<HttpResponseInit> => {
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const byCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });

    // Group by month
    const byMonth: Record<string, number> = {};
    expenses.forEach((e) => {
      const month = e.date.substring(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + e.amount;
    });

    return {
      jsonBody: {
        totalAmount,
        count: expenses.length,
        byCategory,
        byMonth,
      },
    };
  },
});
```

## Building the React Frontend

Create the API client for the frontend:

```typescript
// client/src/api/expenses.ts - API client
export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
}

const BASE_URL = '/api';

// Fetch all expenses with optional filters
export async function getExpenses(filters?: {
  category?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Expense[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.startDate) params.set('startDate', filters.startDate);
  if (filters?.endDate) params.set('endDate', filters.endDate);

  const query = params.toString();
  const url = `${BASE_URL}/expenses${query ? '?' + query : ''}`;
  const response = await fetch(url);

  if (!response.ok) throw new Error('Failed to fetch expenses');
  return response.json();
}

// Create a new expense
export async function createExpense(expense: Omit<Expense, 'id' | 'createdBy' | 'createdAt'>): Promise<Expense> {
  const response = await fetch(`${BASE_URL}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense),
  });

  if (!response.ok) throw new Error('Failed to create expense');
  return response.json();
}

// Delete an expense by ID
export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/expenses/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Failed to delete expense');
}

// Get expense summary statistics
export async function getExpenseSummary(): Promise<ExpenseSummary> {
  const response = await fetch(`${BASE_URL}/expenses/summary`);
  if (!response.ok) throw new Error('Failed to fetch summary');
  return response.json();
}
```

Build the main application component:

```typescript
// client/src/App.tsx - Main expense tracker application
import { useState, useEffect } from 'react';
import { Expense, getExpenses, createExpense, deleteExpense, getExpenseSummary, ExpenseSummary } from './api/expenses';

const CATEGORIES = ['Food', 'Transport', 'Technology', 'Office', 'Entertainment', 'Other'];

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadData();
  }, [filterCategory]);

  async function loadData() {
    setLoading(true);
    try {
      const [expenseData, summaryData] = await Promise.all([
        getExpenses(filterCategory ? { category: filterCategory } : undefined),
        getExpenseSummary(),
      ]);
      setExpenses(expenseData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createExpense({
        description,
        amount: parseFloat(amount),
        category,
        date,
      });
      setDescription('');
      setAmount('');
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExpense(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  }

  return (
    <div className="app">
      <h1>Expense Tracker</h1>

      {/* Summary cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <h3>Total</h3>
            <p className="amount">${summary.totalAmount.toFixed(2)}</p>
            <span>{summary.count} expenses</span>
          </div>
          {Object.entries(summary.byCategory).map(([cat, total]) => (
            <div key={cat} className="summary-card">
              <h3>{cat}</h3>
              <p className="amount">${(total as number).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Expense'}
        </button>
      </div>

      {/* Add expense form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="expense-form">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" required />
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" step="0.01" min="0.01" required />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <button type="submit">Save</button>
        </form>
      )}

      {/* Expense list */}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="expense-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.date}</td>
                <td>{expense.description}</td>
                <td>{expense.category}</td>
                <td>${expense.amount.toFixed(2)}</td>
                <td>
                  <button onClick={() => handleDelete(expense.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
```

## Local Development

Set up a Vite proxy so the React dev server forwards API calls to the local Azure Functions runtime:

```typescript
// client/vite.config.ts - Configure proxy for local development
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward /api calls to the Azure Functions runtime
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
});
```

Run both the frontend and backend in separate terminals:

```bash
# Terminal 1: Start Azure Functions
cd api && func start

# Terminal 2: Start React dev server
cd client && npm run dev
```

## Deploying to Azure

Deploy the backend to Azure Functions and the frontend to Azure Static Web Apps or Azure Blob Storage with CDN:

```bash
# Create a Function App for the backend
az functionapp create \
  --resource-group expense-tracker-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name expense-tracker-api \
  --storage-account expensetrackerstorage

# Deploy the functions
cd api && func azure functionapp publish expense-tracker-api

# Build the React frontend
cd client && npm run build

# Deploy to Azure Static Web Apps or use the SWA approach
```

## Wrapping Up

The React and Azure Functions combination gives you a full-stack application where each layer does what it does best. React handles the user interface with its component model and state management. Azure Functions handles the business logic and data access without the overhead of a continuously running server. The monorepo structure keeps everything in one place, the Vite proxy makes local development seamless, and the deployment is straightforward. For applications with variable or unpredictable traffic patterns, the serverless backend can save significant money compared to always-on servers.
