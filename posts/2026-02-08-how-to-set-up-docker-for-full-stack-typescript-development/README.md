# How to Set Up Docker for Full-Stack TypeScript Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, TypeScript, Full-Stack Development, DevOps, Node.js, React, Docker Compose

Description: Complete guide to setting up a full-stack TypeScript development environment with Docker, covering React frontend, Express backend, and PostgreSQL database.

---

Full-stack TypeScript means writing both your frontend and backend in the same language, with shared types and validation logic. Docker makes this practical by giving every developer the same database, cache, and runtime versions without manual setup. This guide builds a complete full-stack TypeScript environment with React on the frontend, Express on the backend, PostgreSQL for storage, and Redis for caching, all orchestrated with Docker Compose.

## Prerequisites

Docker and Docker Compose must be installed. Basic TypeScript and React knowledge is assumed. We will build the entire project from scratch.

## Project Structure

Here is the layout for our monorepo:

```
fullstack-ts/
  frontend/         # React + TypeScript
  backend/          # Express + TypeScript
  shared/           # Shared types and validation
  docker-compose.yml
  docker-compose.dev.yml
  .env.example
```

Create the directory structure:

```bash
mkdir -p fullstack-ts/{frontend,backend,shared}/src
cd fullstack-ts
```

## Shared Types Package

The power of full-stack TypeScript is type sharing. Create the shared package first.

```typescript
// shared/src/types.ts - types shared between frontend and backend
export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

export interface HealthCheck {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  services: {
    database: boolean;
    cache: boolean;
  };
}
```

```json
// shared/package.json
{
  "name": "@app/shared",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

```json
// shared/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src/**/*"]
}
```

## Backend Setup

Create the Express backend:

```json
// backend/package.json
{
  "name": "@app/backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "tsx src/migrate.ts"
  },
  "dependencies": {
    "@app/shared": "file:../shared",
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "redis": "^4.6.12",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/pg": "^8.10.9",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0"
  }
}
```

```typescript
// backend/src/index.ts - Express server with typed routes
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { createClient } from 'redis';
import type { User, ApiResponse, HealthCheck, CreateUserRequest } from '@app/shared';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Redis connection
const redis = createClient({
  url: process.env.REDIS_URL,
});
redis.connect().catch(console.error);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  let dbHealthy = false;
  let cacheHealthy = false;

  try {
    await pool.query('SELECT 1');
    dbHealthy = true;
  } catch (e) {
    console.error('Database health check failed:', e);
  }

  try {
    await redis.ping();
    cacheHealthy = true;
  } catch (e) {
    console.error('Cache health check failed:', e);
  }

  const health: HealthCheck = {
    status: dbHealthy && cacheHealthy ? 'ok' : 'degraded',
    version: process.env.APP_VERSION || '1.0.0',
    uptime: process.uptime(),
    services: {
      database: dbHealthy,
      cache: cacheHealthy,
    },
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    // Check cache first
    const cached = await redis.get('users:all');
    if (cached) {
      const response: ApiResponse<User[]> = {
        data: JSON.parse(cached),
        message: 'Users retrieved from cache',
        success: true,
      };
      return res.json(response);
    }

    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    const users: User[] = result.rows;

    // Cache for 60 seconds
    await redis.setEx('users:all', 60, JSON.stringify(users));

    const response: ApiResponse<User[]> = {
      data: users,
      message: 'Users retrieved',
      success: true,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ data: null, message: 'Internal error', success: false });
  }
});

// Create a user
app.post('/api/users', async (req, res) => {
  const { email, name, password } = req.body as CreateUserRequest;

  try {
    const result = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, name, password] // In production, hash the password
    );

    // Invalidate cache
    await redis.del('users:all');

    const response: ApiResponse<User> = {
      data: result.rows[0],
      message: 'User created',
      success: true,
    };
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ data: null, message: 'Failed to create user', success: false });
  }
});

const port = parseInt(process.env.PORT || '3001');
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend running on port ${port}`);
});
```

Backend Dockerfile:

```dockerfile
# backend/Dockerfile - production build for Express backend
FROM node:21-alpine AS builder

WORKDIR /app

# Copy shared package
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Copy backend package and install dependencies
COPY backend/package.json backend/tsconfig.json ./backend/
RUN cd backend && npm install

# Copy backend source and build
COPY backend/src ./backend/src
RUN cd backend && npm run build

# Stage 2: Production runtime
FROM node:21-alpine

WORKDIR /app

# Copy built shared package
COPY --from=builder /app/shared ./shared

# Copy backend production files
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules

WORKDIR /app/backend

RUN adduser -D appuser
USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/index.js"]
```

## Frontend Setup

Create the React frontend:

```json
// frontend/package.json (key parts)
{
  "name": "@app/frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@app/shared": "file:../shared",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.0",
    "vite": "^5.0.8"
  }
}
```

Frontend Dockerfile:

```dockerfile
# frontend/Dockerfile - multi-stage build for React frontend
FROM node:21-alpine AS builder

WORKDIR /app

# Build shared package
COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

# Install frontend dependencies
COPY frontend/package.json ./frontend/
RUN cd frontend && npm install

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Custom nginx config for SPA routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Nginx configuration for the SPA:

```nginx
# frontend/nginx.conf - SPA routing configuration
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|svg|ico|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Docker Compose for Development

This is where everything comes together:

```yaml
# docker-compose.dev.yml - full development environment
version: "3.8"

services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/frontend/src
      - ./shared/src:/app/shared/src
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.dev
    ports:
      - "3001:3001"
    volumes:
      - ./backend/src:/app/backend/src
      - ./shared/src:/app/shared/src
    environment:
      - PORT=3001
      - DATABASE_URL=postgres://app:devpass@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

Development Dockerfiles use volume mounts for hot reloading:

```dockerfile
# backend/Dockerfile.dev
FROM node:21-alpine

WORKDIR /app

COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

COPY backend/package.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

WORKDIR /app/backend

# tsx watch enables auto-restart on file changes
CMD ["npx", "tsx", "watch", "src/index.ts"]
```

```dockerfile
# frontend/Dockerfile.dev
FROM node:21-alpine

WORKDIR /app

COPY shared/package.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN cd shared && npm install && npm run build

COPY frontend/package.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/

WORKDIR /app/frontend

EXPOSE 3000
CMD ["npx", "vite", "--host", "0.0.0.0"]
```

## Production Docker Compose

```yaml
# docker-compose.yml - production configuration
version: "3.8"

services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      - PORT=3001
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## Database Migration Script

```typescript
// backend/src/migrate.ts - database migration script
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    console.log('Migration complete');
  } finally {
    client.release();
  }
  await pool.end();
}

migrate().catch(console.error);
```

Run migrations:

```bash
# Run database migrations
docker compose -f docker-compose.dev.yml exec backend npx tsx src/migrate.ts
```

## Starting the Development Environment

```bash
# Start all services
docker compose -f docker-compose.dev.yml up --build

# Or start in detached mode
docker compose -f docker-compose.dev.yml up -d --build

# View logs for a specific service
docker compose -f docker-compose.dev.yml logs -f backend

# Run migrations
docker compose -f docker-compose.dev.yml exec backend npx tsx src/migrate.ts
```

## The .dockerignore File

```text
# .dockerignore - at project root
**/node_modules/
**/dist/
**/.git/
**/.env
**/README.md
**/Dockerfile*
**/docker-compose*
```

## Monitoring the Full Stack

With multiple services running, monitoring becomes essential. [OneUptime](https://oneuptime.com) can monitor each service independently: the frontend's availability, the backend's API health endpoint, database connectivity, and cache status. The `/api/health` endpoint we built reports the status of all dependent services, giving you a single place to check overall system health.

## Summary

Docker Compose transforms full-stack TypeScript development by giving every team member an identical environment. Shared types between frontend and backend eliminate an entire class of bugs. The development configuration uses volume mounts for hot reloading, while production builds use multi-stage Dockerfiles to create optimized images. PostgreSQL and Redis are always available without local installation. This setup scales from solo development to team collaboration, and the same Docker Compose patterns translate directly to production deployments.
