# How to Set Up Hot Reload for Development Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Development, Hot Reload, DevOps, Productivity

Description: Configure hot reload for any language's development container using bind mounts and file watchers managed through Portainer.

## Introduction

Hot reload (often used interchangeably with live reload) automatically restarts or refreshes your application when source files change. When developing in Docker containers managed by Portainer, setting this up correctly requires the right combination of bind mounts, file watchers, and process managers. This guide covers hot reload patterns for all major languages.

## The Core Concept

Hot reload in Docker requires three components:
1. **Bind mount** - Your local source code directory mounted into the container
2. **File watcher** - A tool inside the container that watches for file changes
3. **Process restarter** - Restarts or reloads the app when changes are detected

## Step 1: Bind Mounts for Source Code

```yaml
# docker-compose.yml - Bind mount pattern

services:
  app:
    volumes:
      # Mount entire project directory from the Docker host
      - /srv/dev/myapp:/app
      # CRITICAL: Keep dependency/build directories container-managed
      # This anonymous volume masks the directory inside the container
      - /app/node_modules    # Node.js
      - /app/vendor          # PHP
      - /app/target          # Rust
      - /app/.venv           # Python
```

## Step 2: Language-Specific Hot Reload Setup

### Node.js with nodemon

```yaml
services:
  node_app:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - /srv/dev/myapp:/app
      - /app/node_modules
    command: npx nodemon
    environment:
      - NODE_ENV=development
```

```json
// nodemon.json - Nodemon configuration
{
  "watch": ["src"],
  "ext": "ts,js,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node -r tsconfig-paths/register src/index.ts",
  "delay": "500"
}
```

### Python with uvicorn/watchfiles

```yaml
services:
  python_app:
    image: python:3.12-slim
    working_dir: /app
    volumes:
      - /srv/dev/myapp:/app
    command: >
      sh -c "pip install 'uvicorn[standard]' &&
      uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir src"
    environment:
      - PYTHONDONTWRITEBYTECODE=1
      - PYTHONUNBUFFERED=1
```

### Go with Air

```yaml
volumes:
  go_cache:

services:
  go_app:
    image: golang:1.25-alpine
    working_dir: /app
    volumes:
      - /srv/dev/myapp:/app
      - go_cache:/go/pkg/mod
    command: go run github.com/air-verse/air@latest
```

```toml
# .air.toml
[build]
  cmd = "go build -o /tmp/main ./cmd/server"
  bin = "/tmp/main"
  include_ext = ["go", "yaml"]
  exclude_dir = ["vendor", "tmp"]
  delay = 500
```

### Rust with cargo-watch

```yaml
volumes:
  cargo_cache:

services:
  rust_app:
    image: rust:1.76
    working_dir: /app
    volumes:
      - /srv/dev/myapp:/app
      - cargo_cache:/usr/local/cargo/registry
    command: sh -c "cargo install cargo-watch --locked && cargo watch -x run"
    environment:
      - RUST_LOG=debug
```

### PHP with built-in hot reload

```yaml
services:
  php_app:
    image: php:8.3-cli
    working_dir: /app
    volumes:
      - /srv/dev/myapp:/app
    command: php -S 0.0.0.0:8080 -t public public/index.php
    # PHP's built-in server automatically picks up changes
```

## Step 3: Handle File Permission Issues

On Linux, mismatched container user IDs can prevent the app from reading or writing mounted files cleanly:

```yaml
# docker-compose.yml - Fix file permissions
services:
  app:
    user: "${UID:-1000}:${GID:-1000}"
```

```bash
# Create .env file with your user IDs
echo "UID=$(id -u)" >> .env
echo "GID=$(id -g)" >> .env
```

## Step 4: Polling Mode for NFS/Network Mounts

On some systems (macOS with Docker Desktop, NFS mounts), native file notifications may not propagate reliably through bind mounts. Use polling:

```yaml
# For Node.js
environment:
  - CHOKIDAR_USEPOLLING=true   # Create React App
  - WATCHPACK_POLLING=true     # Webpack/Watchpack

# For .NET
environment:
  - DOTNET_USE_POLLING_FILE_WATCHER=1

# For Python uvicorn/watchfiles
environment:
  - WATCHFILES_FORCE_POLLING=true
  - WATCHFILES_POLL_DELAY_MS=1000
```

```toml
# Air - enable polling on macOS/Windows
[build]
  poll = true
  poll_interval = 500  # ms
```

## Step 5: Optimized docker-compose for Fast Reloads

```yaml
# docker-compose.yml - Optimized for fast hot reload
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
      # Embed inline cache metadata for BuildKit-based rebuilds
      args:
        BUILDKIT_INLINE_CACHE: 1
    volumes:
      - type: bind
        source: /srv/dev/myapp/src
        target: /app/src
    tmpfs:
      # Use tmpfs for build artifacts (faster I/O)
      - /app/dist
      - /tmp
    environment:
      # Cap Node.js heap size in the dev container
      - NODE_OPTIONS=--max-old-space-size=512
```

## Step 6: Deploy Hot-Reload Stack in Portainer

```yaml
# docker-compose.yml - Complete hot-reload dev stack
networks:
  dev_network:
    driver: bridge

volumes:
  node_modules_cache:
  go_module_cache:

services:
  # Full-stack app: React frontend + Go backend
  frontend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - /srv/dev/myapp/frontend:/app
      - node_modules_cache:/app/node_modules
    command: npm run dev -- --host 0.0.0.0
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8080
      - CHOKIDAR_USEPOLLING=true
    networks:
      - dev_network

  backend:
    image: golang:1.25-alpine
    working_dir: /app
    volumes:
      - /srv/dev/myapp/backend:/app
      - go_module_cache:/go/pkg/mod
    command: go run github.com/air-verse/air@latest
    ports:
      - "8080:8080"
    environment:
      - APP_ENV=development
    networks:
      - dev_network

  database:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=devdb
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=dev
    ports:
      - "5432:5432"
    networks:
      - dev_network
```

## Step 7: Monitor Hot Reload in Portainer

Use Portainer's container logs to verify hot reload is working:

1. Go to **Containers** > select your container > **Logs**
2. Enable **Auto-refresh** to see rebuild messages in real-time
3. Look for messages like:
   - nodemon: `[nodemon] restarting due to changes...`
   - Air: `main.go has changed`
   - uvicorn: `WatchFiles detected changes`

## Conclusion

Hot reload dramatically improves development productivity by eliminating the manual rebuild/restart cycle. The key is combining the right bind mount configuration with a file watcher appropriate for your language. Portainer makes it easy to view reload logs in real-time, restart containers when the file watcher gets stuck, and manage the entire development stack from one interface.
