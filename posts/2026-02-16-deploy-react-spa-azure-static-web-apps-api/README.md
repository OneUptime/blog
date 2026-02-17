# How to Deploy a React Single Page Application to Azure Static Web Apps with API Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: React, Azure, Static Web Apps, API, Azure Functions, SPA, Deployment

Description: Deploy a React single page application to Azure Static Web Apps with an integrated Azure Functions API backend for full-stack hosting.

---

Hosting a React single page application and its API on separate services introduces complexity - you need to handle CORS, manage two deployment pipelines, and keep the pieces in sync. Azure Static Web Apps eliminates that by hosting both your React frontend and an Azure Functions API on the same domain. The frontend gets global CDN distribution, the API runs as serverless functions, and deployments happen automatically through GitHub Actions.

This guide builds a complete task management application with a React frontend and Azure Functions API, deployed together to Azure Static Web Apps.

## Prerequisites

- Node.js 18 or later
- An Azure account
- A GitHub account
- Azure CLI installed
- Basic React knowledge

## Creating the React Application

Start with a Vite-based React project (faster builds than Create React App):

```bash
# Create the React app with TypeScript
npm create vite@latest task-manager -- --template react-ts
cd task-manager
npm install
```

## Building the Task Management UI

Create a simple but functional task management interface:

```typescript
// src/types.ts - Shared type definitions
export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}
```

Build an API client that talks to the Azure Functions backend:

```typescript
// src/api.ts - API client for the Azure Functions backend
import { Task } from './types';

// The API is served from the same domain under /api
const API_BASE = '/api';

// Fetch all tasks from the backend
export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE}/tasks`);
  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }
  return response.json();
}

// Create a new task
export async function createTask(
  task: Omit<Task, 'id' | 'createdAt'>
): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!response.ok) {
    throw new Error('Failed to create task');
  }
  return response.json();
}

// Toggle task completion status
export async function toggleTask(id: string): Promise<Task> {
  const response = await fetch(`${API_BASE}/tasks/${id}/toggle`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to toggle task');
  }
  return response.json();
}

// Delete a task
export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete task');
  }
}
```

Now build the main application component:

```typescript
// src/App.tsx - Main application component
import { useState, useEffect } from 'react';
import { Task } from './types';
import { fetchTasks, createTask, toggleTask, deleteTask } from './api';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  // Handle creating a new task
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const newTask = await createTask({
        title: title.trim(),
        description: description.trim(),
        completed: false,
        priority,
      });
      setTasks((prev) => [newTask, ...prev]);
      setTitle('');
      setDescription('');
      setPriority('medium');
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  }

  // Handle toggling task completion
  async function handleToggle(id: string) {
    try {
      const updated = await toggleTask(id);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  }

  // Handle deleting a task
  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  // Filter tasks based on current selection
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'active') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  if (loading) return <div className="loading">Loading tasks...</div>;

  return (
    <div className="app">
      <h1>Task Manager</h1>

      <form onSubmit={handleCreate} className="task-form">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button type="submit">Add Task</button>
      </form>

      <div className="filters">
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>All ({tasks.length})</button>
        <button onClick={() => setFilter('active')} className={filter === 'active' ? 'active' : ''}>Active ({tasks.filter(t => !t.completed).length})</button>
        <button onClick={() => setFilter('completed')} className={filter === 'completed' ? 'active' : ''}>Completed ({tasks.filter(t => t.completed).length})</button>
      </div>

      <ul className="task-list">
        {filteredTasks.map((task) => (
          <li key={task.id} className={`task ${task.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => handleToggle(task.id)}
            />
            <div className="task-content">
              <strong>{task.title}</strong>
              {task.description && <p>{task.description}</p>}
              <span className={`priority ${task.priority}`}>{task.priority}</span>
            </div>
            <button onClick={() => handleDelete(task.id)} className="delete">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

## Building the API Backend

Create the Azure Functions API in an `api` directory:

```bash
# Create the API directory
mkdir -p api/src/functions
cd api
npm init -y
npm install @azure/functions
```

Create the tasks API function:

```javascript
// api/src/functions/tasks.js - Task management API endpoints
const { app } = require('@azure/functions');

// In-memory storage (use a database in production)
let tasks = [
  {
    id: '1',
    title: 'Set up Azure Static Web Apps',
    description: 'Deploy the React app with API backend',
    completed: true,
    priority: 'high',
    createdAt: '2026-02-16T10:00:00Z',
  },
  {
    id: '2',
    title: 'Add authentication',
    description: 'Integrate Azure AD for user login',
    completed: false,
    priority: 'medium',
    createdAt: '2026-02-16T11:00:00Z',
  },
];

// GET /api/tasks - List all tasks
app.http('getTasks', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async () => {
    return {
      jsonBody: tasks.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  },
});

// POST /api/tasks - Create a new task
app.http('createTask', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'tasks',
  handler: async (request) => {
    const body = await request.json();

    const newTask = {
      id: Date.now().toString(),
      title: body.title,
      description: body.description || '',
      completed: false,
      priority: body.priority || 'medium',
      createdAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    return { status: 201, jsonBody: newTask };
  },
});

// PATCH /api/tasks/:id/toggle - Toggle task completion
app.http('toggleTask', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'tasks/{id}/toggle',
  handler: async (request, context) => {
    const id = request.params.id;
    const task = tasks.find((t) => t.id === id);

    if (!task) {
      return { status: 404, jsonBody: { error: 'Task not found' } };
    }

    task.completed = !task.completed;
    return { jsonBody: task };
  },
});

// DELETE /api/tasks/:id - Delete a task
app.http('deleteTask', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'tasks/{id}',
  handler: async (request) => {
    const id = request.params.id;
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      return { status: 404, jsonBody: { error: 'Task not found' } };
    }

    tasks.splice(index, 1);
    return { status: 204 };
  },
});
```

## Configuring the Static Web App

Create a configuration file at the project root:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/assets/*"]
  },
  "routes": [
    {
      "route": "/api/*",
      "methods": ["GET", "POST", "PATCH", "DELETE"]
    }
  ],
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  }
}
```

Save this as `staticwebapp.config.json` in the root directory.

## Deploying to Azure

Push to GitHub and create the Static Web App:

```bash
# Initialize git and push to GitHub
git init
git add .
git commit -m "Initial commit"
gh repo create task-manager-swa --public --push --source .

# Create the Azure Static Web App
az staticwebapp create \
  --name task-manager-swa \
  --resource-group swa-demo-rg \
  --source https://github.com/YOUR_USERNAME/task-manager-swa \
  --location eastus \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --login-with-github
```

The `--api-location "api"` parameter tells Azure where to find the Functions API. The `--output-location "dist"` matches Vite's default build output directory.

## Testing Locally

Before deploying, test the full stack locally using the Static Web Apps CLI:

```bash
# Install the SWA CLI
npm install -g @azure/static-web-apps-cli

# Start both the frontend dev server and API
swa start http://localhost:5173 --api-location api
```

This proxies API requests from the Vite dev server to the local Azure Functions runtime, mimicking the production environment.

## Adding Authentication

Azure Static Web Apps has built-in authentication providers. You can protect API routes without writing any auth code:

```json
{
  "routes": [
    {
      "route": "/api/tasks",
      "methods": ["POST", "PATCH", "DELETE"],
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/api/tasks",
      "methods": ["GET"],
      "allowedRoles": ["anonymous"]
    }
  ]
}
```

Access user information in your React app through the built-in auth endpoint:

```typescript
// src/auth.ts - Get the current user from Azure SWA auth
export async function getCurrentUser() {
  const response = await fetch('/.auth/me');
  const { clientPrincipal } = await response.json();
  return clientPrincipal;
}
```

## Wrapping Up

Azure Static Web Apps is one of the most straightforward ways to deploy a React SPA with an API backend. You get a single deployment pipeline for both frontend and backend, no CORS issues since everything runs on the same domain, built-in authentication, staging environments for pull requests, and global CDN distribution for the frontend. The Azure Functions API scales automatically, and you only pay for what you use. For most React applications that need a lightweight backend, this setup covers everything you need.
