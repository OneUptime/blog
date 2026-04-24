# How to Build a Self-Service Developer Portal with Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Developer Portal, Self-Service, Automation

Description: Create a self-service developer portal that allows developers to deploy and manage their own container environments via the Portainer API.

## Introduction

A self-service developer portal empowers developers to spin up, manage, and tear down container environments without requiring DevOps intervention. Built on top of the Portainer API, such a portal can enforce resource quotas, apply security policies, and provide audit trails automatically.

## Architecture Overview

```text
Developers → Portal UI (React/Vue) → Backend API (Node.js) → Portainer API → Docker Standalone
                                        ↓
                                    Auth (Keycloak/Auth0)
                                        ↓
                                    Database (Usage tracking)
```

## Prerequisites

- Portainer CE or BE (BE if you need team and RBAC features)
- Node.js 18+
- A database (PostgreSQL or SQLite for local)

## Backend Service

```javascript
// server.js - Express backend for the developer portal
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const toSlug = (value) => value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const getStackPrefix = (username) => `dev-${toSlug(username)}-`;

// Portainer client
const portainer = axios.create({
    baseURL: `${process.env.PORTAINER_URL}/api`,
    headers: { 'X-API-Key': process.env.PORTAINER_ADMIN_API_KEY }
});

// Environment templates available to developers
const ENVIRONMENT_TEMPLATES = {
    'node-app': {
        name: 'Node.js Application',
        compose: `
version: '3.8'
services:
  app:
    image: node:18-alpine
    working_dir: /app
    command: ["tail", "-f", "/dev/null"]
    volumes:
      - app-code:/app
    ports:
      - "{PORT}:3000"
volumes:
  app-code:
`
    },
    'postgres-dev': {
        name: 'PostgreSQL Dev Database',
        compose: `
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: "{DB_PASSWORD}"
      POSTGRES_DB: devdb
    ports:
      - "{PORT}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
`
    },
    'fullstack': {
        name: 'Full Stack Development',
        compose: `
version: '3.8'
services:
  frontend:
    image: node:18-alpine
    ports:
      - "{FRONTEND_PORT}:3000"
    command: ["tail", "-f", "/dev/null"]
  backend:
    image: node:18-alpine
    ports:
      - "{BACKEND_PORT}:8080"
    command: ["tail", "-f", "/dev/null"]
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: "{DB_PASSWORD}"
`
    }
};

// Middleware: Authenticate developer
const authenticateDeveloper = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/templates - List available environment templates
app.get('/api/templates', authenticateDeveloper, (req, res) => {
    const templates = Object.entries(ENVIRONMENT_TEMPLATES).map(([id, tmpl]) => ({
        id,
        name: tmpl.name
    }));
    res.json(templates);
});

// GET /api/environments - List developer's environments
app.get('/api/environments', authenticateDeveloper, async (req, res) => {
    try {
        const stackPrefix = getStackPrefix(req.user.username);
        const stacks = await portainer.get('/stacks', {
            params: {
                filters: JSON.stringify({ EndpointID: process.env.DEV_ENDPOINT_ID })
            }
        });
        // Filter stacks belonging to this developer
        const myStacks = stacks.data.filter(s =>
            s.Name.startsWith(stackPrefix)
        );
        res.json(myStacks.map(s => ({
            id: s.Id,
            name: s.Name.replace(stackPrefix, ''),
            status: s.Status === 1 ? 'active' : 'inactive',
            created: s.CreationDate
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/environments - Create a new environment
app.post('/api/environments', authenticateDeveloper, async (req, res) => {
    const { templateId, envName } = req.body;
    const username = req.user.username;
    const envSlug = toSlug(envName || '');

    // Validate
    if (!ENVIRONMENT_TEMPLATES[templateId]) {
        return res.status(400).json({ error: 'Invalid template' });
    }
    if (!envSlug) {
        return res.status(400).json({ error: 'Environment name must contain letters, numbers, or hyphens' });
    }

    const stackName = `${getStackPrefix(username)}${envSlug}`;

    try {
        // Generate environment-specific config
        const port = 10000 + Math.floor(Math.random() * 5000);
        const dbPassword = crypto.randomBytes(18).toString('base64url');

        let composeContent = ENVIRONMENT_TEMPLATES[templateId].compose
            .replace(/{PORT}/g, port)
            .replace(/{FRONTEND_PORT}/g, port)
            .replace(/{BACKEND_PORT}/g, port + 1)
            .replace(/{DB_PASSWORD}/g, dbPassword);

        // Deploy via Portainer API
        const result = await portainer.post(
            '/stacks/create/standalone/string',
            {
                Name: stackName,
                StackFileContent: composeContent,
                Env: [
                    { name: 'DEVELOPER', value: username },
                    { name: 'ENV_NAME', value: envSlug }
                ]
            },
            {
                params: {
                    endpointId: process.env.DEV_ENDPOINT_ID
                }
            }
        );

        res.json({
            id: result.data.Id,
            name: envSlug,
            stackName,
            port,
            message: 'Environment created successfully'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/environments/:name - Destroy an environment
app.delete('/api/environments/:name', authenticateDeveloper, async (req, res) => {
    const stackName = `${getStackPrefix(req.user.username)}${toSlug(req.params.name)}`;

    try {
        // Find the stack
        const stacks = await portainer.get('/stacks', {
            params: {
                filters: JSON.stringify({ EndpointID: process.env.DEV_ENDPOINT_ID })
            }
        });
        const stack = stacks.data.find(s => s.Name === stackName);

        if (!stack) {
            return res.status(404).json({ error: 'Environment not found' });
        }

        // Delete the stack
        await portainer.delete(`/stacks/${stack.Id}`, {
            params: {
                endpointId: process.env.DEV_ENDPOINT_ID
            }
        });

        res.json({ message: `Environment '${toSlug(req.params.name)}' destroyed` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3001, () => console.log('Developer portal backend running on port 3001'));
```

## Simple Frontend (HTML)

```html
<!-- portal.html - Simple developer portal frontend -->
<!DOCTYPE html>
<html>
<head>
    <title>Dev Environment Portal</title>
    <style>
        body { font-family: system-ui; max-width: 900px; margin: 40px auto; padding: 0 20px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin: 12px 0; }
        button { background: #0066cc; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
        button.danger { background: #cc0000; }
        select, input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 4px; }
    </style>
</head>
<body>
    <h1>Developer Environment Portal</h1>
    <div id="create-env">
        <h2>Create New Environment</h2>
        <select id="template">
            <option value="node-app">Node.js App</option>
            <option value="postgres-dev">PostgreSQL Database</option>
            <option value="fullstack">Full Stack</option>
        </select>
        <input id="env-name" placeholder="Environment name (e.g., feature-auth)" />
        <button onclick="createEnvironment()">Create</button>
    </div>
    <div id="environments"><h2>My Environments</h2></div>
    <script>
        const API = 'http://localhost:3001/api';
        const TOKEN = localStorage.getItem('token');

        async function loadEnvironments() {
            const resp = await fetch(`${API}/environments`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            const envs = await resp.json();
            const container = document.getElementById('environments');
            container.innerHTML = '<h2>My Environments</h2>' + envs.map(env => `
                <div class="card">
                    <strong>${env.name}</strong> - ${env.status}
                    <button class="danger" onclick="destroyEnv('${env.name}')">Destroy</button>
                </div>
            `).join('');
        }

        async function createEnvironment() {
            const template = document.getElementById('template').value;
            const name = document.getElementById('env-name').value.trim();
            await fetch(`${API}/environments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId: template, envName: name })
            });
            loadEnvironments();
        }

        async function destroyEnv(name) {
            if (!confirm(`Destroy environment '${name}'?`)) return;
            await fetch(`${API}/environments/${encodeURIComponent(name)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            loadEnvironments();
        }

        loadEnvironments();
    </script>
</body>
</html>
```

## Conclusion

A self-service developer portal built on the Portainer API democratizes container environment management. Developers get on-demand environments without DevOps bottlenecks, while platform teams maintain control through templates, quotas, and audit logs. This pattern reduces lead time for development environments from days to seconds.
