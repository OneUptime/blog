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

This fundamental pattern applies to all languages and frameworks. The volume mount syncs code changes from your host into the container, while a file watcher process monitors for changes and triggers restarts.

```yaml
# The fundamental pattern for hot reloading in Docker
services:
  app:
    volumes:
      - ./src:/app/src  # Bind mount: sync local source code into container
    command: <watcher> <your-app>  # File watcher runs and monitors your app
```

---

## Node.js with Nodemon

Nodemon is the standard file watcher for Node.js development.

### Basic Setup

This Dockerfile installs nodemon globally and uses it to run your application. When any JavaScript file changes, nodemon automatically restarts the Node.js process.

```dockerfile
# Dockerfile.dev - Development Dockerfile with hot reloading
FROM node:22-alpine

WORKDIR /app

# Install nodemon globally for file watching
RUN npm install -g nodemon

# Copy package files first for better Docker layer caching
# This means npm install only re-runs when dependencies change
COPY package*.json ./
RUN npm install

# Source code will be bind-mounted, so this COPY is for initial setup
COPY . .

# Use nodemon to watch and restart on file changes
CMD ["nodemon", "src/index.js"]
```

The Docker Compose configuration mounts your source code while keeping node_modules isolated. The anonymous volume for node_modules prevents the host's potentially incompatible modules from overwriting the container's.

```yaml
# docker-compose.yml - Development configuration with hot reloading
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./src:/app/src              # Bind mount source code for live editing
      - ./package.json:/app/package.json  # Sync package.json changes
      # Exclude node_modules from bind mount to avoid permission and
      # platform compatibility issues (Linux modules in container vs Mac/Windows on host)
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development  # Enable development mode features
```

### Nodemon Configuration

A nodemon.json file gives you fine-grained control over which files are watched and how nodemon responds to changes.

```json
// nodemon.json - Configure nodemon behavior
{
  "watch": ["src"],              // Only watch the src directory
  "ext": "js,json,ts",           // File extensions to monitor
  "ignore": ["src/**/*.test.js", "node_modules"],  // Skip test files and dependencies
  "delay": "500",                // Wait 500ms before restart (debouncing)
  "exec": "node src/index.js"    // Command to execute on restart
}
```

### TypeScript with ts-node

When using TypeScript, ts-node compiles and runs TypeScript files on the fly, while nodemon handles the file watching and process restart.

```dockerfile
# Development Dockerfile for TypeScript projects
FROM node:22-alpine
WORKDIR /app

# Install nodemon for watching, ts-node for running TypeScript
RUN npm install -g nodemon ts-node typescript

COPY package*.json ./
RUN npm install
COPY . .

# Use nodemon to execute ts-node on file changes
CMD ["nodemon", "--exec", "ts-node", "src/index.ts"]
```

This nodemon configuration is specifically tuned for TypeScript projects, watching .ts files and ignoring test files.

```json
// nodemon.json for TypeScript - watches .ts files and runs ts-node
{
  "watch": ["src"],
  "ext": "ts,json",                // Watch TypeScript and JSON files
  "ignore": ["src/**/*.spec.ts"],  // Ignore test files
  "exec": "ts-node src/index.ts"   // Compile and run TypeScript
}
```

### Next.js / Vite / Create React App

These frameworks have built-in hot reload:

Modern frontend frameworks include their own hot module replacement (HMR). You just need to enable polling for Docker Desktop on macOS/Windows since file system events don't propagate correctly.

```yaml
# Frontend frameworks with built-in HMR need polling enabled in Docker
services:
  frontend:
    image: node:22-alpine
    working_dir: /app
    volumes:
      - ./:/app                 # Mount entire project
      - /app/node_modules       # Exclude node_modules from mount
    ports:
      - "3000:3000"
    command: npm run dev        # Framework's dev server handles HMR
    environment:
      # Enable polling for file system watching in Docker Desktop
      - WATCHPACK_POLLING=true   # For Next.js (uses Webpack)
      - CHOKIDAR_USEPOLLING=true # For Create React App and Vite
```

---

## Python with Watchdog

Python doesn't have a universal standard, but several options work well.

### Option 1: Watchdog + Custom Script

Watchdog is a Python library that monitors file system changes. The watchmedo utility provides a command-line interface to automatically restart your application when Python files change.

```dockerfile
# Dockerfile.dev - Python with Watchdog for hot reloading
FROM python:3.12-slim

WORKDIR /app

# Install watchdog with watchmedo CLI tool
RUN pip install watchdog[watchmedo]

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# watchmedo auto-restart: monitors directory, restarts on .py file changes
# --recursive watches subdirectories, -- separates watchmedo args from command
CMD ["watchmedo", "auto-restart", "--directory=./", "--pattern=*.py", "--recursive", "--", "python", "app.py"]
```

### Option 2: Flask Debug Mode

Flask has built-in reloading:

Flask's built-in development server includes automatic code reloading. When FLASK_ENV is set to development, Flask watches for Python file changes and restarts automatically.

```dockerfile
# Flask development Dockerfile with built-in hot reload
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Enable Flask development mode for automatic reloading
ENV FLASK_ENV=development

# --reload flag ensures Flask watches for file changes
CMD ["flask", "run", "--host=0.0.0.0", "--reload"]
```

The corresponding Docker Compose configuration mounts your source code and sets the necessary environment variables for Flask development mode.

```yaml
# Docker Compose for Flask development
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./:/app          # Mount source code for live editing
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=development  # Enable debug mode and auto-reload
      - FLASK_APP=app.py       # Tell Flask which file is the application
```

### Option 3: Django with runserver

Django's runserver auto-reloads by default, making it easy to set up hot reloading for Django projects.

```dockerfile
# Django development Dockerfile - runserver has built-in auto-reload
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Django's runserver automatically reloads on code changes
# 0.0.0.0 binding is required to access from outside the container
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

Django's runserver auto-reloads by default.

### Option 4: Uvicorn with Reload

For FastAPI/Starlette:

Uvicorn is the recommended ASGI server for FastAPI and Starlette. The --reload flag enables automatic reloading when Python files change.

```dockerfile
# FastAPI/Starlette development with Uvicorn hot reload
FROM python:3.12-slim
WORKDIR /app

# Install uvicorn with standard extras for better performance
RUN pip install uvicorn[standard] fastapi

COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# --reload enables hot reloading, watches for .py file changes
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--reload"]
```

Simple Docker Compose setup for FastAPI development with volume mounting for live code changes.

```yaml
# FastAPI development with Uvicorn
services:
  api:
    build: .
    volumes:
      - ./:/app  # Mount source for hot reloading
    ports:
      - "8000:8000"
```

---

## Go with Air

Air is the most popular hot reload tool for Go development.

### Basic Setup

Air watches for Go file changes, recompiles your application, and restarts it automatically. This dramatically speeds up the Go development cycle.

```dockerfile
# Dockerfile.dev - Go development with Air hot reload
FROM golang:1.22-alpine

WORKDIR /app

# Install Air - the most popular Go hot reload tool
RUN go install github.com/air-verse/air@latest

# Copy go mod files first for better caching
# Dependencies only re-download when go.mod/go.sum change
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Run Air with configuration file
CMD ["air", "-c", ".air.toml"]
```

### Air Configuration

The .air.toml file configures Air's behavior including which files to watch, how to build, and what directories to exclude from monitoring.

```toml
# .air.toml - Air configuration for Go hot reloading
root = "."          # Root directory to watch
tmp_dir = "tmp"     # Directory for compiled binaries

[build]
  bin = "./tmp/main"                    # Output binary path
  cmd = "go build -o ./tmp/main ."      # Build command
  delay = 1000                          # Wait 1 second before rebuilding (debounce)
  exclude_dir = ["assets", "tmp", "vendor"]  # Don't watch these directories
  exclude_file = []
  exclude_regex = ["_test.go"]          # Skip test files
  exclude_unchanged = false
  follow_symlink = false
  full_bin = ""
  include_dir = []
  include_ext = ["go", "tpl", "tmpl", "html"]  # File types to watch
  kill_delay = "0s"
  log = "build-errors.log"              # Log build errors here
  send_interrupt = false
  stop_on_error = true                  # Stop if build fails

[color]
  # Terminal colors for Air output
  app = ""
  build = "yellow"
  main = "magenta"
  runner = "green"
  watcher = "cyan"

[log]
  time = false  # Don't show timestamps in logs

[misc]
  clean_on_exit = false  # Keep compiled binary after exit
```

### Docker Compose for Go

This configuration mounts your source code and uses a named volume for the Go module cache to speed up builds.

```yaml
# Docker Compose for Go development with Air
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - ./:/app                   # Mount source code
      # Cache Go modules in named volume for faster builds
      - go-mod-cache:/go/pkg/mod
    ports:
      - "8080:8080"
    environment:
      - GO_ENV=development

# Named volume persists Go module cache between container restarts
volumes:
  go-mod-cache:
```

---

## Performance Optimization

### The node_modules Problem

On macOS/Windows, bind-mounting node_modules is painfully slow:

Docker Desktop on macOS and Windows uses a VM, making large bind mounts slow. Excluding node_modules with an anonymous volume keeps them inside the container's native filesystem.

```yaml
# Exclude node_modules from bind mount for better performance
services:
  app:
    volumes:
      - ./:/app               # Mount source code
      # Use anonymous volume for node_modules - stays inside container
      # This prevents slow file operations on macOS/Windows
      - /app/node_modules
```

Or use a named volume:

Named volumes are slightly more explicit and can be managed separately from the container lifecycle.

```yaml
# Named volume approach for node_modules
services:
  app:
    volumes:
      - ./:/app
      - node_modules:/app/node_modules  # Named volume persists between restarts

volumes:
  node_modules:  # Declare the named volume
```

### Enable Polling (When Needed)

Some file systems don't properly propagate change events:

When running Docker Desktop on macOS or Windows, file system events often don't propagate correctly from host to container. Polling mode checks for file changes at regular intervals instead.

```yaml
# Node.js - enable polling for file watchers
environment:
  - CHOKIDAR_USEPOLLING=true   # For chokidar-based watchers
  - WATCHPACK_POLLING=true     # For Webpack/Next.js

# Python watchdog - add --polling flag
command: watchmedo auto-restart --directory=./ --pattern=*.py --polling --recursive -- python app.py

# Go Air - enable polling in .air.toml
# In .air.toml build section:
[build]
  poll = true         # Enable polling instead of file system events
  poll_interval = 500 # Check every 500 milliseconds
```

### Docker Desktop Performance Settings

On macOS/Windows, use Docker Desktop's performance settings:

1. Preferences > Resources > File Sharing
2. Add only necessary directories
3. Consider using Docker's `cached` or `delegated` consistency:

These mount consistency options trade off between consistency guarantees and performance. Cached is usually the best choice for source code.

```yaml
# Mount consistency options for better macOS/Windows performance
volumes:
  - ./src:/app/src:cached     # Host authoritative - best for source code
  - ./logs:/app/logs:delegated  # Container authoritative - best for logs/output
```

---

## Complete Examples

### Full-Stack JavaScript

This complete example shows a typical full-stack JavaScript application with a Node.js API, Next.js frontend, and PostgreSQL database, all configured for hot reloading.

```yaml
# docker-compose.yml - Full-stack JavaScript development environment
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api/src:/app/src      # Only mount source, not node_modules
      - /app/node_modules        # Keep node_modules in container
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
      - WATCHPACK_POLLING=true              # Enable polling for Next.js
      - NEXT_PUBLIC_API_URL=http://localhost:3001

  db:
    image: postgres:16
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    volumes:
      - postgres-data:/var/lib/postgresql/data  # Persist database

volumes:
  postgres-data:  # Named volume for database persistence
```

### FastAPI + React

A Python/JavaScript full-stack setup with FastAPI backend and React frontend, both with hot reloading enabled.

```yaml
# FastAPI backend + React frontend development setup
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api:/app    # Mount entire API directory
    ports:
      - "8000:8000"
    command: uvicorn main:app --host 0.0.0.0 --reload  # Enable hot reload

  web:
    build:
      context: ./web
      dockerfile: Dockerfile.dev
    volumes:
      - ./web:/app
      - /app/node_modules   # Exclude node_modules from mount
    ports:
      - "3000:3000"
    environment:
      - CHOKIDAR_USEPOLLING=true  # Enable polling for React dev server
```

### Go Microservices

Multiple Go services sharing a module cache for efficient development of microservice architectures.

```yaml
# Go microservices development environment
services:
  auth:
    build:
      context: ./auth
      dockerfile: Dockerfile.dev
    volumes:
      - ./auth:/app              # Mount auth service source
      - go-mod-cache:/go/pkg/mod # Share module cache across services
    ports:
      - "8081:8080"

  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api:/app
      - go-mod-cache:/go/pkg/mod  # Same cache volume
    ports:
      - "8080:8080"
    depends_on:
      - auth

# Shared Go module cache improves build times across all services
volumes:
  go-mod-cache:
```

---

## Troubleshooting

### Changes Not Detected

These debugging commands help diagnose why file changes might not be triggering restarts.

```bash
# Verify bind mount is working - should see your source files
docker compose exec app ls -la /app/src

# Check file watcher logs for errors or events
docker compose logs -f app

# Try enabling polling if file events aren't working
environment:
  - CHOKIDAR_USEPOLLING=true
```

### Slow Restart

Reduce the number of watched files to speed up restart times. Only watch directories containing code you're actively editing.

```bash
# Reduce watched files in nodemon.json
# nodemon.json
{
  "watch": ["src"],  # Don't watch root - too many files
  "ignore": ["**/*.test.js", "**/*.spec.js", "coverage", "dist"]  # Skip test/build output
}
```

### Out of Memory

Node.js may run out of memory during development with large applications. Increase the heap size limit.

```bash
# Increase Node.js memory limit via nodemon
command: nodemon --max-old-space-size=4096 src/index.js

# Or set via environment variable (applies to all Node processes)
environment:
  - NODE_OPTIONS=--max-old-space-size=4096
```

---

## Quick Reference

Quick installation and usage commands for each language's hot reload tool.

```bash
# Node.js - install and run nodemon
npm install -g nodemon
nodemon src/index.js

# Python - install and run watchdog
pip install watchdog[watchmedo]
watchmedo auto-restart --pattern="*.py" -- python app.py

# Go - install and run Air
go install github.com/air-verse/air@latest
air

# Test if file changes are detected in container
# Create a test file and watch for restart in logs
docker compose exec app sh -c 'echo "test" >> /app/src/test.txt'
# Watch logs for restart

# Force polling mode if file events don't work
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
