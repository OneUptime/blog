# How to Configure systemd Service Environment Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Linux, DevOps, Configuration

Description: A practical guide to managing environment variables for systemd services using EnvironmentFile, keeping secrets out of unit files on Ubuntu.

---

Hardcoding configuration values directly into a systemd unit file works until it doesn't. Once you need to deploy across multiple environments, rotate values, or share a unit file without exposing deployment-specific configuration, the `EnvironmentFile` directive becomes essential. It lets you separate configuration from the service definition cleanly.

## How Environment Variables Work in systemd

Every systemd service runs in a clean, minimal environment. It does not inherit the shell environment of whoever started it. Variables you set in your `~/.bashrc` or `/etc/environment` are not automatically available inside a service unless you explicitly pass them in.

There are two ways to set environment variables in a unit file:

**Inline with `Environment=`** - Good for non-sensitive, static values that belong in version control alongside the unit file.

**External file with `EnvironmentFile=`** - Good for deployment-specific values and anything that changes per environment. Environment variables are not ideal for high-value secrets because systemd exposes unit environment data over D-Bus; use systemd credentials for sensitive secrets when available.

## The EnvironmentFile Directive

The syntax is straightforward. In the `[Service]` section of your unit file:

```ini
[Service]
EnvironmentFile=/etc/myapp/environment
```

The referenced file uses a simple key-value format, one variable per line:

```bash
# /etc/myapp/environment

# This file is managed separately from the unit file

DATABASE_URL=postgresql://user:password@localhost:5432/mydb
API_SECRET_KEY=super-secret-key-here
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=info
MAX_WORKERS=4
```

Comments starting with `#` are allowed and ignored. Blank lines are also ignored. Values do not need to be quoted unless they contain spaces, but quoting is harmless.

## Setting Up an Environment File

Create the file with appropriate permissions. For a system service, systemd reads `EnvironmentFile` as the service manager before starting the process, so root-only permissions are sufficient unless the service user also needs to inspect the file directly:

```bash
# Create the directory for app configuration
sudo mkdir -p /etc/myapp

# Create the environment file
sudo nano /etc/myapp/environment

# Restrict permissions - root can read it for systemd,
# and the service group can inspect it if needed
sudo chown root:myapp /etc/myapp/environment
sudo chmod 640 /etc/myapp/environment

# Verify permissions
ls -la /etc/myapp/environment
# Should show: -rw-r----- 1 root myapp ... /etc/myapp/environment
```

## A Complete Unit File Example

Here is a realistic web application unit file using environment files properly:

```ini
# /etc/systemd/system/myapp.service

[Unit]
Description=My Web Application
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=exec
User=myapp
Group=myapp
WorkingDirectory=/opt/myapp

# Static, non-sensitive variables inline
Environment=APP_ENV=production
Environment=PYTHONUNBUFFERED=1
Environment=PORT=8000

# Deployment-specific variables in a file
EnvironmentFile=/etc/myapp/environment

# You can stack multiple environment files
# Later files override earlier ones for duplicate keys
EnvironmentFile=-/etc/myapp/environment.local

ExecStart=/opt/myapp/venv/bin/gunicorn \
    --bind 0.0.0.0:${PORT} \
    --workers ${MAX_WORKERS} \
    myapp.wsgi:application

Restart=on-failure
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

Notice the `-` prefix on the second `EnvironmentFile`. This tells systemd to silently ignore the file if it doesn't exist. Useful for optional override files in development that may not be present in production.

## Variable Expansion and Quoting Rules

The environment file format has some quirks that differ from a standard shell script.

Values are not processed by a shell, so you cannot use command substitution or complex quoting tricks:

```bash
# This works - simple values
DATABASE_HOST=localhost
DATABASE_PORT=5432

# This works - values with spaces need quotes
APP_NAME="My Application Server"

# This does NOT work - no shell expansion
# DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@${DATABASE_HOST}/mydb

# Use literal values instead
DATABASE_URL=postgresql://appuser:secretpass@localhost/mydb
```

However, systemd does support specifier expansion in many unit settings, and `$VARIABLE` or `${VARIABLE}` expansion in service command lines after the environment is loaded:

```ini
[Service]
EnvironmentFile=/etc/myapp/environment
# This refers to the CONFIG_PATH variable from the environment file
ExecStart=/opt/myapp/bin/myapp --config ${CONFIG_PATH}
```

## Managing Multiple Environments

A clean pattern for multi-environment deployments is to use a shared base file plus an environment-specific override:

```bash
# /etc/myapp/environment (base, same across all servers)
LOG_LEVEL=info
MAX_WORKERS=4
APP_NAME=MyApplication

# /etc/myapp/environment.production (production-specific values)
DATABASE_URL=postgresql://prod_user:prod_pass@db-server/prod_db
API_SECRET_KEY=production-secret-key
REDIS_URL=redis://cache-server:6379/0

# /etc/myapp/environment.staging (staging-specific values)
DATABASE_URL=postgresql://staging_user:staging_pass@staging-db/staging_db
API_SECRET_KEY=staging-secret-key
REDIS_URL=redis://localhost:6379/0
```

Then in the unit file on the production server:

```ini
[Service]
EnvironmentFile=/etc/myapp/environment
EnvironmentFile=/etc/myapp/environment.production
```

## Systemd Credentials - A More Secure Alternative

On Ubuntu 22.04 and later, `LoadCredential` provides a more secure way to handle secrets. It places credentials in a read-only per-unit directory, backed by unswappable memory when supported and accessible only to the service user and root:

```ini
[Service]
# Load a secret from a file into a credential
LoadCredential=db-password:/etc/myapp/secrets/db-password

# The service can read it from $CREDENTIALS_DIRECTORY/db-password
ExecStart=/opt/myapp/start.sh
```

Your service then reads the credential file:

```bash
#!/bin/bash
# start.sh - read credentials from systemd credential store
DB_PASSWORD=$(cat "$CREDENTIALS_DIRECTORY/db-password")
export DATABASE_URL="postgresql://user:${DB_PASSWORD}@localhost/mydb"
exec /opt/myapp/venv/bin/gunicorn myapp.wsgi:application
```

## Reloading After Changes

After modifying an environment file, you need to restart the service for changes to take effect. A simple `systemctl reload` is not enough because environment variables are set at process startup:

```bash
# Edit the environment file
sudo nano /etc/myapp/environment

# Restart the service to pick up new values
sudo systemctl restart myapp

# Verify the service started with the new values
systemctl status myapp

# Check what environment variables the service actually sees
# Find the main PID first
sudo systemctl show myapp --property=MainPID

# Then read its environment from /proc
sudo cat /proc/<PID>/environ | tr '\0' '\n' | grep -E "DATABASE|API|LOG_LEVEL"
```

## Debugging Environment Variable Issues

When a service fails because it can't find an expected variable, there are several places to look:

```bash
# See inline environment variables configured on the unit
sudo systemctl show myapp --property=Environment

# Check the journal for startup errors
journalctl -u myapp --since "5 minutes ago"

# Test how systemd parses the environment file
sudo systemd-run --wait --pipe --quiet --uid=myapp \
  --property=EnvironmentFile=/etc/myapp/environment \
  /usr/bin/env
```

One common gotcha: environment file variables are available to `ExecStartPre`, `ExecStart`, `ExecStartPost`, `ExecReload`, and stop commands, but only through systemd's command-line environment expansion and the environment passed to the executed process. They are not shell variables unless you explicitly run a shell or wrapper script.

Using `EnvironmentFile` consistently gives you clean separation between service logic and configuration, makes deployment-specific values easier to manage, and lets you deploy the same unit file to multiple environments with confidence.
