# How to Use Heredocs in Containerfiles with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Containerfile

Description: Learn how to use heredoc syntax in Containerfiles with Podman to write inline scripts, configuration files, and multi-line commands more cleanly.

---

> Heredocs in Containerfiles eliminate the need for awkward line continuations and external script files, making your builds cleaner and more readable.

Heredoc (here-document) syntax in Containerfiles lets you write multi-line content inline without chaining commands with `&&` and `\`. This feature is part of modern Dockerfile syntax and is supported by Podman's Buildah backend in current Podman releases. It simplifies writing scripts, configuration files, and complex RUN instructions directly in your Containerfile.

---

## Enabling Heredoc Syntax

For Dockerfile frontend compatibility, add the syntax directive at the top of your Containerfile.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1

FROM alpine:3.19

RUN <<EOF
echo "Hello from a heredoc!"
echo "This is much cleaner than chaining commands."
EOF
OUTER

podman build -t heredoc-demo:latest .
podman run --rm heredoc-demo:latest
```

## Basic RUN Heredoc

Replace complex chained commands with clean multi-line scripts.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM alpine:3.19

# OLD WAY: Hard to read chained commands
# RUN apk add --no-cache curl && \
#     mkdir -p /app && \
#     cd /app && \
#     echo "done"

# NEW WAY: Clean heredoc
RUN <<EOF
apk add --no-cache curl wget
mkdir -p /app/data
mkdir -p /app/config
echo "Setup complete"
EOF

CMD ["echo", "ready"]
OUTER

podman build -t heredoc-basic:latest .
```

## Specifying a Shell

By default, heredocs run with `/bin/sh`. You can specify a different interpreter.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM python:3.12-slim

# Run a Python script inline
RUN python3 <<EOF
import json
import os

config = {
    "app_name": "myapp",
    "version": "1.0.0",
    "debug": False
}

os.makedirs("/app/config", exist_ok=True)
with open("/app/config/settings.json", "w") as f:
    json.dump(config, f, indent=2)

print("Configuration written successfully")
EOF

CMD ["cat", "/app/config/settings.json"]
OUTER

podman build -t heredoc-python:latest .
podman run --rm heredoc-python:latest
```

## Creating Files with COPY Heredocs

Use heredocs with `COPY` to create files inline without needing them in your build context.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM nginx:alpine

# Create an nginx config file inline
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ =404;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Create an HTML file inline
COPY <<EOF /usr/share/nginx/html/index.html
<!DOCTYPE html>
<html>
<head><title>Heredoc Demo</title></head>
<body><h1>Built with heredocs!</h1></body>
</html>
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
OUTER

podman build -t heredoc-nginx:latest .
```

## Multiple Heredocs in Separate RUN Instructions

You can use heredocs to create configuration files in separate RUN instructions.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM alpine:3.19

# Create configuration files using heredocs
RUN mkdir -p /etc/app

RUN <<SCRIPT1 cat > /etc/app/database.conf
host=localhost
port=5432
database=myapp
pool_size=10
SCRIPT1

RUN <<SCRIPT2 cat > /etc/app/cache.conf
host=localhost
port=6379
ttl=3600
SCRIPT2

CMD ["cat", "/etc/app/database.conf"]
OUTER

podman build -t heredoc-multi:latest .
```

## Heredocs with Variable Expansion

Control whether heredoc content is expanded by quoting (or not quoting) the delimiter. In `RUN` scripts, normal shell quoting still controls what the shell expands when it executes the script.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM alpine:3.19

ARG APP_VERSION=2.0.0
ENV APP_NAME=myapp

# Unquoted delimiter: variables ARE expanded
RUN <<EOF
echo "Building version: ${APP_VERSION}"
echo "App name: ${APP_NAME}"
EOF

# Quoted delimiter plus shell quotes: variables are NOT expanded (literal strings)
RUN <<'EOF'
echo 'This prints literal ${APP_VERSION}'
echo 'No variable expansion here'
EOF

CMD ["echo", "done"]
OUTER

podman build --build-arg APP_VERSION=3.0.0 -t heredoc-vars:latest .
podman run --rm heredoc-vars:latest
```

## Writing Shell Scripts Inline

Create executable scripts directly in the Containerfile.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM alpine:3.19

RUN apk add --no-cache bash

# Create an entrypoint script inline
COPY <<'EOF' /usr/local/bin/entrypoint.sh
#!/bin/bash
set -e

echo "Starting application..."
echo "Environment: ${APP_ENV:-production}"
echo "Port: ${APP_PORT:-8080}"

# Wait for dependencies if needed
if [ -n "$WAIT_FOR_HOST" ]; then
    echo "Waiting for $WAIT_FOR_HOST:$WAIT_FOR_PORT..."
    while ! nc -z "$WAIT_FOR_HOST" "$WAIT_FOR_PORT" 2>/dev/null; do
        sleep 1
    done
    echo "Dependency is ready!"
fi

exec "$@"
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["echo", "Application running"]
OUTER

podman build -t heredoc-entrypoint:latest .
podman run --rm -e APP_ENV=staging heredoc-entrypoint:latest
```

## Creating Configuration Templates

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM alpine:3.19

RUN apk add --no-cache gettext

COPY <<'EOF' /etc/app/config.template
{
  "server": {
    "host": "${SERVER_HOST}",
    "port": ${SERVER_PORT}
  },
  "database": {
    "url": "${DATABASE_URL}"
  },
  "logging": {
    "level": "${LOG_LEVEL}"
  }
}
EOF

COPY <<'EOF' /usr/local/bin/configure.sh
#!/bin/sh
envsubst < /etc/app/config.template > /etc/app/config.json
cat /etc/app/config.json
exec "$@"
EOF

RUN chmod +x /usr/local/bin/configure.sh

ENTRYPOINT ["/usr/local/bin/configure.sh"]
CMD ["echo", "configured"]
OUTER

podman build -t heredoc-template:latest .
podman run --rm \
  -e SERVER_HOST=0.0.0.0 \
  -e SERVER_PORT=3000 \
  -e DATABASE_URL=postgres://localhost/db \
  -e LOG_LEVEL=info \
  heredoc-template:latest
```

## Setting File Permissions with COPY Heredoc

Use `--chmod` with `COPY` heredocs.

```bash
cat > Containerfile <<'OUTER'
# syntax=docker/dockerfile:1
FROM alpine:3.19

RUN apk add --no-cache curl

COPY --chmod=755 <<'EOF' /usr/local/bin/healthcheck.sh
#!/bin/sh
curl -sf http://localhost:8080/health || exit 1
EOF

HEALTHCHECK CMD ["/usr/local/bin/healthcheck.sh"]
CMD ["echo", "healthy"]
OUTER
```

## Summary

Heredocs in Containerfiles make your builds more readable and maintainable. Use them for inline scripts with `RUN`, for creating configuration files with `COPY`, and for embedding multi-line content without external files. Use the syntax directive shown above for Dockerfile frontend compatibility, and choose between quoted and unquoted delimiters based on whether you need variable expansion.
