# How to Use Heredocs in Dockerfiles for Multi-Line Commands

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Heredoc, BuildKit, Multi-line, DevOps

Description: Learn how to use heredoc syntax in Dockerfiles to write cleaner multi-line scripts and inline configuration files.

---

Heredocs (here documents) in Dockerfiles let you write multi-line strings directly inside RUN, COPY, and other instructions. Before heredocs, writing multi-line shell scripts in Dockerfiles required awkward backslash continuation or separate script files. With heredoc support, you can embed entire scripts and configuration files inline, making Dockerfiles more readable and self-contained.

Heredoc syntax requires BuildKit, which is the default builder in Docker 23.0 and later. This guide covers the syntax, practical use cases, and patterns for getting the most out of heredocs in your Dockerfiles.

## Enabling Heredoc Support

Heredocs require the BuildKit frontend. Add this directive at the very top of your Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1
```

This line tells Docker to use the latest stable Dockerfile frontend, which includes heredoc support. If you are using Docker 23.0 or newer, BuildKit is already the default builder. For older versions, set the environment variable:

```bash
# Enable BuildKit (required for Docker versions before 23.0)
export DOCKER_BUILDKIT=1
```

## Basic Heredoc Syntax in RUN

The traditional way to write multi-line shell commands uses backslash continuation:

```dockerfile
# Traditional approach - backslashes everywhere
RUN apt-get update && \
    apt-get install -y \
      curl \
      git \
      vim && \
    rm -rf /var/lib/apt/lists/* && \
    echo "done"
```

With heredocs, the same instruction becomes much cleaner:

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04

# Heredoc approach - natural shell script
RUN <<EOF
apt-get update
apt-get install -y curl git vim
rm -rf /var/lib/apt/lists/*
echo "done"
EOF
```

The `<<EOF` starts the heredoc, and `EOF` on its own line ends it. Everything between them is treated as a script passed to the shell.

## Heredoc with a Specific Shell

By default, heredocs in RUN use `/bin/sh`. You can specify a different shell:

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04

# Use bash for the heredoc script
RUN <<EOF bash
set -euo pipefail
declare -A config
config[host]="localhost"
config[port]="8080"
echo "Server: ${config[host]}:${config[port]}"
EOF
```

```dockerfile
# Use Python for inline scripts
RUN <<EOF python3
import json
config = {"host": "localhost", "port": 8080}
print(json.dumps(config, indent=2))
EOF
```

This opens up interesting possibilities for running inline scripts in any language without creating separate files.

## Creating Files with COPY and Heredocs

One of the most useful heredoc features is the ability to create files directly in the Dockerfile using COPY:

```dockerfile
# syntax=docker/dockerfile:1
FROM nginx:alpine

# Create an nginx configuration file inline
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
```

This replaces the need for a separate configuration file in your build context. The entire configuration lives inside the Dockerfile.

### Creating Multiple Files

You can create multiple files in a single COPY instruction:

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

# Create multiple files in one instruction
COPY <<requirements.txt <<config.ini /app/
flask==3.0.0
gunicorn==21.2.0
requests==2.31.0
requirements.txt
[app]
debug = false
port = 8000
host = 0.0.0.0
log_level = info
config.ini
```

Each file uses its own delimiter (the filename in this case).

## Creating Script Files

Heredocs are excellent for creating executable scripts:

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

# Create an entrypoint script inline
COPY --chmod=755 <<EOF /app/entrypoint.sh
#!/bin/bash
set -euo pipefail

echo "Starting application..."
echo "Environment: ${APP_ENV:-production}"
echo "Port: ${APP_PORT:-8000}"

# Run database migrations
python manage.py migrate --noinput

# Start the application
exec gunicorn --bind 0.0.0.0:${APP_PORT:-8000} app:application
EOF

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

ENTRYPOINT ["/app/entrypoint.sh"]
```

The `--chmod=755` flag sets the file as executable, which saves you from needing a separate `RUN chmod` instruction.

## Multi-Line RUN with Error Handling

Heredocs make it easy to write proper shell scripts with error handling:

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04

# A proper build script with error handling and logging
RUN <<EOF bash -e
echo "=== Installing system dependencies ==="
apt-get update
apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg

echo "=== Adding Node.js repository ==="
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | \
    tee /etc/apt/sources.list.d/nodesource.list

echo "=== Installing Node.js ==="
apt-get update
apt-get install -y nodejs

echo "=== Cleaning up ==="
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "=== Node.js $(node --version) installed ==="
EOF
```

Compare this to the backslash continuation version, and the readability improvement is obvious.

## Heredocs in Multi-Stage Builds

Heredocs work in any stage of a multi-stage build:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage: create a complex build script
FROM golang:1.22 AS builder

WORKDIR /app
COPY . .

RUN <<EOF
set -e
echo "Building application..."
CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server
echo "Running tests..."
go test ./...
echo "Build complete."
EOF

# Runtime stage: create configuration inline
FROM alpine:3.19

COPY --from=builder /app/server /usr/local/bin/

COPY <<EOF /etc/server/config.yaml
server:
  host: 0.0.0.0
  port: 8080
  read_timeout: 30s
  write_timeout: 30s

logging:
  level: info
  format: json

health:
  endpoint: /healthz
  interval: 10s
EOF

EXPOSE 8080
CMD ["server", "--config", "/etc/server/config.yaml"]
```

## Suppressing Variable Expansion

By default, heredocs in RUN instructions expand shell variables. If you need literal dollar signs (common in nginx configs or cron entries), quote the delimiter:

```dockerfile
# syntax=docker/dockerfile:1
FROM nginx:alpine

# Quoted delimiter prevents variable expansion
COPY <<"EOF" /etc/nginx/conf.d/default.conf
server {
    listen 80;
    location / {
        # $uri and $host are nginx variables, not shell variables
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
```

Without the quotes around `EOF`, the shell would try to expand `$host` and `$proxy_add_x_forwarded_for` as shell variables, resulting in empty strings.

For RUN heredocs, the same quoting works:

```dockerfile
# No expansion - literal dollar signs preserved
RUN <<'EOF'
echo '$HOME is not expanded'
echo 'The cost is $5.00'
EOF

# With expansion - variables are replaced
RUN <<EOF
echo "$HOME will be expanded to the actual home directory"
EOF
```

## Creating Cron Jobs Inline

```dockerfile
# syntax=docker/dockerfile:1
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y cron && rm -rf /var/lib/apt/lists/*

# Create a crontab file inline
COPY <<"EOF" /etc/cron.d/app-cron
# Run cleanup every hour
0 * * * * root /app/cleanup.sh >> /var/log/cleanup.log 2>&1

# Run reports every day at midnight
0 0 * * * root /app/generate-report.sh >> /var/log/reports.log 2>&1

# Health check every 5 minutes
*/5 * * * * root curl -sf http://localhost:8080/health || echo "Health check failed" >> /var/log/health.log
EOF

RUN chmod 0644 /etc/cron.d/app-cron
```

## Docker Compose Configuration Inline

You can even create test configuration files for integration tests:

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

# Create test configuration inline
COPY <<EOF /app/test_config.json
{
  "database": {
    "host": "test-db",
    "port": 5432,
    "name": "testdb",
    "user": "test",
    "password": "test"
  },
  "redis": {
    "host": "test-redis",
    "port": 6379
  },
  "log_level": "debug"
}
EOF

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["pytest", "--config", "/app/test_config.json"]
```

## Limitations and Considerations

**BuildKit required**: Heredocs do not work with the legacy builder. Make sure BuildKit is enabled.

**Not supported in all instructions**: Heredocs work in RUN and COPY. They do not work in CMD, ENTRYPOINT, or ENV.

**Layer implications**: A RUN heredoc still creates a single layer, just like a regular RUN instruction. The heredoc syntax is syntactic sugar; it does not change how layers work.

**Indentation**: The content between the delimiters is taken literally, including leading whitespace. Be careful with indentation.

```dockerfile
# The spaces before each line become part of the file content
COPY <<EOF /app/config.txt
    this line has leading spaces
    so does this one
EOF
```

## Summary

Heredocs bring cleaner multi-line syntax to Dockerfiles. Use them in RUN instructions to write readable shell scripts without backslash continuation, and in COPY instructions to create configuration files inline without maintaining separate files in your build context. Quote the heredoc delimiter when you need to prevent variable expansion. Always include the `# syntax=docker/dockerfile:1` directive at the top of your Dockerfile to ensure heredoc support is available. Heredocs make Dockerfiles more self-contained and easier to understand at a glance.
