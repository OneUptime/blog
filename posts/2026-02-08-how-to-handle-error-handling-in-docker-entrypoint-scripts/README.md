# How to Handle Error Handling in Docker Entrypoint Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Entrypoint, Shell Script, Error Handling, Bash, Containers, Best Practices

Description: Write robust Docker entrypoint scripts with proper error handling, exit codes, signal trapping, and failure recovery.

---

Docker entrypoint scripts run every time a container starts. They typically handle initialization tasks like waiting for dependencies, running database migrations, setting up configuration files, and then launching the main process. When these scripts lack proper error handling, failures are silent, containers restart in loops, and debugging becomes a nightmare.

Good error handling in entrypoint scripts means catching failures early, providing clear error messages, and ensuring the container exits with the right code so orchestrators like Docker Compose or Kubernetes can respond appropriately.

## The Basics: set -e and Friends

Every entrypoint script should start with strict mode:

```bash
#!/bin/bash
# Enable strict error handling
set -euo pipefail

# -e: Exit immediately if any command fails
# -u: Treat unset variables as errors
# -o pipefail: Return the exit code of the last failed command in a pipeline
```

Without `set -e`, a failing command does not stop the script. The entrypoint continues running with potentially corrupted state.

Without `set -u`, referencing an undefined variable silently expands to an empty string instead of raising an error.

Without `pipefail`, a pipeline like `command_that_fails | grep something` succeeds if `grep` succeeds, even if the first command failed.

## A Minimal Entrypoint Template

```bash
#!/bin/bash
# Docker entrypoint script with error handling
set -euo pipefail

# Log messages with timestamps for easier debugging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Log errors to stderr
error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

log "Starting entrypoint script"

# Your initialization logic here

log "Initialization complete, starting application"
exec "$@"
```

The `exec "$@"` at the end is critical. It replaces the shell process with your application process, ensuring signals reach the application directly. Without `exec`, the shell is PID 1 and your application runs as a child process, which breaks signal handling.

## Handling Specific Failures

### Checking Required Environment Variables

```bash
#!/bin/bash
set -euo pipefail

# Validate required environment variables before proceeding
check_required_vars() {
    local missing=0
    for var in "$@"; do
        if [ -z "${!var:-}" ]; then
            echo "ERROR: Required environment variable $var is not set" >&2
            missing=1
        fi
    done
    if [ "$missing" -eq 1 ]; then
        echo "ERROR: Missing required environment variables. Exiting." >&2
        exit 1
    fi
}

# Check that all database-related variables are set
check_required_vars DATABASE_HOST DATABASE_USER DATABASE_PASSWORD DATABASE_NAME

echo "All required environment variables are present"
exec "$@"
```

### Waiting for Dependencies with Timeouts

```bash
#!/bin/bash
set -euo pipefail

# Wait for a TCP service to become available
wait_for_service() {
    local host=$1
    local port=$2
    local timeout=${3:-30}
    local elapsed=0

    echo "Waiting for $host:$port (timeout: ${timeout}s)..."

    while ! nc -z "$host" "$port" 2>/dev/null; do
        elapsed=$((elapsed + 1))
        if [ "$elapsed" -ge "$timeout" ]; then
            echo "ERROR: Timed out waiting for $host:$port after ${timeout}s" >&2
            exit 1
        fi
        sleep 1
    done

    echo "$host:$port is available (took ${elapsed}s)"
}

# Wait for database and cache before starting
wait_for_service "$DATABASE_HOST" "${DATABASE_PORT:-5432}" 60
wait_for_service "$REDIS_HOST" "${REDIS_PORT:-6379}" 30

exec "$@"
```

### Running Migrations Safely

```bash
#!/bin/bash
set -euo pipefail

# Run database migrations with error handling and retry logic
run_migrations() {
    local max_retries=${MIGRATION_RETRIES:-3}
    local retry_delay=${MIGRATION_RETRY_DELAY:-5}
    local attempt=1

    while [ "$attempt" -le "$max_retries" ]; do
        echo "Running migrations (attempt $attempt of $max_retries)..."

        if python manage.py migrate --noinput 2>&1; then
            echo "Migrations completed successfully"
            return 0
        fi

        echo "Migration attempt $attempt failed" >&2

        if [ "$attempt" -lt "$max_retries" ]; then
            echo "Retrying in ${retry_delay}s..."
            sleep "$retry_delay"
        fi

        attempt=$((attempt + 1))
    done

    echo "ERROR: All migration attempts failed" >&2
    return 1
}

run_migrations
exec "$@"
```

## Signal Handling

Containers receive signals when they are stopped or restarted. Your entrypoint script should handle these signals to allow graceful shutdown.

```bash
#!/bin/bash
set -euo pipefail

# Track background processes for cleanup
CHILD_PID=""

# Handle SIGTERM and SIGINT for graceful shutdown
cleanup() {
    echo "Received shutdown signal"
    if [ -n "$CHILD_PID" ] && kill -0 "$CHILD_PID" 2>/dev/null; then
        echo "Forwarding SIGTERM to application (PID: $CHILD_PID)"
        kill -TERM "$CHILD_PID"
        # Wait for the application to exit gracefully
        wait "$CHILD_PID"
        exit_code=$?
        echo "Application exited with code $exit_code"
        exit "$exit_code"
    fi
    exit 0
}

trap cleanup SIGTERM SIGINT

# Run initialization tasks
echo "Running initialization..."

# Start the application in the background so we can trap signals
"$@" &
CHILD_PID=$!

# Wait for the application to exit
wait "$CHILD_PID"
exit $?
```

This pattern is useful when you need the entrypoint to remain active (for logging, health checks, etc.) while still forwarding signals to the main process.

For most cases, `exec "$@"` is simpler and preferred because it replaces the shell entirely.

## Error Recovery Patterns

### Conditional Initialization

```bash
#!/bin/bash
set -euo pipefail

# Only run initialization if a flag file does not exist
INIT_FLAG="/data/.initialized"

if [ ! -f "$INIT_FLAG" ]; then
    echo "First run detected, performing initialization..."

    # Create required directories
    mkdir -p /data/cache /data/logs /data/uploads

    # Set permissions
    chown -R app:app /data

    # Run first-time setup
    if setup_database; then
        # Mark initialization as complete
        touch "$INIT_FLAG"
        echo "Initialization complete"
    else
        echo "ERROR: Initialization failed" >&2
        exit 1
    fi
else
    echo "Already initialized, skipping setup"
fi

exec "$@"
```

### Fallback Behavior

```bash
#!/bin/bash
set -euo pipefail

# Try to load configuration from a remote source, fall back to defaults
load_config() {
    echo "Attempting to load remote configuration..."

    if curl -sf --max-time 5 "$CONFIG_URL" -o /app/config.json; then
        echo "Remote configuration loaded successfully"
    else
        echo "WARNING: Could not load remote config, using defaults" >&2
        cp /app/config.default.json /app/config.json
    fi
}

load_config
exec "$@"
```

## Exit Codes

Use meaningful exit codes so orchestrators know what happened:

```bash
#!/bin/bash
set -euo pipefail

# Define exit codes for different failure modes
EXIT_MISSING_CONFIG=10
EXIT_DB_CONNECTION=11
EXIT_MIGRATION_FAILED=12
EXIT_PERMISSION_ERROR=13

# Check configuration file exists
if [ ! -f "/app/config.yml" ]; then
    echo "ERROR: Configuration file not found at /app/config.yml" >&2
    exit $EXIT_MISSING_CONFIG
fi

# Check database connectivity
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q; then
    echo "ERROR: Cannot connect to database at $DB_HOST:$DB_PORT" >&2
    exit $EXIT_DB_CONNECTION
fi

# Check write permissions
if [ ! -w "/data" ]; then
    echo "ERROR: /data directory is not writable" >&2
    exit $EXIT_PERMISSION_ERROR
fi

exec "$@"
```

In Kubernetes, you can configure restart policies based on exit codes. Docker Compose's `restart: on-failure` also respects non-zero exit codes.

## Logging Best Practices

```bash
#!/bin/bash
set -euo pipefail

# Log to both stdout and a file for persistence
LOG_FILE="/var/log/entrypoint.log"

log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$message" | tee -a "$LOG_FILE"
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*"
    echo "$message" | tee -a "$LOG_FILE" >&2
}

# Redirect all script output to the log as well
exec > >(tee -a "$LOG_FILE") 2>&1

log "Entrypoint starting"
log "Running as user: $(whoami)"
log "Working directory: $(pwd)"
```

## Testing Entrypoint Scripts

Test your entrypoint outside Docker first:

```bash
# Run the entrypoint script locally with a dummy command
DATABASE_HOST=localhost DATABASE_PORT=5432 bash entrypoint.sh echo "success"

# Test error paths by omitting required variables
bash entrypoint.sh echo "should fail"
# Should exit with an error about missing variables

# Test inside a container
docker run --rm -it myimage bash -c "cat /entrypoint.sh"
docker run --rm -it --entrypoint bash myimage -c "/entrypoint.sh echo test"
```

## Common Mistakes

1. **Forgetting `exec`**: Without `exec "$@"`, your app runs as a child of bash, which prevents proper signal handling.

2. **Not using `set -e`**: Commands fail silently and the script continues with bad state.

3. **Hardcoding paths**: Use environment variables with defaults instead.

4. **Ignoring pipe failures**: `set -o pipefail` catches these.

5. **Using `#!/bin/sh` with bash features**: If your script uses arrays, `[[ ]]`, or `${!var}`, use `#!/bin/bash`.

## Summary

A well-written entrypoint script validates its environment, waits for dependencies, handles errors gracefully, and forwards signals to your application. The combination of `set -euo pipefail`, meaningful exit codes, retry logic, and proper logging makes containers that start reliably, fail clearly, and debug easily. Always end with `exec "$@"` to hand off to the main process cleanly.
