# How to Run a Container with an Environment File in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Environment Variable, Configuration

Description: Learn how to use environment files (.env) with Podman containers to manage configuration cleanly and keep secrets out of command lines.

---

> Environment files consolidate container configuration into a single file, keeping your run commands clean and your secrets out of shell history.

When a container needs many environment variables, passing each one with `-e` makes commands unwieldy. Environment files collect all variables in one place, making configurations easier to manage, version, and share. This guide shows you how to use environment files with Podman.

---

## Creating an Environment File

An environment file is a plain text file with one variable per line:

```bash
# Create an environment file

cat > app.env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@db:5432/myapp
REDIS_URL=redis://cache:6379
LOG_LEVEL=info
SESSION_SECRET=my-session-secret
CORS_ORIGIN=https://myapp.com
EOF
```

## Using an Environment File

Pass the file to Podman with the `--env-file` flag:

```bash
# Run a container using the environment file
podman run -d --name api \
    --env-file app.env \
    -p 3000:3000 \
    myapi:latest

# Verify variables are loaded
podman exec api env | sort
```

## Environment File Format

The file format supports several patterns:

```bash
cat > example.env << 'EOF'
# Comments are supported (lines starting with #)
SIMPLE_VALUE=hello

# Quotes are allowed, but they are kept as part of the value
DOUBLE_QUOTED_VALUE="hello world"
SINGLE_QUOTED_VALUE='hello world'

# Empty values
EMPTY_VALUE=

# Values with special characters
URL=https://api.example.com/v1?key=abc&format=json

# Multi-word values without quotes
GREETING=hello world

# No spaces around the equals sign
CORRECT=value
EOF
```

Note that unlike shell scripts, environment files do not expand variables. The literal text is used as the value.

## Multiple Environment Files

You can use multiple environment files:

```bash
# Create a base configuration
cat > base.env << 'EOF'
APP_NAME=myapp
LOG_LEVEL=info
PORT=3000
EOF

# Create environment-specific overrides
cat > production.env << 'EOF'
NODE_ENV=production
DATABASE_URL=postgres://prod-user:secret@prod-db:5432/myapp
REDIS_URL=redis://prod-cache:6379
EOF

# Use both files - later files override earlier ones
podman run -d --name api \
    --env-file base.env \
    --env-file production.env \
    -p 3000:3000 \
    myapi:latest
```

## Combining Environment Files with -e Flags

You can use both `--env-file` and `-e` flags together:

```bash
# File provides base config, -e overrides specific values
podman run -d --name api \
    --env-file app.env \
    -e LOG_LEVEL=debug \
    -e PORT=8080 \
    -p 8080:8080 \
    myapi:latest

# The -e flags take precedence over values in the file
```

## Environment Files for Different Environments

Organize configurations by environment:

```bash
# Directory structure
mkdir -p config
cat > config/development.env << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://dev:devpass@localhost:5432/myapp_dev
LOG_LEVEL=debug
DEBUG=app:*
EOF

cat > config/staging.env << 'EOF'
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgres://staging:stagingpass@staging-db:5432/myapp_staging
LOG_LEVEL=info
EOF

cat > config/production.env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://prod:prodpass@prod-db:5432/myapp
LOG_LEVEL=warn
EOF

# Deploy to different environments
podman run -d --name api-dev --env-file config/development.env -p 3001:3000 myapi
podman run -d --name api-staging --env-file config/staging.env -p 3002:3000 myapi
podman run -d --name api-prod --env-file config/production.env -p 3003:3000 myapi
```

## Common Service Configurations

Ready-to-use environment files for popular services:

```bash
# PostgreSQL
cat > postgres.env << 'EOF'
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_DB=myappdb
PGDATA=/var/lib/postgresql/data/pgdata
EOF

podman run -d --name db --env-file postgres.env -p 5432:5432 postgres:16

# Redis
cat > redis.env << 'EOF'
REDIS_ARGS=--maxmemory 256mb --maxmemory-policy allkeys-lru
EOF

# MySQL
cat > mysql.env << 'EOF'
MYSQL_ROOT_PASSWORD=rootsecret
MYSQL_DATABASE=myapp
MYSQL_USER=myuser
MYSQL_PASSWORD=mypassword
EOF

podman run -d --name mysql --env-file mysql.env -p 3306:3306 mysql:8
```

## Security Best Practices

Keep environment files with secrets secure:

```bash
# Add env files to .gitignore
echo "*.env" >> .gitignore
echo "!example.env" >> .gitignore  # Keep an example template

# Create a template without real secrets
cat > example.env << 'EOF'
# Copy this file to app.env and fill in the values
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:PASSWORD@db:5432/myapp
SESSION_SECRET=CHANGE_ME
API_KEY=CHANGE_ME
EOF

# Set restrictive file permissions
chmod 600 app.env

# Verify the file is not tracked by git
git status app.env
```

## Validating Environment Files

Check your environment file before using it:

```bash
#!/bin/bash
# Validate an environment file

ENV_FILE="${1:?Usage: $0 <env-file>}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: File not found: $ENV_FILE"
    exit 1
fi

echo "Validating: $ENV_FILE"
errors=0

while IFS= read -r line; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

    # Check for valid format
    if ! echo "$line" | grep -q '='; then
        echo "  ERROR: Missing '=' in line: $line"
        errors=$((errors + 1))
    fi
done < "$ENV_FILE"

if [ "$errors" -eq 0 ]; then
    echo "  Valid! $(grep -c '=' "$ENV_FILE") variables found."
else
    echo "  Found $errors error(s)"
    exit 1
fi
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run --env-file app.env <image>` | Use an environment file |
| `podman run --env-file a.env --env-file b.env <image>` | Use multiple files |
| `podman run --env-file app.env -e KEY=val <image>` | File plus overrides |
| `podman exec <name> env` | Verify loaded variables |

## Summary

Environment files are the cleanest way to manage container configuration. Create separate files for different environments, keep secrets out of version control with `.gitignore`, and combine files with `-e` flags for overrides. This approach keeps your `podman run` commands readable, your configurations organized, and your secrets secure.
