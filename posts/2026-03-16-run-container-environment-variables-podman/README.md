# How to Run a Container with Environment Variables in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Environment Variable, Configuration

Description: Learn how to pass environment variables to Podman containers for application configuration, secrets management, and runtime settings.

---

> Environment variables are the standard way to configure containerized applications without modifying the image.

Environment variables let you pass configuration to containers at runtime. Database connection strings, API keys, feature flags, and runtime settings are all commonly managed through environment variables. This guide covers common methods for passing environment variables to Podman containers.

---

## Passing a Single Environment Variable

Use the `-e` or `--env` flag to set an environment variable:

```bash
# Set a single environment variable

podman run -d --name db \
    -e POSTGRES_PASSWORD=mysecret \
    postgres:16

# Verify the variable is set
podman exec db env | grep POSTGRES
```

## Passing Multiple Environment Variables

Chain multiple `-e` flags for several variables:

```bash
# Set multiple environment variables
podman run -d --name api \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e DATABASE_URL=postgres://user:pass@db:5432/myapp \
    -e REDIS_URL=redis://cache:6379 \
    -e LOG_LEVEL=info \
    -p 3000:3000 \
    myapi:latest
```

## Verifying Environment Variables

Check what variables are set inside a container:

```bash
# List all environment variables
podman exec api env

# Check a specific variable
podman exec api printenv NODE_ENV

# Use inspect to see variables without exec
podman inspect api --format '{{range .Config.Env}}{{println .}}{{end}}'
```

## Passing Host Environment Variables

Pass through environment variables from your host:

```bash
# Set a variable on the host
export API_KEY=abc123

# Pass it to the container (just the name, no value)
podman run -it --rm -e API_KEY alpine printenv API_KEY
# Output: abc123

# Pass multiple host variables
export DB_HOST=localhost
export DB_PORT=5432

podman run -it --rm -e DB_HOST -e DB_PORT alpine env | grep DB_
```

When you use `-e VAR_NAME` without a value, Podman reads the value from the host environment.

## Common Database Configuration

```bash
# PostgreSQL
podman run -d --name postgres \
    -e POSTGRES_USER=myuser \
    -e POSTGRES_PASSWORD=mypassword \
    -e POSTGRES_DB=myappdb \
    -p 5432:5432 \
    postgres:16

# MySQL
podman run -d --name mysql \
    -e MYSQL_ROOT_PASSWORD=rootsecret \
    -e MYSQL_DATABASE=myappdb \
    -e MYSQL_USER=myuser \
    -e MYSQL_PASSWORD=mypassword \
    -p 3306:3306 \
    mysql:8

# MongoDB
podman run -d --name mongo \
    -e MONGO_INITDB_ROOT_USERNAME=admin \
    -e MONGO_INITDB_ROOT_PASSWORD=adminsecret \
    -p 27017:27017 \
    mongo:7
```

## Application Configuration Patterns

```bash
# Node.js application
podman run -d --name node-app \
    -e NODE_ENV=production \
    -e PORT=3000 \
    -e SESSION_SECRET=random-secret-string \
    -e CORS_ORIGIN=https://myapp.com \
    -p 3000:3000 \
    myapp:latest

# Python/Django application
podman run -d --name django-app \
    -e DJANGO_SETTINGS_MODULE=myproject.settings.production \
    -e SECRET_KEY=django-secret-key \
    -e ALLOWED_HOSTS=myapp.com \
    -e DEBUG=false \
    -p 8000:8000 \
    mydjango:latest

# Go application
podman run -d --name go-app \
    -e APP_ENV=production \
    -e APP_PORT=8080 \
    -e APP_LOG_LEVEL=warn \
    -p 8080:8080 \
    mygoapp:latest
```

## Overriding Image Defaults

Many images define or use environment variables that you can set or override:

```bash
# Check default variables in an image
podman image inspect nginx --format '{{range .Config.Env}}{{println .}}{{end}}'

# Set a supported runtime variable for the nginx image
podman run -d --name web \
    -e NGINX_ENTRYPOINT_QUIET_LOGS=1 \
    nginx
```

## Using Variables in Container Commands

Environment variables are available to the container's command:

```bash
# Use environment variable in the command
podman run --rm \
    -e GREETING="Hello World" \
    alpine sh -c 'echo $GREETING'

# JSON configuration via environment variable
podman run --rm \
    -e CONFIG='{"port": 3000, "debug": true}' \
    alpine sh -c 'echo $CONFIG'
```

## Environment Variable Security

Be careful with sensitive values:

```bash
# WARNING: Environment variables are visible in inspect output
podman inspect db --format '{{range .Config.Env}}{{println .}}{{end}}'
# Shows: POSTGRES_PASSWORD=mysecret

# For production secrets, consider:
# 1. Podman secrets
echo "mysecretpassword" | podman secret create db_password -
podman run -d --name db \
    --secret db_password \
    -e POSTGRES_PASSWORD_FILE=/run/secrets/db_password \
    postgres:16

# 2. Environment files (covered in the next guide)
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run -e KEY=VALUE <image>` | Set an environment variable |
| `podman run -e KEY <image>` | Pass host variable to container |
| `podman exec <name> env` | List container's environment |
| `podman inspect <name> --format '{{.Config.Env}}'` | View env via inspect |

## Summary

Environment variables are the primary configuration mechanism for containers. Use the `-e` flag to pass individual variables, chain multiple `-e` flags for comprehensive configuration, and pass host environment variables by name for dynamic values. Be mindful of security - avoid putting sensitive values in command history or inspect-visible configurations. For managing many variables, consider using environment files which are covered in the next guide.
