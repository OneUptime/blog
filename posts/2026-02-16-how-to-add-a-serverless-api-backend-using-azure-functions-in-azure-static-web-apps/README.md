# How to Add a Serverless API Backend Using Azure Functions in Azure Static Web Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Static Web Apps, Azure Functions, Serverless, API, Backend, JavaScript

Description: Learn how to add a serverless API backend to your Azure Static Web App using Azure Functions for dynamic features without managing servers.

---

Static web apps are great until you need to do something dynamic - talk to a database, process a form submission, call a third-party API with secret keys, or run business logic that should not live in the browser. Azure Static Web Apps solves this by letting you bundle Azure Functions directly into your project. The functions deploy alongside your frontend, share the same domain (no CORS headaches), and scale automatically.

This guide covers adding an API backend to your Static Web App, from creating your first function to handling authentication and connecting to external services.

## How the Integration Works

When you create a Static Web App with an API, the project structure looks like this:

```
my-project/
  api/                    # Azure Functions backend
    package.json
    host.json
    get-items/
      index.js
      function.json
  src/                    # Frontend source
    index.html
    app.js
  package.json
  staticwebapp.config.json
```

The `api` directory contains your Azure Functions. During deployment, Azure Static Web Apps automatically detects this directory, builds the functions, and makes them available at `/api/*` on the same domain as your frontend. No need to configure API URLs or deal with cross-origin requests.

```mermaid
graph TD
    A[Browser] -->|/index.html| B[Static Content CDN]
    A -->|/api/get-items| C[Azure Functions Backend]
    B --> D[Global Edge Locations]
    C --> E[Managed Functions Runtime]
    E --> F[Databases / External APIs]
```

## Prerequisites

- A deployed Azure Static Web App connected to a GitHub repository.
- Node.js 18 or later installed locally.
- The Azure Functions Core Tools installed (`npm install -g azure-functions-core-tools@4`).
- The Azure Static Web Apps CLI for local development (`npm install -g @azure/static-web-apps-cli`).

## Step 1: Create the API Directory

In your project root, create the `api` directory and initialize it.

```bash
# Create the api directory and initialize a Node.js project
mkdir api
cd api
npm init -y
```

Next, create the `host.json` file that configures the Functions runtime.

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  }
}
```

The `extensionBundle` allows you to use bindings (like HTTP triggers, timer triggers, and database bindings) without installing extension packages manually.

## Step 2: Create Your First Function

Create a simple function that returns a list of items. Functions in Static Web Apps follow a directory-per-function structure.

```bash
# Create the function directory
mkdir -p api/get-items
```

Create the function configuration file.

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"],
      "route": "items"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

Save this as `api/get-items/function.json`. The `route` property sets the URL path. With `route: "items"`, the function responds at `/api/items`.

Now create the function implementation.

```javascript
// api/get-items/index.js
// Returns a list of items - in production, this would query a database
module.exports = async function (context, req) {
  // Simulate fetching data from a data source
  const items = [
    { id: 1, name: 'Widget A', price: 29.99, inStock: true },
    { id: 2, name: 'Widget B', price: 49.99, inStock: true },
    { id: 3, name: 'Widget C', price: 19.99, inStock: false },
    { id: 4, name: 'Widget D', price: 99.99, inStock: true }
  ];

  // Support optional filtering by stock status
  const inStockOnly = req.query.inStock === 'true';
  const filteredItems = inStockOnly
    ? items.filter(item => item.inStock)
    : items;

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: filteredItems
  };
};
```

## Step 3: Create a POST Function

Most apps need to accept data too. Here is a function that handles form submissions.

```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "contact"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

Save this as `api/submit-contact/function.json`.

```javascript
// api/submit-contact/index.js
// Handles contact form submissions with basic validation
module.exports = async function (context, req) {
  const { name, email, message } = req.body || {};

  // Validate required fields
  if (!name || !email || !message) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: 'Missing required fields: name, email, and message are all required.'
      }
    };
    return;
  }

  // Validate email format with a basic regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: { error: 'Invalid email format.' }
    };
    return;
  }

  // In production, you would save this to a database or send an email
  context.log('Contact form submission:', { name, email, message });

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { success: true, message: 'Thank you for your message!' }
  };
};
```

## Step 4: Call the API from Your Frontend

On the frontend side, calling the API is simple because everything is on the same domain.

```javascript
// Fetch items from the serverless API backend
async function loadItems() {
  try {
    const response = await fetch('/api/items');

    if (!response.ok) {
      throw new Error('API request failed with status ' + response.status);
    }

    const items = await response.json();

    // Render items in the DOM
    const container = document.getElementById('items-list');
    container.innerHTML = items
      .map(item => `
        <div class="item">
          <h3>${item.name}</h3>
          <p>$${item.price}</p>
          <span>${item.inStock ? 'In Stock' : 'Out of Stock'}</span>
        </div>
      `)
      .join('');
  } catch (error) {
    console.error('Failed to load items:', error);
  }
}

// Submit the contact form to the API
async function submitContact(event) {
  event.preventDefault();

  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    message: document.getElementById('message').value
  };

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message);
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error('Submission failed:', error);
  }
}
```

Notice that the fetch URLs start with `/api/` - no full URLs, no CORS configuration, no environment-specific API endpoints. This works in both local development and production.

## Step 5: Local Development

The Static Web Apps CLI lets you run both the frontend and API locally with the same routing behavior you get in production.

```bash
# Start the local development server with both frontend and API
swa start src --api-location api
```

This starts the frontend dev server and the Functions runtime, and proxies everything through a single port (typically 4280). API requests to `/api/*` route to the Functions runtime automatically.

If you are using a framework with its own dev server (like React or Vue), start that first and point the SWA CLI at it.

```bash
# Start React dev server first, then proxy through SWA CLI
npm start &
swa start http://localhost:3000 --api-location api
```

## Step 6: Access User Authentication in Functions

If your Static Web App uses authentication, the user's identity is automatically passed to your API functions through the `x-ms-client-principal` header.

```javascript
// api/get-profile/index.js
// Returns the authenticated user's profile information
module.exports = async function (context, req) {
  const header = req.headers['x-ms-client-principal'];

  if (!header) {
    context.res = {
      status: 401,
      body: { error: 'Not authenticated' }
    };
    return;
  }

  // Decode the base64-encoded client principal
  const encoded = Buffer.from(header, 'base64');
  const principal = JSON.parse(encoded.toString('utf8'));

  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: {
      userId: principal.userId,
      provider: principal.identityProvider,
      name: principal.userDetails,
      roles: principal.userRoles
    }
  };
};
```

You can also protect API routes using the `staticwebapp.config.json` file.

```json
{
  "routes": [
    {
      "route": "/api/public/*",
      "allowedRoles": ["anonymous"]
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

Route rules are evaluated in order, so the more specific `/api/public/*` rule is checked before the catch-all `/api/*` rule.

## Step 7: Use Environment Variables

Serverless functions often need API keys, connection strings, or other secrets. Add these as application settings in the Azure portal.

```bash
# Add application settings for your API functions
az staticwebapp appsettings set \
  --name my-static-app \
  --resource-group myResourceGroup \
  --setting-names "DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/mydb"
```

Access them in your functions with `process.env`.

```javascript
// api/get-data/index.js
// Connects to a database using an environment variable for the connection string
const { MongoClient } = require('mongodb');

module.exports = async function (context, req) {
  // Read the connection string from application settings
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    context.res = {
      status: 500,
      body: { error: 'Database connection not configured' }
    };
    return;
  }

  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    const db = client.db('mydb');
    const items = await db.collection('items').find({}).toArray();

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: items
    };
  } catch (error) {
    context.log.error('Database query failed:', error);
    context.res = {
      status: 500,
      body: { error: 'Internal server error' }
    };
  } finally {
    await client.close();
  }
};
```

For local development, create a `api/local.settings.json` file (this file should be in your `.gitignore`).

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "DATABASE_URL": "mongodb://localhost:27017/mydb"
  }
}
```

## Limitations to Keep in Mind

The managed Functions backend in Static Web Apps has a few constraints compared to standalone Azure Functions:

- Only HTTP-triggered functions are supported. No timer triggers, queue triggers, or event-driven functions.
- The API runs on a consumption plan with a 45-second timeout.
- You get a limited set of bindings compared to full Azure Functions.
- For more advanced needs, you can link a standalone Azure Functions app instead of using the managed API.

## Wrapping Up

Adding a serverless API to Azure Static Web Apps gives you the best of both worlds - a fast, globally distributed frontend with a dynamic backend that scales to zero when idle. The same-domain routing eliminates CORS complexity, the built-in auth integration saves you from token juggling, and the local development experience with the SWA CLI mirrors production behavior closely. For most web applications, this combination of static hosting and serverless functions is all you need.
