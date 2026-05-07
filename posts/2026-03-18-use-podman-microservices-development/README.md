# How to Use Podman for Microservices Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Microservice, Docker Compose, Networking, Development

Description: A practical guide to developing microservices locally with Podman, covering inter-service communication, shared networking, service discovery, and orchestration with podman-compose.

---

> Podman's pod-based architecture maps naturally to microservices, letting you group related services together and test inter-service communication locally before deploying to Kubernetes.

Microservices architectures split applications into small, independent services that communicate over the network. Developing and testing these services locally requires running multiple processes simultaneously and making them discoverable to each other. Podman handles this with container networking, pods, and compose files. This post covers practical patterns for developing microservices with Podman, including networking between services, shared infrastructure, and orchestration.

---

## Architecture Example

We will build a simple e-commerce system with these microservices:

1. **API Gateway** - Routes requests to the appropriate service (Node.js)
2. **User Service** - Manages user accounts (Python/FastAPI)
3. **Product Service** - Manages product catalog (Node.js/Express)
4. **Order Service** - Handles orders (Node.js/Express)
5. **PostgreSQL** - Shared database
6. **Redis** - Caching and session storage

## Setting Up the Network

Create a Podman network so containers can communicate by name:

```bash
# Create a custom network for the microservices

podman network create microservices-net

# Verify the network was created
podman network ls
podman network inspect microservices-net
```

Containers on the same network can reach each other using their container names as hostnames.

## Infrastructure Services

Start the shared infrastructure services first:

```bash
# Start PostgreSQL
podman run -d \
  --name postgres \
  --network microservices-net \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=adminpass \
  -p 5432:5432 \
  -v ms-pgdata:/var/lib/postgresql/data:Z \
  postgres:16

# Wait until PostgreSQL accepts connections
until podman exec postgres pg_isready -U admin; do sleep 1; done

# Create databases for each service
podman exec postgres psql -U admin -c "CREATE DATABASE users_db;"
podman exec postgres psql -U admin -c "CREATE DATABASE products_db;"
podman exec postgres psql -U admin -c "CREATE DATABASE orders_db;"

# Start Redis
podman run -d \
  --name redis \
  --network microservices-net \
  -p 6379:6379 \
  redis:7-alpine
```

## User Service (Python/FastAPI)

```python
# user-service/main.py
from contextlib import asynccontextmanager
import os
import time

import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Connect to PostgreSQL using the container name as hostname
DB_HOST = os.getenv("DB_HOST", "postgres")
DB_CONFIG = {
    "host": DB_HOST,
    "port": 5432,
    "user": "admin",
    "password": "adminpass",
    "database": "users_db"
}

def get_db():
    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = True
    return conn

def wait_for_db(max_retries=30, delay=2):
    last_error = None
    for _ in range(max_retries):
        try:
            return get_db()
        except psycopg2.OperationalError as exc:
            last_error = exc
            time.sleep(delay)
    raise last_error

@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = wait_for_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.close()
    yield

app = FastAPI(title="User Service", version="1.0.0", lifespan=lifespan)

class UserCreate(BaseModel):
    email: str
    name: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str

@app.post("/users", response_model=UserResponse, status_code=201)
def create_user(user: UserCreate):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute(
            "INSERT INTO users (email, name) VALUES (%s, %s) RETURNING *",
            (user.email, user.name)
        )
        return cur.fetchone()
    except psycopg2.IntegrityError:
        raise HTTPException(status_code=409, detail="Email already exists")
    finally:
        conn.close()

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users", response_model=list[UserResponse])
def list_users():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM users ORDER BY created_at DESC")
    users = cur.fetchall()
    conn.close()
    return users

@app.get("/health")
def health():
    try:
        conn = get_db()
        conn.close()
        return {"status": "healthy", "service": "user-service"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )
```

```dockerfile
# user-service/Containerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install fastapi uvicorn psycopg2-binary
COPY . .
EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
```

## Product Service (Node.js/Express)

```javascript
// product-service/server.js
const express = require('express');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8002;

// Connect to PostgreSQL using the container name
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  user: 'admin',
  password: 'adminpass',
  database: 'products_db'
});

// Connect to Redis using the container name
const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'redis'}:6379`
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForPostgres(maxRetries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
}

async function connectRedis(maxRetries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await redisClient.connect();
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
}

// Initialize the schema
async function initDB() {
  await waitForPostgres();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// GET /products - List products with Redis caching
app.get('/products', async (req, res) => {
  try {
    // Check Redis cache first
    const cached = await redisClient.get('products:all');
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const result = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );

    // Cache for 60 seconds
    await redisClient.setEx('products:all', 60, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /products/:id - Get a single product
app.get('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /products - Create a product
app.post('/products', async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, description, price, stock)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, price, stock || 0]
    );

    // Invalidate the cache
    await redisClient.del('products:all');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /products/:id/stock - Update stock (called by Order Service)
app.patch('/products/:id/stock', async (req, res) => {
  try {
    const { quantity } = req.body;
    const result = await pool.query(
      `UPDATE products SET stock = stock + $1 WHERE id = $2 RETURNING *`,
      [quantity, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await redisClient.del('products:all');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await Promise.all([
      pool.query('SELECT 1'),
      redisClient.ping()
    ]);
    res.json({ status: 'healthy', service: 'product-service' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

async function start() {
  await Promise.all([initDB(), connectRedis()]);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Product service running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start product service', err);
  process.exit(1);
});
```

```dockerfile
# product-service/Containerfile
FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8002
CMD ["node", "--watch", "server.js"]
```

## Order Service (Node.js/Express)

```javascript
// order-service/server.js
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8003;

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  user: 'admin',
  password: 'adminpass',
  database: 'orders_db'
});

// Service discovery: other services are reachable by container name
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://user-service:8001';
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://product-service:8002';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForPostgres(maxRetries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
}

async function initDB() {
  await waitForPostgres();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// POST /orders - Create an order (calls User and Product services)
app.post('/orders', async (req, res) => {
  try {
    const { user_id, product_id, quantity } = req.body;

    // Verify user exists by calling the User Service
    const userRes = await fetch(`${USER_SERVICE}/users/${user_id}`);
    if (!userRes.ok) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Get product details from the Product Service
    const productRes = await fetch(`${PRODUCT_SERVICE}/products/${product_id}`);
    if (!productRes.ok) {
      return res.status(400).json({ error: 'Product not found' });
    }
    const product = await productRes.json();

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    const total = product.price * quantity;

    // Create the order
    const result = await pool.query(
      `INSERT INTO orders (user_id, product_id, quantity, total)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, product_id, quantity, total]
    );

    // Update product stock via the Product Service
    await fetch(`${PRODUCT_SERVICE}/products/${product_id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: -quantity })
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /orders - List orders
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', service: 'order-service' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

async function start() {
  await initDB();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Order service running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start order service', err);
  process.exit(1);
});
```

```dockerfile
# order-service/Containerfile
FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8003
CMD ["node", "--watch", "server.js"]
```

## API Gateway

```javascript
// api-gateway/server.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 8000;

// Service routing table
const services = {
  '/api/users': {
    target: 'http://user-service:8001',
    basePath: '/users',
    health: 'http://user-service:8001/health'
  },
  '/api/products': {
    target: 'http://product-service:8002',
    basePath: '/products',
    health: 'http://product-service:8002/health'
  },
  '/api/orders': {
    target: 'http://order-service:8003',
    basePath: '/orders',
    health: 'http://order-service:8003/health'
  }
};

// Set up proxy routes for each service
Object.entries(services).forEach(([path, { target, basePath }]) => {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (requestPath) =>
      requestPath === '/' ? basePath : `${basePath}${requestPath}`,
    on: {
      error: (err, req, res) => {
        res.status(503).json({
          error: 'Service unavailable',
          service: path
        });
      }
    }
  }));
});

// Health check that verifies all services
app.get('/health', async (req, res) => {
  const checks = await Promise.all(
    Object.entries(services).map(async ([path, { health }]) => {
      try {
        const response = await fetch(health);
        return { path, status: response.ok ? 'up' : 'down' };
      } catch (err) {
        return { path, status: 'down' };
      }
    })
  );

  const allHealthy = checks.every(r => r.status === 'up');
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    services: checks
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

```dockerfile
# api-gateway/Containerfile
FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8000
CMD ["node", "--watch", "server.js"]
```

## Orchestrating with podman-compose

Instead of starting each container manually, use a compose file:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: adminpass
      POSTGRES_DB: admin
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    networks:
      - microservices

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - microservices

  user-service:
    build:
      context: ./user-service
      dockerfile: Containerfile
    ports:
      - "8001:8001"
    environment:
      DB_HOST: postgres
    volumes:
      - ./user-service:/app
    depends_on:
      - postgres
    networks:
      - microservices

  product-service:
    build:
      context: ./product-service
      dockerfile: Containerfile
    ports:
      - "8002:8002"
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
    volumes:
      - ./product-service:/app
    depends_on:
      - postgres
      - redis
    networks:
      - microservices

  order-service:
    build:
      context: ./order-service
      dockerfile: Containerfile
    ports:
      - "8003:8003"
    environment:
      DB_HOST: postgres
      USER_SERVICE_URL: http://user-service:8001
      PRODUCT_SERVICE_URL: http://product-service:8002
    volumes:
      - ./order-service:/app
    depends_on:
      - postgres
      - user-service
      - product-service
    networks:
      - microservices

  api-gateway:
    build:
      context: ./api-gateway
      dockerfile: Containerfile
    ports:
      - "8000:8000"
    depends_on:
      - user-service
      - product-service
      - order-service
    networks:
      - microservices

networks:
  microservices:
    external: true
    name: microservices-net

volumes:
  pgdata:
```

Create the database init script referenced by the compose file:

```bash
# init-db.sh
#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'EOSQL'
CREATE DATABASE users_db;
CREATE DATABASE products_db;
CREATE DATABASE orders_db;
EOSQL
```

Start everything with one command:

```bash
# Install podman-compose
pip3 install podman-compose

# Start all services
podman-compose up -d

# Check the status
podman-compose ps

# View logs from all services
podman-compose logs -f

# Stop everything
podman-compose down

# Remove everything, including the database volume, to re-run init-db.sh from scratch
podman-compose down -v
```

## Testing Inter-Service Communication

Once the stack is running, test the full workflow:

```bash
# Create a user via the API Gateway
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "name": "Alice"}'

# Create a product
curl -X POST http://localhost:8000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Laptop", "description": "A fast laptop", "price": 999.99, "stock": 10}'

# Place an order (this calls User and Product services internally)
curl -X POST http://localhost:8000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "product_id": 1, "quantity": 2}'

# Check the gateway health (shows status of all services)
curl http://localhost:8000/health | python3 -m json.tool
```

## Debugging Microservices

When debugging inter-service issues, use these techniques:

```bash
# Check logs from a specific service
podman-compose logs user-service

# Exec into a service container to test connectivity
podman-compose exec order-service sh
# Inside the container, test connectivity to other services
node -e "fetch('http://user-service:8001/health').then(r => r.text()).then(console.log)"
node -e "fetch('http://product-service:8002/health').then(r => r.text()).then(console.log)"

# Inspect the network to see all connected containers
podman network inspect microservices-net

# Monitor network traffic between services (requires tcpdump in container)
podman-compose exec product-service sh -c \
  "apt-get update && apt-get install -y tcpdump && tcpdump -i any port 8002 -A"
```

## Conclusion

Podman handles microservices development well through container networking and podman-compose orchestration. Containers on the same network discover each other by name, replacing the need for service registries during local development. The compose file defines the entire system topology, making it easy for any developer to bring up the full stack with a single command. Volume mounts preserve hot reloading during development, and the rootless execution model means you can run all of this without elevated privileges. When you are ready to deploy, the same container images and networking patterns translate directly to Kubernetes pods and services.
