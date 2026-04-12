# Validation Summary: How to Use MongoDB with Traefik as a Reverse Proxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Traefik v3.1 (reverse proxy)
- MongoDB 7.0
- Docker Compose
- Node.js with Express
- MongoDB Node.js Driver (v4+/v6)
- Let's Encrypt (ACME TLS)

## Sources Consulted
- Traefik v3 documentation — Docker provider: https://doc.traefik.io/traefik/providers/docker/
- Traefik v3 documentation — HTTP routers and labels: https://doc.traefik.io/traefik/routing/routers/
- Traefik v3 documentation — TCP routers: https://doc.traefik.io/traefik/routing/routers/#configuring-tcp-routers
- Traefik v3 documentation — Rate Limit middleware: https://doc.traefik.io/traefik/middlewares/http/ratelimit/
- Traefik v3 documentation — Basic Auth middleware: https://doc.traefik.io/traefik/middlewares/http/basicauth/
- Traefik v3 documentation — Health checks: https://doc.traefik.io/traefik/routing/services/#health-check
- Traefik v3 documentation — ACME / Let's Encrypt: https://doc.traefik.io/traefik/https/acme/
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Node.js Driver API — MongoClient: https://mongodb.github.io/node-mongodb-native/6.0/classes/MongoClient.html

## Issues Found
1. **Unused `ObjectId` import in Node.js code**: The line `const { MongoClient, ObjectId } = require("mongodb")` imported `ObjectId` but it was never used anywhere in the code example. Removed `ObjectId` from the destructured import to avoid confusing readers.

## Review Notes
- The `version: "3.8"` field in Docker Compose is obsolete in Docker Compose V2 (the Go rewrite) and produces a warning. It still works and is not an error, but modern Docker Compose files can omit it entirely.
- The TCP routing section shows Traefik file provider format (dynamic configuration) but does not show the corresponding TLS certificate configuration needed when `passthrough: false`. This is acceptable as a partial snippet but readers will need to add certificate configuration for a working setup.
- The `POST /orders` endpoint spreads `req.body` directly into the MongoDB document without input validation. This is acceptable for a tutorial focused on Traefik routing but would need sanitization in production to prevent NoSQL injection via `$` operators.
- All Traefik v3 CLI flags, label formats, and configuration structures are correct and current.
