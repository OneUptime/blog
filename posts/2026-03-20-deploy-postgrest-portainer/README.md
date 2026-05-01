# How to Deploy PostgREST via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, PostgREST, PostgreSQL, REST API, Docker

Description: Deploy PostgREST using Portainer to auto-generate a RESTful API directly from your PostgreSQL database schema.

## Introduction

PostgREST is a standalone web server that turns your PostgreSQL database directly into a RESTful API. It uses PostgreSQL's role system for authentication and authorization, meaning all API business logic lives in the database.

## Prerequisites

- Portainer installed with Docker
- A PostgreSQL database (can be deployed in the same stack)

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** > **Add Stack**:

```yaml
# docker-compose.yml - PostgREST

services:
  postgrest:
    image: postgrest/postgrest:v12.0.2
    container_name: postgrest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PGRST_DB_URI=postgres://authenticator:${AUTHENTICATOR_PASSWORD}@postgres:5432/app_db
      - PGRST_DB_SCHEMAS=api
      - PGRST_DB_ANON_ROLE=anon
      - PGRST_JWT_SECRET=${JWT_SECRET}
      - PGRST_DB_POOL=10
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - postgrest_net

  postgres:
    image: postgres:16-alpine
    container_name: postgrest_postgres
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - /opt/postgrest/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      - POSTGRES_DB=app_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - postgrest_net

volumes:
  postgres_data:

networks:
  postgrest_net:
    driver: bridge
```

## Step 2: Initialize the Database Schema

Create `/opt/postgrest/init.sql` on the Docker host before deploying:

```sql
-- Create the API schema
CREATE SCHEMA api;

-- Create roles
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'authenticator-password';

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;

-- Create a table in the api schema
CREATE TABLE api.todos (
    id SERIAL PRIMARY KEY,
    task TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT USAGE ON SCHEMA api TO anon, authenticated;
GRANT SELECT ON api.todos TO anon;
GRANT ALL ON api.todos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE api.todos_id_seq TO authenticated;
```

## Step 3: Set Environment Variables in Portainer

```text
AUTHENTICATOR_PASSWORD=authenticator-password
POSTGRES_PASSWORD=your-postgres-password
JWT_SECRET=change-this-jwt-secret-1234567890
```

## Step 4: Query the API

```bash
# Read todos (as anonymous user)
curl http://localhost:3000/todos

# Filter with query parameters
curl "http://localhost:3000/todos?done=eq.false&order=created_at.desc"

# Create a todo (requires JWT)
JWT_SECRET='change-this-jwt-secret-1234567890'
JWT_TOKEN=$(JWT_SECRET="$JWT_SECRET" python3 - <<'PY'
import base64
import hashlib
import hmac
import json
import os

def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

header = {"alg": "HS256", "typ": "JWT"}
payload = {"role": "authenticated"}
signing_input = ".".join([
    b64url(json.dumps(header, separators=(",", ":")).encode()),
    b64url(json.dumps(payload, separators=(",", ":")).encode()),
]).encode()
signature = b64url(hmac.new(os.environ["JWT_SECRET"].encode(), signing_input, hashlib.sha256).digest())

print(f"{signing_input.decode()}.{signature}")
PY
)

curl -X POST http://localhost:3000/todos \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"task": "Deploy PostgREST", "done": false}'

# Update
curl -X PATCH "http://localhost:3000/todos?id=eq.1" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"done": true}'
```

## Step 5: Use OpenAPI Documentation

PostgREST auto-generates OpenAPI spec:

```bash
curl http://localhost:3000/ | python3 -m json.tool | head -50
```

## Conclusion

PostgREST maps your PostgreSQL schema directly to HTTP endpoints - no application code needed. The `PGRST_DB_SCHEMAS` variable controls which schemas are exposed. Authorization is handled through PostgreSQL roles, object privileges, and optional Row Level Security (RLS) policies. JWT claims (like `role`) are exposed to PostgreSQL through `request.jwt.claims`, enabling per-user row-level access control.
