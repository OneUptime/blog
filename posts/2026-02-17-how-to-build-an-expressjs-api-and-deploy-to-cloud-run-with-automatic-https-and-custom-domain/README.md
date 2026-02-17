# How to Build an Express.js API and Deploy It to Cloud Run with Automatic HTTPS and Custom Domain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Express.js, Cloud Run, Node.js, Custom Domain

Description: Build a production Express.js API and deploy it to Cloud Run with automatic HTTPS, custom domain mapping, and production-ready configuration.

---

Cloud Run is one of the easiest ways to deploy a Node.js API to production. You give it a container, and it handles scaling, HTTPS certificates, and load balancing. Adding a custom domain takes a few extra steps but gives your API a professional endpoint instead of the auto-generated Cloud Run URL. In this post, I will walk through building an Express.js API, containerizing it, deploying to Cloud Run, and setting up a custom domain with automatic HTTPS.

## Building the Express.js API

Start with a production-ready Express.js application.

```javascript
// src/app.js - Express.js application
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging - use JSON format in production for Cloud Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Trust proxy headers from Cloud Run's load balancer
app.set('trust proxy', true);

module.exports = app;
```

## Adding API Routes

Define your API endpoints in a modular structure.

```javascript
// src/routes/health.js - Health check routes
const router = require('express').Router();

// Basic health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// Readiness check - verify dependencies are available
router.get('/ready', async (req, res) => {
  try {
    // Check database connectivity, external services, etc.
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

module.exports = router;
```

```javascript
// src/routes/api.js - API routes
const router = require('express').Router();

// List items
router.get('/items', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    // In a real app, query your database
    const items = [
      { id: '1', name: 'Item One', status: 'active' },
      { id: '2', name: 'Item Two', status: 'active' },
    ];

    res.json({
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: items.length,
      },
    });
  } catch (error) {
    console.error('Failed to list items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single item
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch from database
    const item = { id, name: `Item ${id}`, status: 'active', createdAt: new Date().toISOString() };

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ data: item });
  } catch (error) {
    console.error(`Failed to get item ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create an item
router.post('/items', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Create in database
    const newItem = {
      id: Date.now().toString(),
      name,
      description: description || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ data: newItem });
  } catch (error) {
    console.error('Failed to create item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an item
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Update in database
    const updated = { id, ...updates, updatedAt: new Date().toISOString() };
    res.json({ data: updated });
  } catch (error) {
    console.error(`Failed to update item ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an item
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Delete from database
    res.status(204).send();
  } catch (error) {
    console.error(`Failed to delete item ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

## Wiring It Together

Connect the routes and start the server.

```javascript
// src/server.js - Server entry point
const app = require('./app');
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');

// Mount routes
app.use('/', healthRoutes);
app.use('/api/v1', apiRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Cloud Run sets the PORT environment variable
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

## The package.json

Configure your project with the necessary scripts and dependencies.

```json
{
  "name": "my-express-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## The Dockerfile

Create a production-optimized Dockerfile.

```dockerfile
# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:20-slim
WORKDIR /app

# Copy only production dependencies and source code
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Set production environment
ENV NODE_ENV=production

# Cloud Run sets PORT, default to 8080
ENV PORT=8080

# Run as non-root user for security
USER node

# Start the server
CMD ["node", "src/server.js"]
```

## Deploying to Cloud Run

Build and deploy the container.

```bash
# Build the container image
gcloud builds submit --tag gcr.io/my-project/my-express-api

# Deploy to Cloud Run
gcloud run deploy my-express-api \
    --image gcr.io/my-project/my-express-api \
    --region us-central1 \
    --platform managed \
    --set-env-vars "NODE_ENV=production,APP_VERSION=1.0.0" \
    --memory 256Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 20 \
    --concurrency 80 \
    --allow-unauthenticated
```

Cloud Run automatically provisions an HTTPS certificate for the default URL (something like `https://my-express-api-abc123.run.app`).

## Setting Up a Custom Domain

To use your own domain like `api.mycompany.com`, you need to map it in Cloud Run.

```bash
# Step 1: Verify domain ownership (if not already done)
gcloud domains verify mycompany.com

# Step 2: Map the custom domain to your Cloud Run service
gcloud run domain-mappings create \
    --service my-express-api \
    --domain api.mycompany.com \
    --region us-central1

# Step 3: Get the DNS records you need to configure
gcloud run domain-mappings describe \
    --domain api.mycompany.com \
    --region us-central1
```

The output will tell you which DNS records to add. Typically, you need to add a CNAME record.

```
# DNS Configuration (add these to your DNS provider)
# For a subdomain like api.mycompany.com:
api.mycompany.com.  CNAME  ghs.googlehosted.com.

# For a root domain like mycompany.com:
mycompany.com.  A     216.239.32.21
mycompany.com.  A     216.239.34.21
mycompany.com.  A     216.239.36.21
mycompany.com.  A     216.239.38.21
mycompany.com.  AAAA  2001:4860:4802:32::15
mycompany.com.  AAAA  2001:4860:4802:34::15
mycompany.com.  AAAA  2001:4860:4802:36::15
mycompany.com.  AAAA  2001:4860:4802:38::15
```

After configuring DNS, Cloud Run automatically provisions and manages an HTTPS certificate for your custom domain. This usually takes a few minutes but can take up to 24 hours for DNS propagation.

## Using Cloud Load Balancing for More Control

For advanced scenarios, use a Cloud Load Balancer instead of Cloud Run's built-in domain mapping. This gives you CDN caching, WAF rules, and multi-region routing.

```bash
# Create a serverless NEG (Network Endpoint Group) for Cloud Run
gcloud compute network-endpoint-groups create my-api-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-service=my-express-api

# Create a backend service
gcloud compute backend-services create my-api-backend \
    --global \
    --load-balancing-scheme=EXTERNAL_MANAGED

# Add the NEG to the backend service
gcloud compute backend-services add-backend my-api-backend \
    --global \
    --network-endpoint-group=my-api-neg \
    --network-endpoint-group-region=us-central1

# Create a URL map
gcloud compute url-maps create my-api-url-map \
    --default-service my-api-backend

# Create a managed SSL certificate
gcloud compute ssl-certificates create my-api-cert \
    --domains=api.mycompany.com

# Create the HTTPS proxy
gcloud compute target-https-proxies create my-api-https-proxy \
    --ssl-certificates=my-api-cert \
    --url-map=my-api-url-map

# Create the forwarding rule (assigns an IP address)
gcloud compute forwarding-rules create my-api-forwarding \
    --global \
    --target-https-proxy=my-api-https-proxy \
    --ports=443
```

## Setting Up CI/CD with Cloud Build

Automate deployments with a Cloud Build trigger.

```yaml
# cloudbuild.yaml - CI/CD pipeline
steps:
  # Run tests
  - name: 'node:20-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - 'npm ci && npm test'

  # Build the container
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-express-api:$COMMIT_SHA', '.']

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-express-api:$COMMIT_SHA']

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'my-express-api'
      - '--image=gcr.io/$PROJECT_ID/my-express-api:$COMMIT_SHA'
      - '--region=us-central1'
      - '--set-env-vars=APP_VERSION=$COMMIT_SHA'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/my-express-api:$COMMIT_SHA'
```

## Testing the Deployment

Verify everything is working.

```bash
# Test the Cloud Run default URL
SERVICE_URL=$(gcloud run services describe my-express-api \
    --region us-central1 --format 'value(status.url)')

# Health check
curl "$SERVICE_URL/health"

# API endpoints
curl "$SERVICE_URL/api/v1/items"
curl -X POST "$SERVICE_URL/api/v1/items" \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Item", "description": "Created via API"}'

# Test custom domain (after DNS propagation)
curl https://api.mycompany.com/health
```

## Monitoring Your API

Once your API is live with a custom domain, you need to monitor its availability and performance. OneUptime (https://oneuptime.com) can monitor your custom domain endpoint, track response times, SSL certificate expiry, and alert you when your API experiences downtime or degraded performance.

## Summary

Deploying an Express.js API to Cloud Run gives you a production-ready setup with minimal operational work. Cloud Run handles HTTPS certificates automatically for both its default URLs and custom domains. For basic setups, use Cloud Run domain mapping directly. For more advanced needs like CDN caching or WAF protection, put a Cloud Load Balancer in front of Cloud Run. The key things to remember are: set `trust proxy` in Express since you are behind a load balancer, use the PORT environment variable that Cloud Run sets, keep your containers stateless, and set appropriate concurrency limits based on your application's resource usage.
