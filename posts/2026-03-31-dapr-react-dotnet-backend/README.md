# How to Use Dapr with React Frontend and .NET Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, React, .NET, Microservice, Service Invocation

Description: Build a full-stack application with a React frontend calling a .NET backend through Dapr service invocation for decoupled, observable communication.

---

Combining React, .NET, and Dapr gives you a modern full-stack architecture where the frontend communicates with backend services through Dapr's sidecar without hardcoded URLs or direct HTTP dependencies. This guide walks through building a task management app with this stack.

## Architecture Overview

```text
React (browser) -> React Dev Server -> Dapr HTTP API -> .NET Service
```

In production, React makes API calls to a BFF (Backend for Frontend) or directly to Dapr's HTTP port. The .NET backend runs with a Dapr sidecar that handles service discovery, retries, and observability.

## Setting Up the .NET Backend with Dapr

Create a new .NET Web API project:

```bash
dotnet new webapi -n TaskApi
cd TaskApi
dotnet add package Dapr.AspNetCore
```

Register Dapr services in `Program.cs`:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddDapr();
builder.Services.AddDaprClient();

var app = builder.Build();

app.UseCloudEvents();
app.MapControllers();
app.MapSubscribeHandler();

app.Run();
```

Create a tasks controller:

```csharp
[ApiController]
[Route("[controller]")]
public class TasksController : ControllerBase
{
    private readonly DaprClient _daprClient;

    public TasksController(DaprClient daprClient)
    {
        _daprClient = daprClient;
    }

    [HttpGet]
    public async Task<IActionResult> GetTasks()
    {
        var tasks = await _daprClient.GetStateAsync<List<TaskItem>>(
            "statestore", "all-tasks");
        return Ok(tasks ?? new List<TaskItem>());
    }

    [HttpPost]
    public async Task<IActionResult> CreateTask([FromBody] TaskItem task)
    {
        task.Id = Guid.NewGuid().ToString();
        var existing = await _daprClient.GetStateAsync<List<TaskItem>>(
            "statestore", "all-tasks") ?? new List<TaskItem>();
        existing.Add(task);
        await _daprClient.SaveStateAsync("statestore", "all-tasks", existing);
        return Created($"/tasks/{task.Id}", task);
    }
}
```

## Setting Up the React Frontend

Create a React app and install the Dapr HTTP client helper:

```bash
npx create-react-app task-frontend --template typescript
cd task-frontend
npm install axios
```

Create an API service that calls Dapr via the sidecar HTTP port:

```typescript
// src/services/api.ts
import axios from 'axios';

const DAPR_HTTP_PORT = process.env.REACT_APP_DAPR_HTTP_PORT || '3500';
const TARGET_APP_ID = 'task-api';

const daprClient = axios.create({
  baseURL: `http://localhost:${DAPR_HTTP_PORT}/v1.0/invoke/${TARGET_APP_ID}/method`,
});

export const getTasks = async () => {
  const response = await daprClient.get('/tasks');
  return response.data;
};

export const createTask = async (task: { title: string; completed: boolean }) => {
  const response = await daprClient.post('/tasks', task);
  return response.data;
};
```

Use the API service in a React component:

```typescript
// src/components/TaskList.tsx
import React, { useEffect, useState } from 'react';
import { getTasks, createTask } from '../services/api';

export const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [title, setTitle] = useState('');

  useEffect(() => {
    getTasks().then(setTasks);
  }, []);

  const handleAdd = async () => {
    await createTask({ title, completed: false });
    setTasks(await getTasks());
    setTitle('');
  };

  return (
    <div>
      <input value={title} onChange={e => setTitle(e.target.value)} />
      <button onClick={handleAdd}>Add Task</button>
      {tasks.map(t => <p key={t.id}>{t.title}</p>)}
    </div>
  );
};
```

## Running with Docker Compose

```yaml
version: '3.8'
services:
  task-api:
    build: ./TaskApi
    ports:
      - "5000:80"
      - "3500:3500"
  task-api-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "-app-id", "task-api", "-app-port", "80", "-dapr-http-port", "3500"]
    depends_on:
      - task-api
    network_mode: "service:task-api"
  frontend:
    build: ./task-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_DAPR_HTTP_PORT=3500
```

## Summary

Using Dapr with React and .NET separates service discovery and communication concerns from application logic. The React frontend calls backend services through Dapr's HTTP API without needing service URLs, while the .NET backend uses the Dapr .NET SDK for state management and pub/sub, making both sides independently deployable and observable.
