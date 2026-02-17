# How to Configure Prisma ORM with Cloud SQL PostgreSQL in a Node.js Cloud Run Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Prisma, Cloud SQL, PostgreSQL, Cloud Run, Node.js, Google Cloud

Description: Configure Prisma ORM to connect to Cloud SQL PostgreSQL from a Node.js Cloud Run service using Unix sockets and connection pooling.

---

Prisma is one of the most popular ORMs for Node.js, and Cloud SQL is Google's managed database service. Getting them to work together on Cloud Run involves a few specific configuration steps - particularly around how Cloud Run connects to Cloud SQL through Unix sockets rather than TCP connections. In this guide, I will walk through the full setup from Prisma schema configuration to Cloud Run deployment.

## How Cloud Run Connects to Cloud SQL

Cloud Run does not connect to Cloud SQL over the public internet. Instead, it uses the Cloud SQL Auth Proxy, which is built into the Cloud Run platform. When you configure a Cloud SQL connection on your Cloud Run service, GCP automatically mounts a Unix socket at `/cloudsql/INSTANCE_CONNECTION_NAME`. Your application connects to this socket instead of a TCP host and port.

This is more secure (no public IP needed) and faster (no TLS overhead) than connecting over the network.

## Setting Up Cloud SQL

First, create a Cloud SQL PostgreSQL instance if you do not have one.

```bash
# Create a Cloud SQL PostgreSQL instance
gcloud sql instances create my-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=your-root-password

# Create a database
gcloud sql databases create myapp --instance=my-postgres

# Create a user for your application
gcloud sql users create appuser \
  --instance=my-postgres \
  --password=your-app-password
```

Note the instance connection name - you will need it later.

```bash
# Get the instance connection name
gcloud sql instances describe my-postgres --format='value(connectionName)'
# Output: your-project:us-central1:my-postgres
```

## Initializing the Prisma Project

```bash
# Initialize a new project
mkdir prisma-cloudrun && cd prisma-cloudrun
npm init -y
npm install @prisma/client express
npm install -D prisma
npx prisma init
```

## Configuring the Prisma Schema

The schema needs to support both local development (TCP connection) and Cloud Run (Unix socket connection).

```prisma
// prisma/schema.prisma - Prisma schema for Cloud SQL PostgreSQL
generator client {
  provider      = "prisma-client-js"
  // Binary targets for local dev and Cloud Run (Debian-based container)
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String   @map("author_id")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([authorId])
  @@map("posts")
}
```

## Database URL Configuration

The `DATABASE_URL` format is different for local development and Cloud Run.

For local development with a direct TCP connection:

```bash
# .env (local development)
DATABASE_URL="postgresql://appuser:your-app-password@localhost:5432/myapp?schema=public"
```

For Cloud Run with a Unix socket connection:

```bash
# The format uses the socket path instead of host:port
DATABASE_URL="postgresql://appuser:your-app-password@localhost/myapp?host=/cloudsql/your-project:us-central1:my-postgres&schema=public"
```

The key difference is the `host=` query parameter pointing to the Unix socket path.

## Running Migrations

Run migrations locally first, then apply them to your Cloud SQL instance.

```bash
# Generate and run the initial migration locally
npx prisma migrate dev --name init

# To run migrations against Cloud SQL, use the Cloud SQL Auth Proxy
# Download and start the proxy
cloud-sql-proxy your-project:us-central1:my-postgres --port 5433

# In another terminal, run migrations through the proxy
DATABASE_URL="postgresql://appuser:your-app-password@localhost:5433/myapp" \
  npx prisma migrate deploy
```

## Building the Express Application

```javascript
// app.js - Express application with Prisma and Cloud SQL
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(express.json());

// Initialize Prisma client with connection pool settings
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info'] : ['error'],
  // Configure the connection pool
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Health check that verifies database connectivity
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// CRUD operations for users
app.post('/api/users', async (req, res) => {
  try {
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        name: req.body.name,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Create user failed:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/users', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: parseInt(limit),
      include: { posts: { where: { published: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  res.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    },
  });
});

app.get('/api/users/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { posts: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

// CRUD operations for posts
app.post('/api/posts', async (req, res) => {
  try {
    const post = await prisma.post.create({
      data: {
        title: req.body.title,
        content: req.body.content,
        authorId: req.body.authorId,
      },
      include: { author: true },
    });
    res.status(201).json(post);
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Author not found' });
    }
    console.error('Create post failed:', error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/posts', async (req, res) => {
  const { published } = req.query;

  const posts = await prisma.post.findMany({
    where: published !== undefined ? { published: published === 'true' } : {},
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(posts);
});
```

## Graceful Shutdown

Prisma manages a connection pool. Close it properly when the process shuts down.

```javascript
// Handle graceful shutdown for Cloud Run
async function shutdown() {
  console.log('Shutting down, closing database connections...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
# Generate Prisma client at build time
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY . .
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "app.js"]
```

The important step is running `npx prisma generate` during the Docker build so the Prisma client is ready when the container starts.

## Deploying to Cloud Run

```bash
# Build and deploy with Cloud SQL connection
gcloud run deploy prisma-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances your-project:us-central1:my-postgres \
  --set-env-vars "DATABASE_URL=postgresql://appuser:your-app-password@localhost/myapp?host=/cloudsql/your-project:us-central1:my-postgres&schema=public" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10
```

The `--add-cloudsql-instances` flag tells Cloud Run to mount the Cloud SQL socket, and the `DATABASE_URL` uses the socket path to connect.

## Running Migrations in Production

For production migrations, you have a few options. One approach is a Cloud Build step that runs migrations before deploying the new version.

```yaml
# cloudbuild.yaml - Run migrations before deploying
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/prisma-api', '.']

  # Run migrations using Cloud SQL Proxy
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'run'
      - '--network=cloudbuild'
      - 'gcr.io/$PROJECT_ID/prisma-api'
      - 'npx'
      - 'prisma'
      - 'migrate'
      - 'deploy'
    env:
      - 'DATABASE_URL=postgresql://appuser:$$DB_PASS@cloud-sql-proxy:5432/myapp'
    secretEnv: ['DB_PASS']

  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'prisma-api', '--image', 'gcr.io/$PROJECT_ID/prisma-api', '--region', 'us-central1']

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password/versions/latest
      env: 'DB_PASS'
```

Setting up Prisma with Cloud SQL on Cloud Run takes a bit of configuration, but once it is working you get the best of both worlds - Prisma's developer experience with type-safe queries and migrations, and Cloud SQL's managed PostgreSQL with automatic backups, high availability, and the security of private Unix socket connections.
