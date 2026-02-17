# How to Use Firebase Hosting Rewrites to Route Traffic to Cloud Run Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Firebase, GCP, Cloud Run, Hosting, Routing

Description: Learn how to configure Firebase Hosting rewrites to route specific URL patterns to Cloud Run services for a seamless frontend-backend integration on GCP.

---

Firebase Hosting is great for serving static files, but most real applications need a backend too. Cloud Run is a natural companion - it runs containerized services that scale to zero when idle and scale up automatically under load. By using Firebase Hosting rewrites, you can serve your static frontend and your Cloud Run API from the same domain, avoiding CORS issues and simplifying your architecture.

## Why Use Rewrites Instead of Separate Domains

The alternative to rewrites is hosting your API on a separate domain or subdomain (like `api.yourdomain.com`). This works, but introduces several problems:

- CORS headers are needed for every cross-origin request
- Cookie sharing between frontend and API requires careful domain configuration
- Users see separate domains in their browser DevTools, which can be confusing
- SSL certificates need to be managed separately
- Two DNS configurations to maintain

With rewrites, everything lives under one domain. The request to `/api/users` goes through Firebase Hosting, which proxies it to your Cloud Run service transparently.

## Setting Up the Cloud Run Service

First, you need a Cloud Run service to route to. Here is a simple Express API as an example.

This Dockerfile creates a minimal Node.js API container:

```dockerfile
# Dockerfile
FROM node:20-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Cloud Run provides the PORT environment variable
EXPOSE 8080
CMD ["node", "server.js"]
```

The Express server that handles API requests:

```javascript
// server.js - Express API for Cloud Run
const express = require("express");
const app = express();

app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Example API endpoints
app.get("/api/users", async (req, res) => {
  // Fetch users from Firestore or another data source
  const users = await getUsers();
  res.json({ users });
});

app.get("/api/users/:id", async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({ user });
});

app.post("/api/users", async (req, res) => {
  const newUser = await createUser(req.body);
  res.status(201).json({ user: newUser });
});

// Cloud Run sets PORT environment variable
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
```

Build and deploy the service to Cloud Run:

```bash
# Build the container image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/api

# Deploy to Cloud Run
gcloud run deploy api \
  --image gcr.io/YOUR_PROJECT_ID/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --project YOUR_PROJECT_ID
```

## Configuring the Firebase Hosting Rewrite

The key configuration happens in `firebase.json`. Add a rewrite rule that matches your API path pattern and points to the Cloud Run service.

This configuration routes all `/api/**` requests to your Cloud Run service:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "api",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

The order of rewrites matters. Firebase Hosting evaluates them top to bottom. The `/api/**` rule catches API requests first, and the catch-all `**` rule handles everything else as a single-page app.

## Deploying the Configuration

Deploy the hosting configuration:

```bash
# Deploy just the hosting configuration
firebase deploy --only hosting --project YOUR_PROJECT_ID
```

Now requests to `https://yourdomain.web.app/api/users` will be proxied to your Cloud Run service, while requests to `https://yourdomain.web.app/anything-else` serve your static frontend.

## Handling Multiple Cloud Run Services

You can route different paths to different Cloud Run services. This is useful for a microservices architecture.

This configuration splits traffic across three Cloud Run services:

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "/api/users/**",
        "run": {
          "serviceId": "users-service",
          "region": "us-central1"
        }
      },
      {
        "source": "/api/orders/**",
        "run": {
          "serviceId": "orders-service",
          "region": "us-central1"
        }
      },
      {
        "source": "/api/notifications/**",
        "run": {
          "serviceId": "notifications-service",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Combining Rewrites with Cloud Functions

You can mix Cloud Run and Cloud Functions rewrites in the same configuration. Use Cloud Functions for lightweight operations and Cloud Run for heavier services.

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "api",
          "region": "us-central1"
        }
      },
      {
        "source": "/webhooks/**",
        "function": "webhookHandler"
      },
      {
        "source": "/ssr/**",
        "run": {
          "serviceId": "ssr-renderer",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Adding Cache Headers for API Responses

Cloud Run responses can be cached by the Firebase Hosting CDN if you set the right headers. For read-heavy endpoints, this can significantly reduce the load on your Cloud Run service.

Set cache headers in your Cloud Run service code:

```javascript
// In your Express API
app.get("/api/products", async (req, res) => {
  // Cache product listings at the CDN for 5 minutes
  res.set("Cache-Control", "public, max-age=60, s-maxage=300");

  const products = await getProducts();
  res.json({ products });
});

app.get("/api/products/:id", async (req, res) => {
  // Cache individual products for 1 minute at the CDN
  res.set("Cache-Control", "public, max-age=30, s-maxage=60");

  const product = await getProduct(req.params.id);
  res.json({ product });
});

// Never cache authenticated endpoints
app.get("/api/me", authenticateUser, async (req, res) => {
  res.set("Cache-Control", "private, no-store");

  const profile = await getUserProfile(req.user.uid);
  res.json({ profile });
});
```

## Handling Authentication

When Firebase Hosting proxies to Cloud Run, it passes through cookies and headers. If your frontend uses Firebase Auth, you can verify the ID token in your Cloud Run service.

This middleware verifies Firebase Auth tokens in your Cloud Run service:

```javascript
// middleware/auth.js - Firebase Auth verification for Cloud Run
const admin = require("firebase-admin");
admin.initializeApp();

async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No auth token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

module.exports = { authenticateUser };
```

On the client side, include the token in your API requests:

```javascript
// client/api.js - Include auth token in API requests
import { getAuth } from "firebase/auth";

async function apiRequest(path, options = {}) {
  const auth = getAuth();
  const user = auth.currentUser;

  const headers = { ...options.headers };

  // Add auth token if the user is logged in
  if (user) {
    const token = await user.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
```

## Custom Domains and SSL

Firebase Hosting provides free SSL for your custom domain. When you add a custom domain to Firebase Hosting, the SSL certificate covers all traffic, including the proxied Cloud Run requests.

```bash
# Add a custom domain
firebase hosting:channel:deploy production --project YOUR_PROJECT_ID

# Or configure in firebase.json
```

This means your Cloud Run service does not need its own public URL or SSL certificate when accessed through Firebase Hosting. It can even be configured to only accept internal traffic if you want to lock it down.

## Monitoring the Setup

After deploying, verify everything works:

```bash
# Test the static hosting
curl -I https://your-domain.web.app/

# Test the Cloud Run rewrite
curl https://your-domain.web.app/api/health

# Test with authentication
TOKEN=$(firebase auth:export --format=json | jq -r '.[0].localId')
curl -H "Authorization: Bearer $TOKEN" https://your-domain.web.app/api/me
```

Check the Firebase Hosting logs and Cloud Run logs separately to trace any issues:

```bash
# Cloud Run logs
gcloud run services logs read api --region us-central1 --limit 20
```

## Summary

Firebase Hosting rewrites give you a clean way to serve both static content and dynamic API responses from a single domain. Set up your Cloud Run service, add a rewrite rule in firebase.json, and deploy. The CDN handles caching for both static and dynamic content, authentication tokens pass through transparently, and you avoid all the CORS headaches of a multi-domain setup. For microservices architectures, different path patterns can route to different services, giving you the flexibility of independent deployments with the simplicity of a single frontend domain.
