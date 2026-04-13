# How to Use MongoDB with Kong API Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Kong, API Gateway, Microservice, Proxy

Description: Route, authenticate, and rate-limit requests to MongoDB-backed services using Kong API Gateway with declarative configuration.

---

## Overview

Kong API Gateway sits in front of your application services and handles cross-cutting concerns like authentication, rate limiting, and routing. When your backend services use MongoDB, Kong manages traffic without needing the database driver itself - it proxies HTTP/REST requests to your application, which then talks to MongoDB.

## Docker Compose Setup

Run Kong alongside a MongoDB-backed Node.js service using Docker Compose.

```yaml
version: "3.8"
services:
  kong:
    image: kong:3.6
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/declarative/kong.yml
      KONG_PROXY_LISTEN: "0.0.0.0:8000"
      KONG_ADMIN_LISTEN: "0.0.0.0:8001"
    ports:
      - "8000:8000"
      - "8001:8001"
    volumes:
      - ./kong.yml:/kong/declarative/kong.yml

  api:
    build: ./api
    environment:
      MONGODB_URI: mongodb://mongo:27017/myapp
    depends_on:
      - mongo

  mongo:
    image: mongo:7.0
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

## Declarative Kong Configuration

Define services, routes, and plugins in a single `kong.yml` file.

```yaml
_format_version: "3.0"

services:
  - name: products-service
    url: http://api:3000
    routes:
      - name: products-route
        paths:
          - /api/products
        strip_path: false
        methods:
          - GET
          - POST
          - PUT
          - DELETE
    plugins:
      - name: rate-limiting
        config:
          minute: 60
          policy: local
      - name: key-auth
        config:
          key_names:
            - X-Api-Key

consumers:
  - username: internal-client
    keyauth_credentials:
      - key: my-secret-key-12345
```

## Node.js Service with MongoDB

The application service uses MongoDB and exposes a standard REST API that Kong proxies.

```javascript
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
let col;

async function start() {
  await client.connect();
  col = client.db().collection("products");
  app.listen(3000, () => console.log("API listening on 3000"));
}

app.get("/api/products", async (req, res) => {
  const docs = await col.find({}).limit(50).toArray();
  res.json(docs);
});

app.post("/api/products", async (req, res) => {
  const result = await col.insertOne(req.body);
  res.status(201).json({ _id: result.insertedId });
});

start().catch(console.error);
```

## Adding JWT Authentication

Replace key-auth with Kong's JWT plugin to validate tokens before requests reach MongoDB-backed services.

```yaml
plugins:
  - name: jwt
    config:
      claims_to_verify:
        - exp
      key_claim_name: iss
```

The following Admin API commands require Kong running with a database (e.g., PostgreSQL), not the DB-less mode shown earlier. For DB-less mode, add consumers and credentials directly to your `kong.yml` file.

```bash
# Create a consumer and generate a JWT credential
curl -X POST http://localhost:8001/consumers \
  --data "username=mobile-app"

curl -X POST http://localhost:8001/consumers/mobile-app/jwt \
  --data "algorithm=HS256" \
  --data "secret=supersecret"
```

## Rate Limiting by MongoDB Consumer

Use the rate-limiting plugin scoped per consumer to prevent any single tenant from overwhelming the MongoDB cluster. These Admin API commands require Kong running with a database, not DB-less mode.

```bash
curl -X POST http://localhost:8001/consumers/mobile-app/plugins \
  --data "name=rate-limiting" \
  --data "config.minute=30" \
  --data "config.policy=redis" \
  --data "config.redis.host=redis"
```

## Summary

Kong API Gateway decouples traffic management from your MongoDB-backed application. Use DB-less declarative configuration to define routes and plugins as code, apply rate limiting to protect your database from traffic spikes, and add key-auth or JWT to secure endpoints before requests ever reach your service layer.
