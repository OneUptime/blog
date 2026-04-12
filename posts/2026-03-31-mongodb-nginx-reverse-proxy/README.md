# How to Use MongoDB with Nginx as a Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Nginx, Reverse Proxy, Docker, Configuration

Description: Proxy HTTP requests to a MongoDB-backed application using Nginx, with SSL termination, upstream load balancing, and security hardening.

---

## Overview

Nginx is commonly used as a reverse proxy in front of Node.js, Python, or Java services that connect to MongoDB. Nginx handles TLS termination, load balancing, and request buffering while your application manages the MongoDB driver and query logic.

## Docker Compose Architecture

Run Nginx, a Node.js API, and MongoDB together using Docker Compose.

```yaml
version: "3.8"
services:
  nginx:
    image: nginx:1.25-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api

  api:
    build: ./api
    environment:
      MONGODB_URI: mongodb://mongo:27017/appdb
    deploy:
      replicas: 2

  mongo:
    image: mongo:7.0
    volumes:
      - mongo_data:/data/db
    command: mongod

volumes:
  mongo_data:
```

## Nginx Configuration

Proxy requests to the upstream application and configure sensible timeouts that align with MongoDB query durations.

```text
upstream api_upstream {
    least_conn;
    server api:3000;
    keepalive 16;
}

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location /api/ {
        proxy_pass         http://api_upstream/;
        proxy_http_version 1.1;
        proxy_set_header   Connection "";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
        proxy_send_timeout 10s;
    }

    location /health {
        proxy_pass http://api_upstream/health;
        access_log off;
    }
}
```

## Node.js App Connecting to MongoDB

```javascript
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
});

let db;
client.connect().then(() => {
  db = client.db();
  app.listen(3000);
});

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/users/:id", async (req, res) => {
  const { ObjectId } = require("mongodb");
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(req.params.id) });
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json(user);
});
```

## TCP Proxying for MongoDB Replication Traffic

If you need Nginx to proxy raw MongoDB wire protocol traffic (for example, to route replica set member connections), use the `stream` module.

```text
stream {
    upstream mongodb_primary {
        server mongo-primary:27017;
    }

    server {
        listen 27017;
        proxy_pass mongodb_primary;
        proxy_timeout 10s;
        proxy_connect_timeout 5s;
    }
}
```

## Rate Limiting to Protect MongoDB

Apply Nginx rate limiting to prevent write storms from overwhelming the database.

```text
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

location /api/ {
    limit_req zone=api_limit burst=40 nodelay;
    proxy_pass http://api_upstream/;
}
```

## Summary

Nginx reverse proxy in front of a MongoDB-backed application provides SSL termination, load balancing across multiple app replicas, and rate limiting to protect the database. Use `keepalive` connections to the upstream to reduce connection overhead, and align `proxy_read_timeout` with your longest expected MongoDB query duration.
