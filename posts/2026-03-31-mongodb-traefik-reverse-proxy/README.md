# How to Use MongoDB with Traefik as a Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Traefik, Reverse Proxy, Docker, TLS

Description: Use Traefik as a reverse proxy in front of MongoDB-backed services with automatic TLS, label-based routing, and middleware configuration.

---

## Overview

Traefik's label-driven discovery model makes it straightforward to route traffic to MongoDB-backed services running in Docker. Traefik auto-discovers services via container labels, manages Let's Encrypt certificates, and applies middleware like rate limiting or authentication without manual configuration files.

## Docker Compose Setup

Define Traefik alongside your application and MongoDB using Docker Compose.

```yaml
version: "3.8"
services:
  traefik:
    image: traefik:v3.1
    command:
      - --providers.docker=true
      - --providers.docker.exposedByDefault=false
      - --entryPoints.web.address=:80
      - --entryPoints.websecure.address=:443
      - --certificatesResolvers.le.acme.tlsChallenge=true
      - --certificatesResolvers.le.acme.email=admin@example.com
      - --certificatesResolvers.le.acme.storage=/acme/acme.json
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - acme_data:/acme

  api:
    build: ./api
    environment:
      MONGODB_URI: mongodb://mongo:27017/mydb
    labels:
      - traefik.enable=true
      - traefik.http.routers.api.rule=Host(`api.example.com`)
      - traefik.http.routers.api.entrypoints=websecure
      - traefik.http.routers.api.tls.certresolver=le
      - traefik.http.services.api.loadbalancer.server.port=3000
      - traefik.http.routers.api.middlewares=rate-limit@docker
      - traefik.http.middlewares.rate-limit.ratelimit.average=50
      - traefik.http.middlewares.rate-limit.ratelimit.burst=100
    depends_on:
      - mongo

  mongo:
    image: mongo:7.0
    volumes:
      - mongo_data:/data/db

volumes:
  acme_data:
  mongo_data:
```

## Application Service

The Node.js application connects to MongoDB and exposes endpoints that Traefik routes.

```javascript
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

let db;
const client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 10 });

async function init() {
  await client.connect();
  db = client.db();
  app.listen(3000, () => console.log("Started on 3000"));
}

app.get("/orders", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const orders = await db
    .collection("orders")
    .find({})
    .skip(skip)
    .limit(limit)
    .toArray();
  res.json(orders);
});

app.post("/orders", async (req, res) => {
  const result = await db.collection("orders").insertOne({
    ...req.body,
    createdAt: new Date(),
  });
  res.status(201).json({ _id: result.insertedId });
});

init().catch(console.error);
```

## TCP Routing for MongoDB Wire Protocol

Traefik can proxy raw TCP connections to MongoDB using its TCP router. This is useful when you want Traefik to terminate TLS for MongoDB replica set connections.

```yaml
tcp:
  routers:
    mongo-router:
      rule: HostSNI(`mongo.internal.example.com`)
      entryPoints:
        - mongo
      tls:
        passthrough: false
      service: mongo-service

  services:
    mongo-service:
      loadBalancer:
        servers:
          - address: mongo:27017
```

Add the MongoDB entrypoint to Traefik's static configuration:

```yaml
entryPoints:
  mongo:
    address: ":27017"
```

## Adding Basic Auth Middleware

Protect admin endpoints that query MongoDB with a basic auth middleware.

```bash
htpasswd -nb admin secretpassword
```

```yaml
labels:
  - traefik.http.middlewares.admin-auth.basicauth.users=admin:$$apr1$$...
  - traefik.http.routers.admin.middlewares=admin-auth@docker
```

## Health Check Configuration

Configure Traefik to respect your application's health endpoint, which can query MongoDB to confirm connectivity.

```yaml
labels:
  - traefik.http.services.api.loadbalancer.healthcheck.path=/health
  - traefik.http.services.api.loadbalancer.healthcheck.interval=10s
  - traefik.http.services.api.loadbalancer.healthcheck.timeout=3s
```

## Summary

Traefik's label-based configuration makes it easy to expose MongoDB-backed services with automatic HTTPS, rate limiting, and health checks - all defined alongside your application in Docker Compose. Use TCP routers when you need Traefik to proxy MongoDB wire protocol connections directly.
