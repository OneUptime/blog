# How to Set Up Environment Files for Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Configuration Management, DevOps, Linux

Description: Learn how to configure environment files for systemd services on Ubuntu, separating configuration from service definitions and managing sensitive values securely.

---

Hardcoding environment variables directly into systemd service files creates maintenance headaches - you have to modify the service file every time configuration changes, and you can't easily have different values per environment. Environment files solve this by storing variables in a separate file that the service reads at startup. This keeps sensitive values out of service files, makes configuration changes easier, and lets you version-control service definitions while managing configuration separately.

## How systemd Loads Environment Variables

systemd provides two directives for injecting environment variables into services:

- **`Environment=`** - Sets individual variables directly in the service file
- **`EnvironmentFile=`** - Points to a file containing `KEY=VALUE` pairs

The `EnvironmentFile=` approach is better for real deployments because:
- Configuration lives separate from the service definition
- Sensitive values (passwords, API keys) don't appear in `systemctl show` output when the file is protected
- You can have multiple environment files (base + environment-specific)
- Changes don't require modifying unit files

## Basic Environment File Setup

Create a service that reads from an environment file:

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=myapp
Group=myapp
WorkingDirectory=/opt/myapp

# Load environment from a file
# The '-' prefix means systemd won't fail if the file is missing
EnvironmentFile=-/etc/myapp/environment

# If the file MUST exist (fail if missing, no '-' prefix)
# EnvironmentFile=/etc/myapp/environment

ExecStart=/opt/myapp/bin/myapp
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create the environment file:

```bash
# Create the directory for app configuration
sudo mkdir -p /etc/myapp

# Create the environment file
sudo tee /etc/myapp/environment << 'EOF'
# Application configuration
APP_ENV=production
APP_PORT=8080
APP_LOG_LEVEL=info

# Database connection
DATABASE_URL=postgresql://myapp:secretpassword@localhost:5432/myapp_db
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=5

# Redis cache
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=300

# Application secrets
SECRET_KEY=your-secret-key-here
JWT_SIGNING_KEY=your-jwt-key-here

# External service API keys
STRIPE_SECRET_KEY=sk_live_xxxxx
SENDGRID_API_KEY=SG.xxxxx
EOF

# Restrict permissions - only root can read this file
# Service runs as 'myapp' user, but systemd (root) reads the file and injects vars
sudo chmod 600 /etc/myapp/environment
sudo chown root:root /etc/myapp/environment
```

Reload systemd and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now myapp
sudo systemctl status myapp
```

## Environment File Format

The environment file format is simple but has a few nuances:

```bash
# /etc/myapp/environment - Format rules

# Comment lines start with #
# Blank lines are ignored

# Simple key=value
APP_PORT=8080

# Values with spaces MUST be quoted
APP_NAME="My Application Server"

# Multi-word values in quotes
DATABASE_OPTIONS="sslmode=require connect_timeout=10"

# Do NOT use 'export' - systemd doesn't support it
# WRONG: export DATABASE_URL=postgresql://...
# RIGHT: DATABASE_URL=postgresql://...

# Variable substitution does NOT work in environment files
# WRONG: BASE_URL=https://api.example.com
#        HEALTH_URL=${BASE_URL}/health  <- This won't expand
# Set each variable independently

# Values can contain = signs without quoting (only first = splits key/value)
JDBC_URL=jdbc:postgresql://localhost:5432/myapp?sslmode=require&user=app

# Empty values are valid
OPTIONAL_FEATURE=

# Values with special characters need quoting
PASSWORD="p@ssw0rd!#$%"
```

## Multiple Environment Files

You can specify multiple `EnvironmentFile=` lines. They're loaded in order, with later files overriding earlier ones:

```ini
# /etc/systemd/system/myapp.service (partial)
[Service]
# Load base defaults first
EnvironmentFile=-/etc/myapp/defaults

# Load environment-specific overrides
EnvironmentFile=-/etc/myapp/environment

# Load machine-specific settings last (highest priority)
EnvironmentFile=-/etc/myapp/local.override
```

This pattern is useful for layered configuration:

```bash
# /etc/myapp/defaults - Sensible defaults for all environments
APP_PORT=8080
APP_LOG_LEVEL=info
DATABASE_POOL_SIZE=5
CACHE_TTL=300
MAX_UPLOAD_SIZE=10MB

# /etc/myapp/environment - Environment-specific values
APP_ENV=production
DATABASE_URL=postgresql://myapp:prod-password@db.internal:5432/myapp_prod
REDIS_URL=redis://cache.internal:6379/0
DATABASE_POOL_SIZE=20  # Override default for production

# /etc/myapp/local.override - Machine-specific (not in version control)
# DATACENTER_REGION=us-east-1
# INSTANCE_TYPE=c5.xlarge
```

## Handling Sensitive Values

Environment files are better than embedding secrets in service files, but they still store secrets in plaintext. There are several approaches for more secure secret management:

### Using systemd Credentials (systemd 250+)

For Ubuntu 22.04 and later, systemd credentials provide encrypted secret storage:

```bash
# Set a credential value using systemd-creds
sudo systemd-creds --system encrypt --name=database-password - <<< "your-secret-password"
# This outputs an encrypted blob

# Store the encrypted credential
sudo mkdir -p /etc/credstore
sudo systemd-creds --system encrypt --name=database-password --output=/etc/credstore/database-password - <<< "your-secret-password"
```

```ini
# /etc/systemd/system/myapp.service (partial)
[Service]
# Load the credential - systemd decrypts and makes it available
LoadCredential=database-password:/etc/credstore/database-password

# The credential is available at $CREDENTIALS_DIRECTORY/database-password
ExecStart=/bin/bash -c 'export DATABASE_PASSWORD=$(cat $CREDENTIALS_DIRECTORY/database-password) && exec /opt/myapp/bin/myapp'
```

### Using Environment File with Restricted Permissions

For most cases, a root-owned environment file with 600 permissions is adequate:

```bash
# Create environment file readable only by root (and systemd which runs as root)
sudo touch /etc/myapp/secrets
sudo chmod 600 /etc/myapp/secrets
sudo chown root:root /etc/myapp/secrets

# Edit safely
sudo nano /etc/myapp/secrets
```

### Loading from Vault at Service Start

For HashiCorp Vault integration, use a startup script:

```bash
# /usr/local/bin/myapp-start.sh
#!/bin/bash
set -e

# Authenticate to Vault using the machine's IAM role
VAULT_TOKEN=$(vault login -token-only -method=aws role=myapp)

# Fetch secrets from Vault
export DATABASE_URL=$(vault kv get -field=url -mount=secret myapp/database)
export SECRET_KEY=$(vault kv get -field=value -mount=secret myapp/secret-key)

# Exec the actual application, replacing this script in the process table
exec /opt/myapp/bin/myapp "$@"
```

```ini
# /etc/systemd/system/myapp.service
[Service]
EnvironmentFile=/etc/myapp/environment
ExecStart=/usr/local/bin/myapp-start.sh
```

## Validating Environment Configuration

Check what environment variables a service sees:

```bash
# Show environment variables for a running service
sudo systemctl show myapp.service -p Environment

# Show the full service environment (useful for debugging)
# This reads /proc/<pid>/environ for the service process
sudo cat /proc/$(systemctl show myapp.service -p MainPID --value)/environ | \
  tr '\0' '\n' | sort

# Test an environment file for syntax errors before deploying
sudo systemd-analyze verify /etc/systemd/system/myapp.service
```

## Environment Files for Docker Compose Services

If you use Docker Compose alongside systemd, environment files follow a similar but slightly different format:

```bash
# /opt/myapp/.env - Docker Compose environment file
# Docker supports ${VAR:-default} substitution syntax

COMPOSE_PROJECT_NAME=myapp
IMAGE_TAG=1.2.3

# Database
POSTGRES_DB=myapp
POSTGRES_USER=myapp
POSTGRES_PASSWORD=secretpassword

# App
APP_ENV=production
SECRET_KEY=your-secret-key
```

For services managed by systemd that run Docker Compose:

```ini
# /etc/systemd/system/myapp-compose.service
[Unit]
Description=My App Docker Compose Stack
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/myapp

# Pass variables to docker compose
EnvironmentFile=/etc/myapp/environment
EnvironmentFile=-/etc/myapp/local.override

ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose pull && /usr/bin/docker compose up -d

[Install]
WantedBy=multi-user.target
```

## Rotating Secrets Without Service Restarts

Some configuration changes don't require a service restart. For those that do, minimize downtime:

```bash
# Update the environment file with new credentials
sudo nano /etc/myapp/environment

# Reload the service (reads environment file again on restart)
sudo systemctl restart myapp

# Or for services that support signal-based config reload:
sudo systemctl reload myapp  # Sends SIGHUP without stopping the service
# (only works if the application handles SIGHUP for config reload)
```

For applications that read configuration on startup only (most do), a rolling restart or blue-green deployment minimizes downtime during secret rotation.

Environment files strike a good balance between simplicity and security for most service configurations. They keep secrets out of service unit files and version control while remaining straightforward to manage on Ubuntu systems.
