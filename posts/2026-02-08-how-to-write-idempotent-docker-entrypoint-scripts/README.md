# How to Write Idempotent Docker Entrypoint Scripts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Entrypoint, Idempotent, Shell Script, Containers, Best Practices, Initialization

Description: Write Docker entrypoint scripts that run safely on every container start without duplicating work or corrupting state.

---

Containers restart. They get killed by OOM, rescheduled by Kubernetes, recreated by Docker Compose, or restarted after a host reboot. Every restart runs your entrypoint script again. If your entrypoint creates a database user, adds a cron job, or modifies a config file, running it twice could create duplicate users, duplicate cron entries, or corrupt the configuration.

Idempotent entrypoint scripts produce the same result whether they run once or a hundred times. Writing them requires checking state before making changes, using conditional logic, and designing operations that are safe to repeat.

## What Does Idempotent Mean?

An operation is idempotent if performing it multiple times has the same effect as performing it once. In the context of Docker entrypoints, this means:

- Creating a directory that might already exist
- Inserting a database record only if it does not exist
- Writing a config file only if it has changed
- Running a migration that tracks which migrations have already been applied

The opposite of idempotent is operations that accumulate: appending to a file, incrementing a counter, or inserting without checking for duplicates.

## Pattern 1: Guard with Flag Files

The simplest approach is to check for a marker file before running one-time initialization:

```bash
#!/bin/bash
set -euo pipefail

INIT_FLAG="/data/.initialized"

# Only run first-time setup if the flag file does not exist
if [ ! -f "$INIT_FLAG" ]; then
    echo "Running first-time initialization..."

    # Create initial database schema
    python manage.py migrate

    # Create the admin user
    python manage.py createsuperuser --noinput \
        --username "$ADMIN_USER" \
        --email "$ADMIN_EMAIL"

    # Import seed data
    python manage.py loaddata initial_data.json

    # Mark initialization as complete
    touch "$INIT_FLAG"
    echo "Initialization complete"
else
    echo "Already initialized, skipping first-time setup"
fi

# Always run migrations on every start (they are idempotent by design)
echo "Running database migrations..."
python manage.py migrate

exec "$@"
```

The flag file lives on a persistent volume, so it survives container restarts. The key distinction: one-time setup (creating the admin user) runs only once, while idempotent operations (migrations) run every time.

## Pattern 2: Conditional Directory and File Creation

Use `mkdir -p` and conditional copies instead of assuming a clean state:

```bash
#!/bin/bash
set -euo pipefail

# mkdir -p is inherently idempotent - it only creates if missing
mkdir -p /data/uploads /data/cache /data/logs

# Copy default config only if no config exists yet
if [ ! -f "/data/config.yml" ]; then
    echo "No configuration found, copying defaults"
    cp /app/config.default.yml /data/config.yml
else
    echo "Existing configuration found, preserving it"
fi

# Set permissions idempotently - chown is safe to repeat
chown -R app:app /data

exec "$@"
```

## Pattern 3: Database Operations with IF NOT EXISTS

When your entrypoint creates database objects, use SQL that checks before acting:

```bash
#!/bin/bash
set -euo pipefail

# Wait for PostgreSQL to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q; do
    echo "Waiting for database..."
    sleep 2
done

# Create the database if it does not exist (idempotent)
create_database() {
    echo "Ensuring database exists..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tc \
        "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | \
        grep -q 1 || \
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c \
        "CREATE DATABASE $DB_NAME"
}

# Create extensions idempotently
create_extensions() {
    echo "Ensuring required extensions exist..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<-SQL
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        CREATE EXTENSION IF NOT EXISTS "hstore";
SQL
}

create_database
create_extensions

exec "$@"
```

The `IF NOT EXISTS` clause in SQL is the database equivalent of `mkdir -p`. It succeeds whether the object exists or not.

## Pattern 4: Configuration File Generation

When generating config files from templates and environment variables, write them fresh each time. This is inherently idempotent because the same inputs always produce the same output:

```bash
#!/bin/bash
set -euo pipefail

# Generate Nginx config from environment variables
# This is idempotent because it overwrites the entire file each time
generate_nginx_config() {
    echo "Generating Nginx configuration..."
    cat > /etc/nginx/conf.d/app.conf <<EOF
server {
    listen ${PORT:-80};
    server_name ${SERVER_NAME:-localhost};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT:-3000};
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
    echo "Nginx configuration generated"
}

generate_nginx_config

# Validate the generated config before starting
nginx -t || {
    echo "ERROR: Generated Nginx configuration is invalid" >&2
    exit 1
}

exec "$@"
```

## Pattern 5: Cron Job Registration

Cron is a common source of duplicate entries. Each container restart appends another copy of the same cron job. The fix: write the entire crontab from scratch.

```bash
#!/bin/bash
set -euo pipefail

# Write the entire crontab fresh each time (replacing, not appending)
setup_cron() {
    echo "Setting up cron jobs..."

    # Write a complete crontab - this replaces any existing entries
    cat > /etc/cron.d/app-jobs <<EOF
# Run cleanup every hour
0 * * * * app /app/scripts/cleanup.sh >> /var/log/cleanup.log 2>&1
# Send daily reports at 6 AM
0 6 * * * app /app/scripts/daily-report.sh >> /var/log/reports.log 2>&1
# Refresh cache every 15 minutes
*/15 * * * * app /app/scripts/refresh-cache.sh >> /var/log/cache.log 2>&1
EOF

    # Set proper permissions
    chmod 0644 /etc/cron.d/app-jobs
    echo "Cron jobs configured"
}

setup_cron
exec "$@"
```

Using `cat >` (overwrite) instead of `cat >>` (append) makes this idempotent.

## Pattern 6: Lock Files for Concurrent Safety

If multiple container instances might run initialization simultaneously (common in Kubernetes), use advisory locking:

```bash
#!/bin/bash
set -euo pipefail

LOCK_FILE="/data/.init.lock"
INIT_FLAG="/data/.initialized"

# Try to acquire an exclusive lock
acquire_lock() {
    exec 200>"$LOCK_FILE"
    if ! flock -n 200; then
        echo "Another instance is running initialization, waiting..."
        flock 200
        echo "Lock acquired"
    fi
}

release_lock() {
    exec 200>&-
    rm -f "$LOCK_FILE"
}

if [ ! -f "$INIT_FLAG" ]; then
    acquire_lock

    # Re-check after acquiring lock (another instance may have finished)
    if [ ! -f "$INIT_FLAG" ]; then
        echo "Running initialization..."
        # Your init logic here
        touch "$INIT_FLAG"
        echo "Initialization complete"
    else
        echo "Another instance completed initialization while we waited"
    fi

    release_lock
fi

exec "$@"
```

This is the double-checked locking pattern applied to shell scripts. The second check after acquiring the lock prevents duplicate initialization when multiple instances race.

## Pattern 7: Version-Aware Initialization

When your application updates, you might need to run upgrade scripts. Track the version alongside the initialization flag:

```bash
#!/bin/bash
set -euo pipefail

CURRENT_VERSION="2.3.0"
VERSION_FILE="/data/.version"

# Get the previously recorded version
if [ -f "$VERSION_FILE" ]; then
    PREVIOUS_VERSION=$(cat "$VERSION_FILE")
else
    PREVIOUS_VERSION="0.0.0"
fi

echo "Previous version: $PREVIOUS_VERSION"
echo "Current version: $CURRENT_VERSION"

# Run version-specific upgrade steps
if [ "$PREVIOUS_VERSION" != "$CURRENT_VERSION" ]; then
    echo "Version change detected, running upgrades..."

    # Example: run upgrade scripts for each version between previous and current
    if [ "$PREVIOUS_VERSION" = "0.0.0" ]; then
        echo "Fresh installation, running initial setup"
        /app/scripts/setup.sh
    fi

    if [ "$PREVIOUS_VERSION" \< "2.0.0" ] && [ "$CURRENT_VERSION" \> "2.0.0" ]; then
        echo "Upgrading to v2.x..."
        /app/scripts/upgrade-v2.sh
    fi

    if [ "$PREVIOUS_VERSION" \< "2.3.0" ] && [ "$CURRENT_VERSION" \> "2.2.0" ]; then
        echo "Upgrading to v2.3..."
        /app/scripts/upgrade-v2.3.sh
    fi

    # Record the new version
    echo "$CURRENT_VERSION" > "$VERSION_FILE"
    echo "Upgrade complete"
else
    echo "No version change, skipping upgrades"
fi

# Always run migrations (they track their own state)
python manage.py migrate

exec "$@"
```

## Anti-Patterns to Avoid

### Appending to Files

```bash
# BAD - creates duplicate entries on every restart
echo "export PATH=/app/bin:\$PATH" >> /etc/profile

# GOOD - write the entire file, not append
echo "export PATH=/app/bin:\$PATH" > /etc/profile.d/app.sh
```

### INSERT Without Checking

```bash
# BAD - creates duplicate rows on every restart
psql -c "INSERT INTO settings (key, value) VALUES ('initialized', 'true')"

# GOOD - upsert pattern
psql -c "INSERT INTO settings (key, value) VALUES ('initialized', 'true') ON CONFLICT (key) DO NOTHING"
```

### Unconditional User Creation

```bash
# BAD - fails on second run because user already exists
useradd appuser

# GOOD - check first or use a flag
id appuser &>/dev/null || useradd appuser
```

## Testing Idempotency

The easiest way to verify your entrypoint is idempotent: run it twice and check for differences.

```bash
# Run the container, stop it, start it again
docker compose up -d
docker compose stop
docker compose start

# Check logs for errors on the second start
docker compose logs app | tail -20

# Verify no duplicate data
docker compose exec db psql -U user -d app -c "SELECT COUNT(*) FROM users WHERE username='admin'"
# Should return 1, not 2
```

## Summary

Writing idempotent entrypoint scripts protects your application from the reality that containers restart frequently. Guard one-time operations with flag files, use `IF NOT EXISTS` for database operations, overwrite files instead of appending, and use locks when multiple instances might initialize simultaneously. Test by running your entrypoint multiple times and verifying the result is identical each time.
