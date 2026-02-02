# How to Use Vault with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: HashiCorp Vault, Docker, Secrets Management, Security, DevOps, Containers, Infrastructure

Description: Learn how to deploy and configure HashiCorp Vault with Docker for secure secrets management. Covers Vault server setup, secret storage, dynamic secrets, Docker Compose configurations, and production best practices for containerized environments.

---

Managing secrets in containerized applications presents unique challenges. Hardcoding credentials in Docker images creates security vulnerabilities, while environment variables can leak through logs and process inspection. HashiCorp Vault provides a robust solution for centralized secrets management that integrates seamlessly with Docker environments.

## Understanding Vault Architecture

Vault operates as a centralized secrets management system that provides secure storage, dynamic secret generation, and fine-grained access control. When running Vault with Docker, the architecture typically involves a Vault server container communicating with client applications through its REST API or CLI.

```mermaid
flowchart TD
    subgraph Docker Network
        A[Vault Server Container] --> B[(Storage Backend)]
        C[Application Container 1] --> A
        D[Application Container 2] --> A
        E[Application Container 3] --> A
    end

    F[Admin/Operator] --> A
    A --> G[Audit Logs]

    subgraph Secret Engines
        H[KV Secrets]
        I[Database Credentials]
        J[AWS IAM]
        K[PKI Certificates]
    end

    A --> H
    A --> I
    A --> J
    A --> K
```

## Running Vault in Development Mode

Development mode provides a quick way to get started with Vault for testing and learning. Keep in mind that development mode stores everything in memory and should never be used in production.

The following command starts a Vault server in development mode with a predictable root token for easy access.

```bash
# Start Vault in development mode with a fixed root token
# The -dev flag enables development mode with in-memory storage
# The -dev-root-token-id sets a predictable token for testing
docker run --cap-add=IPC_LOCK \
  -d \
  --name vault-dev \
  -p 8200:8200 \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
  -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
  hashicorp/vault:latest
```

After starting the container, verify that Vault is running and accessible.

```bash
# Check container logs to confirm Vault started successfully
docker logs vault-dev

# Set environment variables for the Vault CLI
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='myroot'

# Verify Vault status using the REST API
curl -s http://127.0.0.1:8200/v1/sys/health | jq
```

## Production-Ready Vault with Docker Compose

Production deployments require persistent storage, proper TLS configuration, and a well-defined initialization process. The following Docker Compose setup provides a foundation for running Vault in production-like environments.

```mermaid
flowchart LR
    subgraph Docker Compose Stack
        V[Vault Server] --> C[Consul Backend]
        V --> FS[File Storage Volume]
        V --> TLS[TLS Certificates]
    end

    Client[Client Applications] --> V
    Admin[Administrators] --> V

    V --> Logs[Audit Logs Volume]
```

Create a vault configuration file that defines the storage backend, listener settings, and other server options.

```hcl
# vault-config.hcl
# Vault server configuration for Docker deployment

# Storage backend configuration using the integrated file storage
# For production, consider using Consul, PostgreSQL, or cloud storage
storage "file" {
  path = "/vault/data"
}

# HTTP listener configuration
# In production, always use TLS with proper certificates
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = "false"
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
}

# API address that Vault advertises to clients
api_addr = "https://vault:8200"

# Cluster address for high availability setups
cluster_addr = "https://vault:8201"

# Disable memory locking if running in containers without IPC_LOCK capability
disable_mlock = true

# UI configuration - enable the web interface
ui = true

# Telemetry configuration for monitoring
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}
```

Create the Docker Compose file that orchestrates the Vault container with proper volume mounts and environment settings.

```yaml
# docker-compose.yml
# Production-ready Vault deployment with Docker Compose

version: '3.8'

services:
  vault:
    image: hashicorp/vault:latest
    container_name: vault-server
    restart: unless-stopped

    # Required capability for memory locking (prevents secrets from being swapped to disk)
    cap_add:
      - IPC_LOCK

    # Mount configuration, data, logs, and certificates
    volumes:
      - ./vault-config.hcl:/vault/config/vault.hcl:ro
      - vault-data:/vault/data
      - vault-logs:/vault/logs
      - ./certs:/vault/certs:ro

    # Environment variables for Vault configuration
    environment:
      - VAULT_ADDR=https://127.0.0.1:8200
      - VAULT_API_ADDR=https://vault:8200
      - VAULT_SKIP_VERIFY=false

    # Expose Vault API and cluster ports
    ports:
      - "8200:8200"
      - "8201:8201"

    # Start Vault server with the configuration file
    command: server

    # Health check to monitor Vault availability
    healthcheck:
      test: ["CMD", "vault", "status", "-address=https://127.0.0.1:8200", "-tls-skip-verify"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

    # Network configuration
    networks:
      - vault-network

# Named volumes for persistent storage
volumes:
  vault-data:
    driver: local
  vault-logs:
    driver: local

# Custom network for Vault communication
networks:
  vault-network:
    driver: bridge
```

## Initializing and Unsealing Vault

After starting Vault for the first time, you must initialize it to generate encryption keys and unseal keys. Store these keys securely as they are required to unseal Vault after restarts.

```bash
# Initialize Vault with 5 key shares and a threshold of 3
# Vault will generate 5 unseal keys, and 3 are required to unseal
vault operator init -key-shares=5 -key-threshold=3

# Sample output (store these securely):
# Unseal Key 1: abc123...
# Unseal Key 2: def456...
# Unseal Key 3: ghi789...
# Unseal Key 4: jkl012...
# Unseal Key 5: mno345...
# Initial Root Token: hvs.xxxxxxxxxxxxx
```

The unseal process requires providing enough unseal keys to meet the threshold. Each key holder contributes their key independently.

```bash
# Unseal Vault by providing keys one at a time
# Repeat until the threshold is met (3 keys in this example)
vault operator unseal <unseal-key-1>
vault operator unseal <unseal-key-2>
vault operator unseal <unseal-key-3>

# Verify Vault is unsealed and ready
vault status
```

## Automating Vault Initialization with Scripts

For automated deployments, you can script the initialization and unsealing process. Store unseal keys in a secure location such as AWS KMS, Azure Key Vault, or HashiCorp's auto-unseal feature.

The following script demonstrates automated initialization with proper error handling.

```bash
#!/bin/bash
# init-vault.sh
# Automated Vault initialization script for Docker deployments

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-https://127.0.0.1:8200}"
KEYS_FILE="${KEYS_FILE:-/secure/vault-keys.json}"

# Function to check if Vault is initialized
check_initialized() {
    vault status -format=json 2>/dev/null | jq -r '.initialized'
}

# Function to check if Vault is sealed
check_sealed() {
    vault status -format=json 2>/dev/null | jq -r '.sealed'
}

# Wait for Vault to be ready
echo "Waiting for Vault to be ready..."
until curl -sf "${VAULT_ADDR}/v1/sys/health?standbyok=true&sealedok=true&uninitok=true" > /dev/null; do
    sleep 2
done

# Initialize Vault if not already initialized
if [ "$(check_initialized)" = "false" ]; then
    echo "Initializing Vault..."

    # Initialize and capture the output as JSON
    vault operator init \
        -key-shares=5 \
        -key-threshold=3 \
        -format=json > "${KEYS_FILE}"

    # Set restrictive permissions on the keys file
    chmod 600 "${KEYS_FILE}"

    echo "Vault initialized. Keys stored in ${KEYS_FILE}"
else
    echo "Vault already initialized."
fi

# Unseal Vault if sealed
if [ "$(check_sealed)" = "true" ]; then
    echo "Unsealing Vault..."

    # Extract unseal keys from the stored file
    for i in 0 1 2; do
        KEY=$(jq -r ".unseal_keys_b64[${i}]" "${KEYS_FILE}")
        vault operator unseal "${KEY}" > /dev/null
    done

    echo "Vault unsealed successfully."
else
    echo "Vault already unsealed."
fi

# Display final status
vault status
```

## Storing and Retrieving Secrets

With Vault initialized and unsealed, you can start storing secrets. The KV (Key-Value) secrets engine provides a simple interface for static secrets.

```mermaid
sequenceDiagram
    participant App as Application
    participant Vault as Vault Server
    participant KV as KV Secrets Engine

    App->>Vault: Authenticate (Token/AppRole)
    Vault-->>App: Authentication Success

    App->>Vault: Write Secret (PUT /secret/data/myapp)
    Vault->>KV: Store Encrypted Secret
    KV-->>Vault: Success
    Vault-->>App: Secret Stored

    App->>Vault: Read Secret (GET /secret/data/myapp)
    Vault->>KV: Retrieve Secret
    KV-->>Vault: Encrypted Data
    Vault-->>App: Decrypted Secret
```

Enable the KV secrets engine and store application secrets.

```bash
# Enable the KV version 2 secrets engine at the 'secret' path
vault secrets enable -path=secret kv-v2

# Store database credentials for an application
vault kv put secret/myapp/database \
    username="dbuser" \
    password="supersecretpassword" \
    host="db.example.com" \
    port="5432"

# Store API keys with metadata
vault kv put secret/myapp/api-keys \
    stripe_key="sk_live_xxxxx" \
    sendgrid_key="SG.xxxxx" \
    -metadata=environment="production" \
    -metadata=owner="platform-team"

# Read secrets back
vault kv get secret/myapp/database

# Get secrets in JSON format for programmatic access
vault kv get -format=json secret/myapp/database | jq '.data.data'
```

## Configuring Application Authentication with AppRole

AppRole provides a secure method for applications to authenticate with Vault without hardcoding tokens. Each application receives a unique role ID and secret ID combination.

```bash
# Enable the AppRole authentication method
vault auth enable approle

# Create a policy that grants read access to application secrets
vault policy write myapp-policy - <<EOF
# Allow reading database secrets
path "secret/data/myapp/database" {
  capabilities = ["read"]
}

# Allow reading API keys
path "secret/data/myapp/api-keys" {
  capabilities = ["read"]
}

# Allow renewing own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}
EOF

# Create an AppRole with the policy attached
vault write auth/approle/role/myapp \
    token_policies="myapp-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=24h \
    secret_id_num_uses=0

# Get the role ID (safe to embed in application config)
vault read auth/approle/role/myapp/role-id

# Generate a secret ID (keep this secure, deliver through secure channel)
vault write -f auth/approle/role/myapp/secret-id
```

## Integrating Vault with Docker Applications

Applications running in Docker can authenticate with Vault and retrieve secrets at startup or runtime. The following example demonstrates a Python application that fetches database credentials from Vault.

```python
# app.py
# Python application that retrieves secrets from Vault

import os
import hvac
import psycopg2
from typing import Dict, Any

def get_vault_client() -> hvac.Client:
    """
    Create and authenticate a Vault client using AppRole.
    Returns an authenticated hvac client instance.
    """
    # Read Vault address from environment
    vault_addr = os.environ.get('VAULT_ADDR', 'https://vault:8200')

    # Read AppRole credentials from environment or mounted secrets
    role_id = os.environ.get('VAULT_ROLE_ID')
    secret_id = os.environ.get('VAULT_SECRET_ID')

    # Create Vault client
    client = hvac.Client(url=vault_addr)

    # Authenticate using AppRole
    login_response = client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id
    )

    # Verify authentication succeeded
    if not client.is_authenticated():
        raise Exception("Failed to authenticate with Vault")

    return client

def get_database_credentials(client: hvac.Client) -> Dict[str, Any]:
    """
    Retrieve database credentials from Vault KV store.
    Returns a dictionary with database connection parameters.
    """
    # Read secret from KV v2 engine
    secret_response = client.secrets.kv.v2.read_secret_version(
        path='myapp/database',
        mount_point='secret'
    )

    # Extract the secret data
    return secret_response['data']['data']

def create_database_connection():
    """
    Create a PostgreSQL connection using credentials from Vault.
    Demonstrates the full flow from Vault authentication to database connection.
    """
    # Get authenticated Vault client
    vault_client = get_vault_client()

    # Retrieve database credentials
    db_creds = get_database_credentials(vault_client)

    # Create database connection with retrieved credentials
    connection = psycopg2.connect(
        host=db_creds['host'],
        port=db_creds['port'],
        user=db_creds['username'],
        password=db_creds['password'],
        database='myapp'
    )

    return connection

if __name__ == '__main__':
    # Example usage
    conn = create_database_connection()
    print("Successfully connected to database using Vault credentials")
    conn.close()
```

Create a Dockerfile for the application that includes the Vault integration.

```dockerfile
# Dockerfile
# Python application with Vault integration

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Run the application
CMD ["python", "app.py"]
```

The requirements file specifies the necessary Python packages.

```text
# requirements.txt
hvac>=1.2.0
psycopg2-binary>=2.9.0
```

## Docker Compose with Vault Integration

Combine the Vault server and application into a complete Docker Compose stack.

```yaml
# docker-compose-full.yml
# Complete stack with Vault and application

version: '3.8'

services:
  # Vault server
  vault:
    image: hashicorp/vault:latest
    container_name: vault
    restart: unless-stopped
    cap_add:
      - IPC_LOCK
    volumes:
      - ./vault-config.hcl:/vault/config/vault.hcl:ro
      - vault-data:/vault/data
      - ./certs:/vault/certs:ro
    environment:
      - VAULT_ADDR=https://127.0.0.1:8200
    ports:
      - "8200:8200"
    command: server
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "vault", "status", "-address=https://127.0.0.1:8200", "-tls-skip-verify"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL database
  postgres:
    image: postgres:15
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: dbuser
      POSTGRES_PASSWORD: supersecretpassword
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dbuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Application service
  myapp:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: myapp
    restart: unless-stopped
    environment:
      # Vault configuration
      VAULT_ADDR: https://vault:8200
      VAULT_ROLE_ID: ${VAULT_ROLE_ID}
      VAULT_SECRET_ID: ${VAULT_SECRET_ID}
      VAULT_SKIP_VERIFY: "true"
    depends_on:
      vault:
        condition: service_healthy
      postgres:
        condition: service_healthy
    networks:
      - app-network

volumes:
  vault-data:
  postgres-data:

networks:
  app-network:
    driver: bridge
```

## Dynamic Database Secrets

Vault can generate dynamic database credentials with automatic expiration, reducing the risk of credential compromise. Configure the database secrets engine to create temporary PostgreSQL users.

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/myapp-postgres \
    plugin_name=postgresql-database-plugin \
    allowed_roles="myapp-readonly,myapp-readwrite" \
    connection_url="postgresql://{{username}}:{{password}}@postgres:5432/myapp?sslmode=disable" \
    username="vault_admin" \
    password="vault_admin_password"

# Create a role that generates read-only credentials
vault write database/roles/myapp-readonly \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create a role that generates read-write credentials
vault write database/roles/myapp-readwrite \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Generate dynamic credentials
vault read database/creds/myapp-readonly
```

The dynamic secrets workflow ensures credentials are short-lived and automatically revoked.

```mermaid
sequenceDiagram
    participant App as Application
    participant Vault as Vault Server
    participant DB as PostgreSQL

    App->>Vault: Request database credentials
    Vault->>DB: CREATE ROLE with expiration
    DB-->>Vault: Role created
    Vault-->>App: Temporary username/password

    App->>DB: Connect with temp credentials
    DB-->>App: Connection established

    Note over App,DB: Application uses database

    Vault->>DB: Revoke credentials (on TTL expiry)
    DB-->>Vault: Role dropped
```

## Vault Agent for Automatic Secret Injection

Vault Agent runs as a sidecar container that automatically authenticates with Vault and injects secrets into your application. Configure Vault Agent to render secrets as files that your application can read.

```hcl
# vault-agent-config.hcl
# Configuration for Vault Agent sidecar

# Auto-authentication configuration
auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path   = "/vault/role-id"
      secret_id_file_path = "/vault/secret-id"
      remove_secret_id_file_after_reading = false
    }
  }

  # Cache the token in memory
  sink "file" {
    config = {
      path = "/vault/token"
      mode = 0644
    }
  }
}

# Template configuration to render secrets as files
template {
  source      = "/vault/templates/database.tpl"
  destination = "/vault/secrets/database.env"
  perms       = 0644

  # Execute command when secret changes
  command     = "pkill -HUP myapp || true"
}

template {
  source      = "/vault/templates/api-keys.tpl"
  destination = "/vault/secrets/api-keys.json"
  perms       = 0644
}

# Vault server configuration
vault {
  address = "https://vault:8200"
  tls_skip_verify = false
  ca_cert = "/vault/certs/ca.crt"
}
```

Create template files that define how secrets should be rendered.

```text
# templates/database.tpl
# Template for database environment variables

{{ with secret "secret/data/myapp/database" }}
DATABASE_HOST={{ .Data.data.host }}
DATABASE_PORT={{ .Data.data.port }}
DATABASE_USER={{ .Data.data.username }}
DATABASE_PASSWORD={{ .Data.data.password }}
{{ end }}
```

```text
# templates/api-keys.tpl
# Template for API keys in JSON format

{{ with secret "secret/data/myapp/api-keys" }}
{
  "stripe_key": "{{ .Data.data.stripe_key }}",
  "sendgrid_key": "{{ .Data.data.sendgrid_key }}"
}
{{ end }}
```

Add Vault Agent as a sidecar in your Docker Compose configuration.

```yaml
# docker-compose-agent.yml
# Application with Vault Agent sidecar

version: '3.8'

services:
  # Vault Agent sidecar
  vault-agent:
    image: hashicorp/vault:latest
    container_name: vault-agent
    restart: unless-stopped
    volumes:
      - ./vault-agent-config.hcl:/vault/config/agent.hcl:ro
      - ./templates:/vault/templates:ro
      - ./certs:/vault/certs:ro
      - vault-secrets:/vault/secrets
      - approle-creds:/vault:ro
    command: agent -config=/vault/config/agent.hcl
    networks:
      - app-network
    depends_on:
      - vault

  # Application that reads secrets from shared volume
  myapp:
    image: myapp:latest
    container_name: myapp
    restart: unless-stopped
    volumes:
      # Mount the secrets volume where Vault Agent renders secrets
      - vault-secrets:/app/secrets:ro
    environment:
      # Point application to the rendered secrets file
      ENV_FILE: /app/secrets/database.env
      API_KEYS_FILE: /app/secrets/api-keys.json
    networks:
      - app-network
    depends_on:
      - vault-agent
      - postgres

volumes:
  vault-secrets:
  approle-creds:

networks:
  app-network:
    driver: bridge
```

## Monitoring and Audit Logging

Enable audit logging to track all Vault operations. Audit logs capture every request and response for security compliance and troubleshooting.

```bash
# Enable file-based audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Enable syslog audit device for centralized logging
vault audit enable syslog tag="vault" facility="AUTH"

# List enabled audit devices
vault audit list

# Sample audit log entry format
# {"time":"2024-01-15T10:30:00Z","type":"request","auth":{"token_type":"service"},...}
```

Configure Prometheus metrics for monitoring Vault health and performance.

```yaml
# prometheus.yml
# Prometheus configuration for Vault monitoring

global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'vault'
    metrics_path: '/v1/sys/metrics'
    params:
      format: ['prometheus']
    scheme: https
    tls_config:
      ca_file: /etc/prometheus/certs/ca.crt
    authorization:
      credentials_file: /etc/prometheus/vault-token
    static_configs:
      - targets: ['vault:8200']
```

## Best Practices for Production Deployments

Follow these guidelines when deploying Vault with Docker in production environments.

```mermaid
flowchart TD
    subgraph Security
        A[Enable TLS] --> B[Use Auto-Unseal]
        B --> C[Implement Audit Logging]
        C --> D[Rotate Root Token]
    end

    subgraph High Availability
        E[Deploy Multiple Nodes] --> F[Use Consul Backend]
        F --> G[Configure Health Checks]
        G --> H[Set Up Load Balancer]
    end

    subgraph Operations
        I[Backup Regularly] --> J[Monitor Metrics]
        J --> K[Set Token TTLs]
        K --> L[Review Policies]
    end
```

Key recommendations for production deployments include:

1. **Always enable TLS** - Never run Vault without encryption in production. Generate proper certificates signed by a trusted CA.

2. **Use auto-unseal** - Configure auto-unseal with AWS KMS, Azure Key Vault, or GCP Cloud KMS to eliminate manual unsealing after restarts.

3. **Implement least privilege** - Create specific policies for each application and user. Avoid using root tokens for regular operations.

4. **Enable audit logging** - Configure multiple audit devices to ensure all operations are logged. Forward logs to a centralized logging system.

5. **Set appropriate TTLs** - Configure short token TTLs and lease durations. Applications should renew tokens before expiration.

6. **Regular backups** - Use Vault's snapshot feature to create regular backups of the storage backend.

```bash
# Create a backup snapshot
vault operator raft snapshot save backup.snap

# Restore from backup
vault operator raft snapshot restore backup.snap
```

## Conclusion

HashiCorp Vault provides a comprehensive solution for managing secrets in Docker environments. By centralizing secret storage and implementing dynamic credentials, you can significantly improve the security posture of containerized applications. The combination of AppRole authentication, Vault Agent sidecars, and dynamic database credentials creates a robust secrets management workflow that scales with your infrastructure.

Start with the development mode setup to experiment with Vault features, then transition to a production configuration with proper TLS, persistent storage, and audit logging. Regular rotation of credentials, careful policy management, and comprehensive monitoring ensure your secrets remain secure throughout the application lifecycle.
