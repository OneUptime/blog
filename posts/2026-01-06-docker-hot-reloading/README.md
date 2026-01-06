# How to Set Up Hot Reloading in Docker for Node.js, Python, and Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Development, NodeJS, Python, Go

Description: Configure bind mounts with nodemon, watchdog, air, and other file watchers to keep development loops fast inside containers.

The edit-build-run cycle kills developer productivity. Hot reloading detects file changes and restarts your application automatically, turning a 30-second feedback loop into instant iteration. Getting this right in Docker requires proper bind mounts and the right file watcher for your stack.

---

## The Core Pattern

Hot reloading in Docker requires two things:

1. **Bind mount** - Syncs your local source code into the container
2. **File watcher** - Detects changes and restarts the process

```yaml
# The fundamental pattern
services:
  app:
    volumes:
      - ./src:/app/src  # Bind mount source code
    command: <watcher> <your-app>  # File watcher runs your app
```

---

## Node.js with Nodemon

Nodemon is the standard file watcher for Node.js development.

### Basic Setup

```dockerfile
# Dockerfile.dev
FROM node:22-alpine

WORKDIR /app

# Install nodemon globally
RUN npm install -g nodemon

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Source code will be bind-mounted
COPY . .

CMD ["nodemon", "src/index.js"]
```

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
      # Exclude node_modules from bind mount
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
```

### Nodemon Configuration

```json
// nodemon.json
{
  "watch": ["src"],
  "ext": "js,json,ts",
  "ignore": ["src/**/*.test.js", "node_modules"],
  "delay": "500",
  "exec": "node src/index.js"
}
```

### TypeScript with ts-node

```dockerfile
FROM node:22-alpine
WORKDIR /app
RUN npm install -g nodemon ts-node typescript
COPY package*.json ./
RUN npm install
COPY . .
CMD ["nodemon", "--exec", "ts-node", "src/index.ts"]
```

```json
// nodemon.json for TypeScript
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node src/index.ts"
}
```

### Next.js / Vite / Create React App

These frameworks have built-in hot reload:

```yaml
services:
  frontend:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - ./:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    command: npm run dev
    environment:
      # Enable hot reload in Docker
      - WATCHPACK_POLLING=true  # Next.js
      - CHOKIDAR_USEPOLLING=true  # CRA/Vite
```

---

## Python with Watchdog

Python doesn't have a universal standard, but several options work well.

### Option 1: Watchdog + Custom Script

```dockerfile
# Dockerfile.dev
FROM python:3.12-slim

WORKDIR /app

RUN pip install watchdog[watchmedo]

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["watchmedo", "auto-restart", "--directory=./", "--pattern=*.py", "--recursive", "--", "python", "app.py"]
```

### Option 2: Flask Debug Mode

Flask has built-in reloading:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV FLASK_ENV=development
CMD ["flask", "run", "--host=0.0.0.0", "--reload"]
```

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./:/app
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=development
      - FLASK_APP=app.py
```

### Option 3: Django with runserver

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

Django's runserver auto-reloads by default.

### Option 4: Uvicorn with Reload

For FastAPI/Starlette:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install uvicorn[standard] fastapi
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--reload"]
```

```yaml
services:
  api:
    build: .
    volumes:
      - ./:/app
    ports:
      - "8000:8000"
```

---

## Go with Air

Air is the most popular hot reload tool for Go development.

### Basic Setup

```dockerfile
# Dockerfile.dev
FROM golang:1.22-alpine

WORKDIR /app

# Install air
RUN go install github.com/air-verse/air@latest

# Copy go mod files first
COPY go.mod go.sum ./
RUN go mod download

COPY . .

CMD ["air", "-c", ".air.toml"]
```

### Air Configuration

```toml
# .air.toml
root = "."
tmp_dir = "tmp"

[build]
  bin = "./tmp/main"
  cmd = "go build -o ./tmp/main ."
  delay = 1000
  exclude_dir = ["assets", "tmp", "vendor"]
  exclude_file = []
  exclude_regex = ["_test.go"]
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]
  kill_delay = "0s"
  log = "build-errors.log"
  send_interrupt = false
  stop_on_error = true

[color]
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = false

[misc]
  clean_on_exit = false
```

### Docker Compose for Go

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./:/app
      # Cache Go modules
      - go-mod-cache:/go/pkg/mod
    ports:
      - "8080:8080"
    environment:
      - GO_ENV=development

volumes:
  go-mod-cache:
```

---

## Performance Optimization

### The node_modules Problem

On macOS/Windows, bind-mounting node_modules is painfully slow:

```yaml
services:
  app:
    volumes:
      - ./:/app
      # Use anonymous volume for node_modules
      - /app/node_modules
```

Or use a named volume:

```yaml
services:
  app:
    volumes:
      - ./:/app
      - node_modules:/app/node_modules

volumes:
  node_modules:
```

### Enable Polling (When Needed)

Some file systems don't properly propagate change events:

```yaml
# Node.js
environment:
  - CHOKIDAR_USEPOLLING=true
  - WATCHPACK_POLLING=true

# Python watchdog
command: watchmedo auto-restart --directory=./ --pattern=*.py --polling --recursive -- python app.py

# Go Air
# In .air.toml
[build]
  poll = true
  poll_interval = 500
```

### Docker Desktop Performance Settings

On macOS/Windows, use Docker Desktop's performance settings:

1. Preferences > Resources > File Sharing
2. Add only necessary directories
3. Consider using Docker's `cached` or `delegated` consistency:

```yaml
volumes:
  - ./src:/app/src:cached  # Host authoritative
  - ./logs:/app/logs:delegated  # Container authoritative
```

---

## Complete Examples

### Full-Stack JavaScript

```yaml
# docker-compose.yml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api/src:/app/src
      - /app/node_modules
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:password@db:5432/app
    depends_on:
      - db

  web:
    build:
      context: ./web
      dockerfile: Dockerfile.dev
    volumes:
      - ./web/src:/app/src
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - WATCHPACK_POLLING=true
      - NEXT_PUBLIC_API_URL=http://localhost:3001

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

### FastAPI + React

```yaml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api:/app
    ports:
      - "8000:8000"
    command: uvicorn main:app --host 0.0.0.0 --reload

  web:
    build:
      context: ./web
      dockerfile: Dockerfile.dev
    volumes:
      - ./web:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - CHOKIDAR_USEPOLLING=true
```

### Go Microservices

```yaml
services:
  auth:
    build:
      context: ./auth
      dockerfile: Dockerfile.dev
    volumes:
      - ./auth:/app
      - go-mod-cache:/go/pkg/mod
    ports:
      - "8081:8080"

  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api:/app
      - go-mod-cache:/go/pkg/mod
    ports:
      - "8080:8080"
    depends_on:
      - auth

volumes:
  go-mod-cache:
```

---

## Troubleshooting

### Changes Not Detected

```bash
# Check if bind mount is working
docker compose exec app ls -la /app/src

# Verify file watcher is running
docker compose logs -f app

# Test with polling
environment:
  - CHOKIDAR_USEPOLLING=true
```

### Slow Restart

```bash
# Reduce watched files
# nodemon.json
{
  "watch": ["src"],  # Don't watch root
  "ignore": ["**/*.test.js", "**/*.spec.js", "coverage", "dist"]
}
```

### Out of Memory

```bash
# Increase Node.js memory limit
command: nodemon --max-old-space-size=4096 src/index.js

# Or in environment
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

---

## Quick Reference

```bash
# Node.js
npm install -g nodemon
nodemon src/index.js

# Python
pip install watchdog[watchmedo]
watchmedo auto-restart --pattern="*.py" -- python app.py

# Go
go install github.com/air-verse/air@latest
air

# Check if polling is needed
docker compose exec app sh -c 'echo "test" >> /app/src/test.txt'
# Watch logs for restart

# Force polling mode
CHOKIDAR_USEPOLLING=true docker compose up
```

---

## Summary

- Bind mounts sync source code; file watchers restart on changes
- Node.js: Use nodemon or framework-native watchers
- Python: Use watchdog, Flask debug mode, or uvicorn --reload
- Go: Use Air with proper .air.toml configuration
- Keep node_modules/vendor directories out of bind mounts
- Enable polling on Docker Desktop if change detection fails
- Use `cached` or `delegated` consistency for better macOS/Windows performance

Fast feedback loops make developers happy. Invest the time to get hot reloading right.
