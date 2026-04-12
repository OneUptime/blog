# How to Use MongoDB with Netlify Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Netlify, Serverless, Function, Mongoose

Description: Learn how to connect MongoDB from Netlify Functions using the connection caching pattern, environment variable setup, and deploying with the Netlify CLI.

---

Netlify Functions are AWS Lambda-backed serverless functions. Like Lambda, they reuse the Node.js process across warm invocations within the same instance, so caching the MongoDB connection in module scope avoids re-establishing the connection on every request.

## Project Structure

```text
my-app/
  netlify/
    functions/
      users.js
      products.js
  netlify.toml
  package.json
```

## Installing Dependencies

```bash
npm install mongoose
npm install netlify-cli --save-dev
```

## Connection Caching Utility

```javascript
// netlify/functions/lib/db.js
const mongoose = require('mongoose');

let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  cachedConnection = await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 3,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  return cachedConnection;
}

module.exports = connectDB;
```

## Netlify Function Handler

```javascript
// netlify/functions/users.js
const connectDB = require('./lib/db');
const User = require('./lib/models/User');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await connectDB();

    if (event.httpMethod === 'GET') {
      const users = await User.find().limit(50).lean();
      return { statusCode: 200, headers, body: JSON.stringify(users) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const user = await User.create(body);
      return { statusCode: 201, headers, body: JSON.stringify(user) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
```

## Using Background Functions for Long Tasks

Netlify Background Functions can run up to 15 minutes, ideal for bulk MongoDB operations:

```javascript
// netlify/functions/export-data-background.js
const connectDB = require('./lib/db');
const Order = require('./lib/models/Order');

exports.handler = async (event) => {
  await connectDB();

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await Order.find({ createdAt: { $gte: since } }).lean();

  // ... process and upload to S3
  console.log(`Exported ${orders.length} orders`);
  return { statusCode: 202 };
};
```

## netlify.toml Configuration

```toml
[build]
  functions = "netlify/functions"
  command = "npm run build"
  publish = "dist"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

## Setting Environment Variables

```bash
# Local development - create .env file
echo "MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mydb" > .env

# Production - use Netlify CLI
netlify env:set MONGODB_URI "mongodb+srv://user:pass@cluster.mongodb.net/mydb"
```

## Local Development

```bash
netlify dev
```

This starts the Netlify dev server and proxies function calls to `/.netlify/functions/`.

## Deploying

```bash
netlify deploy --prod
```

## Summary

Netlify Functions access MongoDB the same way as AWS Lambda - cache the Mongoose connection in module scope and check `readyState` before reconnecting. Keep `maxPoolSize` at 3 or lower to manage Atlas connection limits across concurrent function instances, use background functions for batch processing that exceeds the 60-second synchronous timeout, and set the MongoDB URI via the Netlify CLI or dashboard rather than committing it to source control.
