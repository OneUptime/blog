# How to Understand Docker Entrypoint vs CMD (and When to Use Each)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Containers, DevOps, Best Practices

Description: Learn the difference between ENTRYPOINT and CMD in Docker, how they interact, and when to use each for flexible and maintainable container configurations.

---

ENTRYPOINT and CMD are two of the most confusing Dockerfile instructions. They both specify what runs when a container starts, but they serve different purposes and interact in ways that catch many developers off guard. Understanding their relationship is essential for building flexible Docker images.

## The Basic Difference

| Instruction | Purpose | Can Be Overridden |
|------------|---------|-------------------|
| **ENTRYPOINT** | The executable to run | With `--entrypoint` flag |
| **CMD** | Default arguments to the entrypoint | With command after image name |

Think of it this way:
- **ENTRYPOINT** = "This container is a [nginx/python/node]"
- **CMD** = "By default, run with these arguments"

## How They Work Together

When both are specified, CMD provides default arguments to ENTRYPOINT.

```dockerfile
ENTRYPOINT ["python"]
CMD ["app.py"]
```

Container runs: `python app.py`

Override CMD at runtime:
```bash
docker run myimage script.py
# Runs: python script.py
```

Override ENTRYPOINT at runtime:
```bash
docker run --entrypoint bash myimage
# Runs: bash (ignores CMD)
```

## Exec Form vs Shell Form

Both instructions support two syntax forms:

### Exec Form (Preferred)

```dockerfile
ENTRYPOINT ["executable", "param1", "param2"]
CMD ["param1", "param2"]
```

- Runs executable directly (PID 1)
- No shell processing
- Signals (SIGTERM) go directly to process
- Required for proper signal handling

### Shell Form

```dockerfile
ENTRYPOINT executable param1 param2
CMD param1 param2
```

- Wraps in `/bin/sh -c`
- Shell processing (variable expansion, pipes)
- Process runs as child of shell
- Signals may not reach your process

## Common Patterns

### Pattern 1: Executable Image

The container runs a single application. CMD provides default arguments.

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

ENTRYPOINT ["python"]
CMD ["app.py"]
```

Usage:
```bash
# Default: run app.py
docker run myapp

# Run different script
docker run myapp migrate.py

# Interactive Python shell
docker run -it myapp
```

### Pattern 2: Tool Image

The container wraps a command-line tool.

```dockerfile
FROM alpine:3.19
RUN apk add --no-cache curl

ENTRYPOINT ["curl"]
CMD ["--help"]
```

Usage:
```bash
# Show help (default)
docker run mycurl

# Use the tool
docker run mycurl -s https://api.example.com/health
```

### Pattern 3: Service Image with Wrapper Script

Use an entrypoint script to initialize the environment before running the main command.

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY . .
COPY docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
```

```bash
#!/bin/bash
# docker-entrypoint.sh

# Wait for database
until nc -z $DB_HOST 5432; do
  echo "Waiting for database..."
  sleep 1
done

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
  npm run migrate
fi

# Execute the main command
exec "$@"
```

The `exec "$@"` replaces the shell with CMD, ensuring proper signal handling.

Usage:
```bash
# Default: start server
docker run myapp

# Run custom command
docker run myapp npm test

# Override entrypoint for debugging
docker run --entrypoint bash myapp
```

### Pattern 4: CMD Only (Simple Images)

For simple images where you want easy command override.

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y curl vim
CMD ["bash"]
```

Usage:
```bash
# Default: bash shell
docker run -it myimage

# Run any command
docker run myimage curl https://example.com
docker run myimage ls -la
```

### Pattern 5: ENTRYPOINT Only (Fixed Behavior)

When the container should always run one thing.

```dockerfile
FROM alpine:3.19
COPY backup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
```

Usage:
```bash
# Always runs backup.sh
docker run mybackup

# Arguments are passed to script
docker run mybackup --full --verbose
```

## Interaction Matrix

| ENTRYPOINT | CMD | docker run myimage | docker run myimage arg |
|------------|-----|-------------------|----------------------|
| Not set | Not set | Error | `arg` |
| Not set | `["cmd"]` | `cmd` | `arg` |
| `["entry"]` | Not set | `entry` | `entry arg` |
| `["entry"]` | `["cmd"]` | `entry cmd` | `entry arg` |

## Common Mistakes

### Mistake 1: Shell Form Breaks Signals

```dockerfile
# BAD: Process won't receive SIGTERM
ENTRYPOINT node server.js

# GOOD: Process receives signals properly
ENTRYPOINT ["node", "server.js"]
```

### Mistake 2: Missing exec in Entrypoint Script

```bash
#!/bin/bash
# BAD: Server runs as child, won't get signals
/app/setup.sh
node server.js

# GOOD: exec replaces shell with node
/app/setup.sh
exec node server.js
```

### Mistake 3: CMD in Shell Form with ENTRYPOINT

```dockerfile
# BAD: Shell form CMD adds /bin/sh -c
ENTRYPOINT ["python"]
CMD app.py
# Runs: python /bin/sh -c app.py  (error!)

# GOOD: Both in exec form
ENTRYPOINT ["python"]
CMD ["app.py"]
# Runs: python app.py
```

### Mistake 4: Hardcoding Arguments That Should Be Configurable

```dockerfile
# BAD: Port is hardcoded
ENTRYPOINT ["nginx", "-g", "daemon off;", "-p", "80"]

# GOOD: Port can be overridden
ENTRYPOINT ["nginx", "-g", "daemon off;"]
CMD ["-p", "80"]
```

## Real-World Entrypoint Scripts

### Node.js Application

```bash
#!/bin/bash
set -e

# Handle _FILE environment variables (Docker secrets)
file_env() {
    local var="$1"
    local fileVar="${var}_FILE"
    local def="${2:-}"
    if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
        echo "Both $var and $fileVar are set (but are exclusive)"
        exit 1
    fi
    local val="$def"
    if [ "${!var:-}" ]; then
        val="${!var}"
    elif [ "${!fileVar:-}" ]; then
        val="$(< "${!fileVar}")"
    fi
    export "$var"="$val"
    unset "$fileVar"
}

file_env 'DATABASE_URL'
file_env 'API_KEY'

# Run database migrations
if [ "$1" = 'node' ] && [ "$RUN_MIGRATIONS" = 'true' ]; then
    npm run migrate
fi

exec "$@"
```

### Python Application

```bash
#!/bin/bash
set -e

# Activate virtual environment if present
if [ -d "/app/venv" ]; then
    source /app/venv/bin/activate
fi

# Wait for dependencies
if [ -n "$WAIT_FOR_DB" ]; then
    echo "Waiting for database..."
    while ! nc -z ${DB_HOST:-db} ${DB_PORT:-5432}; do
        sleep 1
    done
    echo "Database is available"
fi

# Handle common commands
case "$1" in
    migrate)
        exec python manage.py migrate "${@:2}"
        ;;
    shell)
        exec python manage.py shell "${@:2}"
        ;;
    *)
        exec "$@"
        ;;
esac
```

## Testing ENTRYPOINT and CMD

### Inspect Image Configuration

```bash
# See ENTRYPOINT and CMD
docker inspect myimage --format '{{json .Config.Entrypoint}}'
docker inspect myimage --format '{{json .Config.Cmd}}'

# Or combined
docker inspect myimage --format 'ENTRYPOINT: {{json .Config.Entrypoint}}, CMD: {{json .Config.Cmd}}'
```

### Test Override Behavior

```bash
# Run with default CMD
docker run myimage

# Override CMD
docker run myimage custom-arg

# Override ENTRYPOINT
docker run --entrypoint /bin/bash myimage -c "echo test"

# See what would run
docker run --rm myimage echo "this would be CMD"
```

## Best Practices

1. **Use exec form** for both ENTRYPOINT and CMD
2. **Use entrypoint scripts** for initialization logic
3. **End entrypoint scripts with `exec "$@"`** for proper signal handling
4. **Use ENTRYPOINT for the main executable**, CMD for default arguments
5. **Make CMD sensible defaults** that users commonly want
6. **Allow CMD override** for flexibility
7. **Test signal handling** to ensure graceful shutdown works

## Summary

| Use Case | ENTRYPOINT | CMD |
|----------|-----------|-----|
| Service/application | `["app"]` | `["--default-args"]` |
| Command-line tool | `["tool"]` | `["--help"]` |
| Wrapper script | `["entrypoint.sh"]` | `["default", "command"]` |
| Flexible base image | Not set | `["bash"]` |
| Fixed single-purpose | `["fixed-command"]` | Not set |

ENTRYPOINT defines what your container *is*, CMD defines what it does *by default*. Together they create flexible, reusable images that work well for both interactive use and production deployments.
