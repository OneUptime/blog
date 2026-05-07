# How to Use Podman for API Development and Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, API, REST, Testing, Development, Node.js, Python

Description: Learn how to use Podman to build, run, and test REST APIs in containers, covering local development workflows, integration testing, API mocking, and automated test pipelines.

---

> Podman containers give API developers isolated, reproducible environments to build, test, and debug endpoints alongside their backing services without polluting the host machine.

Building and testing APIs often requires running multiple services: the API server, a database, a cache layer, maybe a message queue. Podman makes it straightforward to spin up all of these as containers, run your tests against them, and tear everything down when you are done. This post covers practical patterns for API development and testing with Podman, including development servers with hot reloading, integration testing with disposable databases, API mocking, and load testing.

---

## Running an API Server in a Container

Start with a simple Express.js API and its Containerfile:

```javascript
// api/server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-memory store for demonstration
let items = [
  { id: 1, name: 'Widget', price: 9.99 },
  { id: 2, name: 'Gadget', price: 24.99 }
];

// GET /api/items - List all items
app.get('/api/items', (req, res) => {
  const { minPrice, maxPrice } = req.query;
  let result = items;

  if (minPrice) result = result.filter(i => i.price >= parseFloat(minPrice));
  if (maxPrice) result = result.filter(i => i.price <= parseFloat(maxPrice));

  res.json({ data: result, total: result.length });
});

// GET /api/items/:id - Get a single item
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST /api/items - Create a new item
app.post('/api/items', (req, res) => {
  const { name, price } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Name and price are required' });
  }
  const newItem = { id: items.length + 1, name, price: parseFloat(price) };
  items.push(newItem);
  res.status(201).json(newItem);
});

// PUT /api/items/:id - Update an item
app.put('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Item not found' });
  items[index] = { ...items[index], ...req.body };
  res.json(items[index]);
});

// DELETE /api/items/:id - Delete an item
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Item not found' });
  items.splice(index, 1);
  res.status(204).send();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}`);
});
```

```dockerfile
# Containerfile

FROM node:20-bookworm-slim
WORKDIR /app
COPY api/package*.json ./
RUN npm install
COPY api/. .
EXPOSE 3000
CMD ["npx", "nodemon", "server.js"]
```

Build and run:

```bash
# Build the API image
podman build -t my-api .

# Run with live reloading while keeping container-installed dependencies
podman run -d \
  --name api-dev \
  -p 3000:3000 \
  -v ./api:/app:Z \
  -v api-node_modules:/app/node_modules \
  my-api

# Test the API
curl http://localhost:3000/api/items | python3 -m json.tool
```

## API with a Database Backend

Most real APIs need a database. Use a Podman pod to run the API server and database together:

```bash
# Build the FastAPI image
podman build -t my-python-api -f Containerfile.python .

# Create a pod for the API and its database
podman pod create --name api-stack -p 8000:8000 -p 5432:5432

# Start PostgreSQL
podman run -d --pod api-stack --name api-db \
  -e POSTGRES_USER=apiuser \
  -e POSTGRES_PASSWORD=apipass \
  -e POSTGRES_DB=apidb \
  -v api-pgdata:/var/lib/postgresql/data:Z \
  postgres:16

# Wait for the database to be ready
until podman exec api-db pg_isready -U apiuser -d apidb; do
  sleep 1
done

# Start the API server
podman run -d --pod api-stack --name api-server \
  -v ./api:/app:Z \
  -e DATABASE_URL="postgresql://apiuser:apipass@localhost:5432/apidb" \
  my-python-api
```

Here is a Python FastAPI example with database integration:

```python
# api/main.py
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import create_engine, Column, Integer, String, Float, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import os

# Database setup
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://apiuser:apipass@localhost:5432/apidb"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# Models
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String(1000))
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic schemas for request/response validation
class ProductCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    stock: int = 0

class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    price: float
    stock: int

# Dependency to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="Product API", version="1.0.0")

@app.get("/api/products", response_model=list[ProductResponse])
def list_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Product).offset(skip).limit(limit).all()

@app.get("/api/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/products", response_model=ProductResponse, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/api/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}
```

```dockerfile
# Containerfile.python
FROM python:3.12-slim
WORKDIR /app
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/. .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

## Integration Testing with Disposable Containers

The most powerful pattern for API testing is spinning up a fresh database for each test suite, running your tests, and destroying the container afterwards:

```bash
#!/bin/bash
# run-integration-tests.sh

set -euo pipefail

TEST_POD="test-stack-$$"
TEST_DB_CONTAINER="test-db-$$"
TEST_API_CONTAINER="test-api-$$"

cleanup() {
  podman pod rm -f "$TEST_POD" >/dev/null 2>&1 || true
}

trap cleanup EXIT

# Build the API image used for the integration test run
podman build -t my-python-api -f Containerfile.python .

# Create a pod for the API and disposable database
podman pod create --name "$TEST_POD" -p 8000:8000

# Start a disposable database inside the pod
podman run -d \
  --pod "$TEST_POD" \
  --name "$TEST_DB_CONTAINER" \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=testdb \
  postgres:16

# Wait for database readiness
echo "Waiting for test database..."
for i in $(seq 1 30); do
  if podman exec "$TEST_DB_CONTAINER" pg_isready -U test -d testdb >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! podman exec "$TEST_DB_CONTAINER" pg_isready -U test -d testdb >/dev/null 2>&1; then
  echo "Test database did not become ready in time" >&2
  exit 1
fi

# Start the API against the disposable database
podman run -d \
  --pod "$TEST_POD" \
  --name "$TEST_API_CONTAINER" \
  -e DATABASE_URL="postgresql://test:test@localhost:5432/testdb" \
  my-python-api

# Wait for the API to be ready
echo "Waiting for API server..."
for i in $(seq 1 30); do
  if curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; then
  echo "API server did not become ready in time" >&2
  exit 1
fi

# Run integration tests
API_BASE_URL="http://localhost:8000" \
  pytest tests/integration/ -v --tb=short
```

Write integration tests that use the containerized database:

```python
# tests/integration/test_products_api.py
import pytest
import requests
import os

BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

class TestProductsAPI:
    """Integration tests for the Products API."""

    def test_create_product(self):
        """POST /api/products should create a product and return 201."""
        response = requests.post(f"{BASE_URL}/api/products", json={
            "name": "Test Widget",
            "description": "A test product",
            "price": 19.99,
            "stock": 100
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Widget"
        assert data["price"] == 19.99
        assert "id" in data

    def test_list_products(self):
        """GET /api/products should return a list."""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_nonexistent_product(self):
        """GET /api/products/99999 should return 404."""
        response = requests.get(f"{BASE_URL}/api/products/99999")
        assert response.status_code == 404

    def test_create_product_validation(self):
        """POST with missing required fields should return 422."""
        response = requests.post(f"{BASE_URL}/api/products", json={
            "description": "Missing name and price"
        })
        assert response.status_code == 422

    def test_health_check(self):
        """GET /api/health should confirm the database is connected."""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
```

## API Mocking with Containers

When you need to mock external APIs during development, run a mock server in a container:

```javascript
// mock-server/server.js
// A simple mock server that returns predefined responses
const express = require('express');
const app = express();

app.use(express.json());

// Mock a payment gateway API
app.post('/v1/charges', (req, res) => {
  console.log('Mock payment charge:', req.body);
  res.json({
    id: 'ch_mock_' + Date.now(),
    amount: req.body.amount,
    currency: req.body.currency || 'usd',
    status: 'succeeded',
    created: Math.floor(Date.now() / 1000)
  });
});

// Mock a notification service
app.post('/v1/notifications', (req, res) => {
  console.log('Mock notification:', req.body);
  res.json({
    id: 'notif_mock_' + Date.now(),
    status: 'sent',
    recipient: req.body.recipient
  });
});

// Catch-all for unhandled routes
app.all('/{*path}', (req, res) => {
  console.log(`Unhandled: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Mock endpoint not configured' });
});

app.listen(4000, '0.0.0.0', () => {
  console.log('Mock server running on port 4000');
});
```

```bash
# Run the mock server alongside your API
podman run -d \
  --pod api-stack \
  --name mock-services \
  -v ./mock-server:/app:Z \
  node:20-bookworm-slim \
  bash -c "cd /app && npm install && node server.js"
```

Your API can then call `http://localhost:4000` to reach the mock services.

## Load Testing with Containers

Use containerized load testing tools to stress test your API:

```bash
# Use k6 for load testing (runs in a container)
podman run --rm \
  --network host \
  -v ./tests/load:/scripts:Z \
  grafana/k6 run /scripts/load-test.js
```

Create a k6 load test script:

```javascript
// tests/load/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 20 },     // Hold at 20 users
    { duration: '30s', target: 50 },    // Ramp to 50 users
    { duration: '1m', target: 50 },     // Hold at 50 users
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],      // Less than 1% failure rate
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // GET /api/items
  const listResponse = http.get(`${BASE_URL}/api/items`);
  check(listResponse, {
    'list status is 200': (r) => r.status === 200,
    'list returns data': (r) => JSON.parse(r.body).data.length > 0,
  });

  // POST /api/items
  const payload = JSON.stringify({
    name: `Item-${Date.now()}`,
    price: Math.random() * 100,
  });
  const createResponse = http.post(`${BASE_URL}/api/items`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(createResponse, {
    'create status is 201': (r) => r.status === 201,
  });

  sleep(1);
}
```

## Generating API Documentation

Use Swagger UI in a container to serve your OpenAPI documentation:

```bash
# Serve an OpenAPI spec with Swagger UI
podman run -d \
  --name swagger-ui \
  -p 8082:8080 \
  -e SWAGGER_JSON=/spec/openapi.json \
  -v ./docs:/spec:Z \
  swaggerapi/swagger-ui

echo "API docs available at http://localhost:8082"
```

## Conclusion

Podman provides a clean workflow for API development and testing. Pods group your API server with backing services like databases and caches under a shared network namespace. Disposable containers give you fresh databases for every integration test run. Mock servers in containers let you simulate external services without external dependencies. And containerized load testing tools like k6 let you stress test your API in a reproducible way. The rootless execution model means none of this requires elevated privileges on your development machine.
