# How to Create Secret Rotation Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Security, Secrets, DevOps, Automation

Description: Implement automated secret rotation for database credentials, API keys, and certificates with zero-downtime strategies.

---

Secrets have a shelf life. Database passwords, API keys, and certificates all become liabilities the longer they exist unchanged. A credential leaked six months ago is still valid if you never rotated it. Secret rotation is not just a compliance checkbox - it limits the blast radius when (not if) credentials get exposed.

## Why Rotate Secrets

Static secrets accumulate risk over time:

| Risk | Impact |
|------|--------|
| Leaked credentials in logs or repos | Attackers gain persistent access |
| Former employees with credentials | Unauthorized access after offboarding |
| Compromised third-party services | Lateral movement into your systems |
| Compliance violations (PCI-DSS, SOC2) | Fines and audit failures |

Rotation reduces the window of exposure. A secret rotated every 24 hours means a leaked credential has at most 24 hours of usefulness to an attacker.

### Rotation Frequency Guidelines

| Secret Type | Recommended Frequency | Rationale |
|-------------|----------------------|-----------|
| Database passwords | 30-90 days | Balance security with operational overhead |
| API keys | 90 days | Depends on third-party provider support |
| Service account tokens | 24 hours (dynamic) | Use short-lived tokens where possible |
| TLS certificates | 90 days (Let's Encrypt default) | Automated renewal handles this well |
| SSH keys | 180 days | Manual rotation still common |
| Encryption keys | 365 days | Key rotation requires re-encryption |

## The Dual-Credential Rotation Pattern

The biggest challenge with secret rotation is avoiding downtime. You cannot simply change a database password while applications are connected - they will immediately fail authentication.

The dual-credential pattern solves this by maintaining two valid credentials during rotation:

```
Phase 1: Old credential active
  [App] --> [Old Password] --> [Database]

Phase 2: Create new credential (both valid)
  [App] --> [Old Password] --> [Database]
            [New Password] --> [Database]

Phase 3: Update application to use new credential
  [App] --> [New Password] --> [Database]
            [Old Password] --> [Database] (still valid)

Phase 4: Deactivate old credential
  [App] --> [New Password] --> [Database]
            [Old Password] -X- [Database] (invalid)
```

This pattern works for any credential type: database users, API keys, certificates, and service accounts.

### Implementation Considerations

The dual-credential approach requires:

1. Your system must support multiple valid credentials simultaneously
2. Applications must be able to reload credentials without restart
3. A coordination mechanism to sequence the rotation steps
4. Rollback capability if the new credential fails

## Database Credential Rotation

### PostgreSQL Dual-User Rotation

PostgreSQL supports multiple users per database, making dual-credential rotation straightforward. This script creates a new user, grants permissions, and removes the old user after applications switch over.

`rotate-postgres-user.sh`

```bash
#!/bin/bash
# PostgreSQL credential rotation using dual-user pattern
# Requires: psql client, jq, base64

set -euo pipefail

# Configuration - override via environment variables
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-myapp}"
DB_ADMIN_USER="${DB_ADMIN_USER:-postgres}"
PGPASSWORD="${DB_ADMIN_PASSWORD}"
export PGPASSWORD

# Generate cryptographically secure password (32 chars, alphanumeric)
generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# Get current active user from secret store (example uses file, replace with Vault/AWS SM)
get_current_user() {
    local current_slot
    current_slot=$(cat /var/secrets/db-active-slot 2>/dev/null || echo "a")
    echo "app_user_${current_slot}"
}

# Determine next user slot (alternates between a and b)
get_next_slot() {
    local current_slot
    current_slot=$(cat /var/secrets/db-active-slot 2>/dev/null || echo "a")
    if [[ "$current_slot" == "a" ]]; then
        echo "b"
    else
        echo "a"
    fi
}

# Create or update database user with new password
create_or_update_user() {
    local username=$1
    local password=$2

    echo "Creating/updating user: $username"

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" <<EOF
-- Create user if not exists, update password if exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${username}') THEN
        CREATE ROLE ${username} WITH LOGIN PASSWORD '${password}';
    ELSE
        ALTER ROLE ${username} WITH PASSWORD '${password}';
    END IF;
END
\$\$;

-- Grant necessary permissions
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${username};
GRANT USAGE ON SCHEMA public TO ${username};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${username};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${username};

-- Ensure future tables get same permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${username};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO ${username};
EOF
}

# Validate new credentials work
validate_credentials() {
    local username=$1
    local password=$2

    echo "Validating credentials for: $username"

    PGPASSWORD="$password" psql -h "$DB_HOST" -p "$DB_PORT" \
        -U "$username" -d "$DB_NAME" \
        -c "SELECT 1" > /dev/null 2>&1
}

# Store credentials in secret backend (replace with your secret store)
store_credentials() {
    local username=$1
    local password=$2
    local slot=$3

    echo "Storing credentials for slot: $slot"

    # Example: Store in Kubernetes secret (replace with Vault, AWS SM, etc.)
    kubectl create secret generic "db-credentials-${slot}" \
        --from-literal="username=${username}" \
        --from-literal="password=${password}" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Update active slot marker
    echo "$slot" > /var/secrets/db-active-slot
}

# Disable old user after grace period
disable_old_user() {
    local username=$1

    echo "Disabling old user: $username"

    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_ADMIN_USER" -d "$DB_NAME" <<EOF
-- Revoke login, keep user for audit trail
ALTER ROLE ${username} WITH NOLOGIN;
EOF
}

# Main rotation logic
main() {
    local current_user
    local next_slot
    local next_user
    local new_password

    current_user=$(get_current_user)
    next_slot=$(get_next_slot)
    next_user="app_user_${next_slot}"
    new_password=$(generate_password)

    echo "=== PostgreSQL Credential Rotation ==="
    echo "Current user: $current_user"
    echo "New user: $next_user"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

    # Step 1: Create new user with new password
    create_or_update_user "$next_user" "$new_password"

    # Step 2: Validate new credentials
    if ! validate_credentials "$next_user" "$new_password"; then
        echo "ERROR: New credentials failed validation"
        exit 1
    fi

    # Step 3: Store new credentials in secret backend
    store_credentials "$next_user" "$new_password" "$next_slot"

    echo "=== Rotation Phase 1 Complete ==="
    echo "New credentials stored. Applications should now reload credentials."
    echo "Run with --finalize after applications have switched to disable old user."

    # Optional: If --finalize flag passed, disable old user
    if [[ "${1:-}" == "--finalize" ]]; then
        echo "Finalizing rotation - disabling old user"
        sleep 60  # Grace period for applications to switch
        disable_old_user "$current_user"
        echo "=== Rotation Complete ==="
    fi
}

main "$@"
```

### MySQL Dual-User Rotation

MySQL rotation follows the same pattern but uses MySQL-specific syntax.

`rotate-mysql-user.sh`

```bash
#!/bin/bash
# MySQL credential rotation using dual-user pattern

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-myapp}"
DB_ADMIN_USER="${DB_ADMIN_USER:-root}"
MYSQL_PWD="${DB_ADMIN_PASSWORD}"
export MYSQL_PWD

generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

get_next_slot() {
    local current_slot
    current_slot=$(cat /var/secrets/mysql-active-slot 2>/dev/null || echo "a")
    [[ "$current_slot" == "a" ]] && echo "b" || echo "a"
}

create_mysql_user() {
    local username=$1
    local password=$2
    local host_pattern=$3  # Usually '%' or specific IP range

    echo "Creating/updating MySQL user: $username@$host_pattern"

    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_ADMIN_USER" "$DB_NAME" <<EOF
-- Create user if not exists
CREATE USER IF NOT EXISTS '${username}'@'${host_pattern}'
    IDENTIFIED BY '${password}';

-- Update password if user exists
ALTER USER '${username}'@'${host_pattern}'
    IDENTIFIED BY '${password}';

-- Grant application permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ${DB_NAME}.*
    TO '${username}'@'${host_pattern}';

FLUSH PRIVILEGES;
EOF
}

validate_mysql_credentials() {
    local username=$1
    local password=$2

    MYSQL_PWD="$password" mysql -h "$DB_HOST" -P "$DB_PORT" \
        -u "$username" "$DB_NAME" \
        -e "SELECT 1" > /dev/null 2>&1
}

main() {
    local next_slot
    local next_user
    local new_password

    next_slot=$(get_next_slot)
    next_user="app_user_${next_slot}"
    new_password=$(generate_password)

    echo "=== MySQL Credential Rotation ==="
    echo "New user: $next_user"

    create_mysql_user "$next_user" "$new_password" "%"

    if validate_mysql_credentials "$next_user" "$new_password"; then
        echo "Credentials validated successfully"
        # Store in your secret backend here
        echo "$next_slot" > /var/secrets/mysql-active-slot
    else
        echo "ERROR: Credential validation failed"
        exit 1
    fi
}

main "$@"
```

### Application-Side Credential Reload

Applications must reload credentials without restart. Here is a Node.js example that watches for credential changes.

`db-connection-manager.js`

```javascript
// Database connection manager with credential hot-reload
// Works with Kubernetes secrets mounted as files or environment reloads

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseConnectionManager {
    constructor(options = {}) {
        // Path to mounted secret directory (Kubernetes secrets mount)
        this.secretPath = options.secretPath || '/var/secrets/db';
        this.checkInterval = options.checkInterval || 30000; // 30 seconds

        this.pool = null;
        this.currentCredentials = null;
        this.watcher = null;
    }

    // Read credentials from secret mount
    readCredentials() {
        try {
            const username = fs.readFileSync(
                path.join(this.secretPath, 'username'),
                'utf8'
            ).trim();

            const password = fs.readFileSync(
                path.join(this.secretPath, 'password'),
                'utf8'
            ).trim();

            const host = fs.readFileSync(
                path.join(this.secretPath, 'host'),
                'utf8'
            ).trim();

            const database = fs.readFileSync(
                path.join(this.secretPath, 'database'),
                'utf8'
            ).trim();

            return { username, password, host, database };
        } catch (error) {
            console.error('Failed to read credentials:', error.message);
            return null;
        }
    }

    // Check if credentials have changed
    credentialsChanged(newCreds) {
        if (!this.currentCredentials) return true;

        return (
            this.currentCredentials.username !== newCreds.username ||
            this.currentCredentials.password !== newCreds.password ||
            this.currentCredentials.host !== newCreds.host ||
            this.currentCredentials.database !== newCreds.database
        );
    }

    // Create new connection pool
    createPool(credentials) {
        return new Pool({
            host: credentials.host,
            database: credentials.database,
            user: credentials.username,
            password: credentials.password,
            port: 5432,

            // Connection pool settings for graceful rotation
            max: 20,                    // Maximum connections
            idleTimeoutMillis: 30000,   // Close idle connections after 30s
            connectionTimeoutMillis: 5000,
        });
    }

    // Initialize connection and start watching for changes
    async initialize() {
        const credentials = this.readCredentials();

        if (!credentials) {
            throw new Error('Cannot read initial credentials');
        }

        this.pool = this.createPool(credentials);
        this.currentCredentials = credentials;

        // Validate connection works
        await this.pool.query('SELECT 1');
        console.log('Database connection established');

        // Start watching for credential changes
        this.startCredentialWatch();

        return this.pool;
    }

    // Watch for credential file changes
    startCredentialWatch() {
        // Use polling since fs.watch is unreliable with mounted secrets
        this.watcher = setInterval(async () => {
            const newCredentials = this.readCredentials();

            if (newCredentials && this.credentialsChanged(newCredentials)) {
                console.log('Credential change detected, rotating connection pool');
                await this.rotatePool(newCredentials);
            }
        }, this.checkInterval);
    }

    // Rotate to new connection pool
    async rotatePool(newCredentials) {
        const oldPool = this.pool;

        try {
            // Create new pool with new credentials
            const newPool = this.createPool(newCredentials);

            // Validate new pool works
            await newPool.query('SELECT 1');

            // Swap pools atomically
            this.pool = newPool;
            this.currentCredentials = newCredentials;

            console.log('Connection pool rotated successfully');

            // Drain old pool gracefully (allow existing queries to complete)
            setTimeout(async () => {
                try {
                    await oldPool.end();
                    console.log('Old connection pool closed');
                } catch (error) {
                    console.error('Error closing old pool:', error.message);
                }
            }, 10000); // 10 second grace period

        } catch (error) {
            console.error('Failed to rotate pool, keeping existing:', error.message);
            // Keep using old pool if new credentials fail
        }
    }

    // Get current pool for queries
    getPool() {
        return this.pool;
    }

    // Graceful shutdown
    async shutdown() {
        if (this.watcher) {
            clearInterval(this.watcher);
        }

        if (this.pool) {
            await this.pool.end();
        }
    }
}

module.exports = DatabaseConnectionManager;
```

Usage in your application:

```javascript
// app.js
const DatabaseConnectionManager = require('./db-connection-manager');

const dbManager = new DatabaseConnectionManager({
    secretPath: '/var/run/secrets/db-credentials',
    checkInterval: 30000
});

async function main() {
    await dbManager.initialize();

    // Use the pool for queries
    const pool = dbManager.getPool();
    const result = await pool.query('SELECT * FROM users LIMIT 10');

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', async () => {
        console.log('Shutting down gracefully');
        await dbManager.shutdown();
        process.exit(0);
    });
}

main().catch(console.error);
```

## API Key Rotation

API keys for third-party services follow the same dual-credential pattern, but the implementation depends on the provider's API.

### Generic API Key Rotation Framework

This Python script provides a framework for rotating API keys across different providers.

`api_key_rotator.py`

```python
#!/usr/bin/env python3
"""
API Key Rotation Framework
Supports multiple providers through a plugin architecture
"""

import os
import json
import logging
import hashlib
import secrets
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional, Dict, Any

import requests
import boto3

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SecretStore(ABC):
    """Abstract base class for secret storage backends"""

    @abstractmethod
    def get_secret(self, key: str) -> Optional[str]:
        pass

    @abstractmethod
    def set_secret(self, key: str, value: str) -> None:
        pass

    @abstractmethod
    def delete_secret(self, key: str) -> None:
        pass


class AWSSecretsManagerStore(SecretStore):
    """AWS Secrets Manager implementation"""

    def __init__(self, region: str = "us-east-1"):
        self.client = boto3.client('secretsmanager', region_name=region)

    def get_secret(self, key: str) -> Optional[str]:
        try:
            response = self.client.get_secret_value(SecretId=key)
            return response['SecretString']
        except self.client.exceptions.ResourceNotFoundException:
            return None

    def set_secret(self, key: str, value: str) -> None:
        try:
            self.client.update_secret(SecretId=key, SecretString=value)
        except self.client.exceptions.ResourceNotFoundException:
            self.client.create_secret(Name=key, SecretString=value)

    def delete_secret(self, key: str) -> None:
        self.client.delete_secret(
            SecretId=key,
            ForceDeleteWithoutRecovery=True
        )


class APIKeyProvider(ABC):
    """Abstract base class for API key providers"""

    @abstractmethod
    def create_key(self, name: str) -> Dict[str, str]:
        """Create a new API key, returns dict with key_id and secret"""
        pass

    @abstractmethod
    def validate_key(self, key_id: str, secret: str) -> bool:
        """Validate that a key works"""
        pass

    @abstractmethod
    def revoke_key(self, key_id: str) -> None:
        """Revoke/delete an API key"""
        pass


class StripeAPIKeyProvider(APIKeyProvider):
    """Stripe API key rotation - uses restricted keys"""

    def __init__(self, admin_key: str):
        self.admin_key = admin_key
        self.base_url = "https://api.stripe.com/v1"

    def create_key(self, name: str) -> Dict[str, str]:
        # Create a restricted API key with specific permissions
        response = requests.post(
            f"{self.base_url}/api_keys",
            auth=(self.admin_key, ''),
            data={
                "name": f"{name}-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
                "permissions[payments]": "read",
                "permissions[customers]": "write",
            }
        )
        response.raise_for_status()
        data = response.json()

        return {
            "key_id": data["id"],
            "secret": data["secret"]
        }

    def validate_key(self, key_id: str, secret: str) -> bool:
        try:
            response = requests.get(
                f"{self.base_url}/balance",
                auth=(secret, '')
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def revoke_key(self, key_id: str) -> None:
        response = requests.delete(
            f"{self.base_url}/api_keys/{key_id}",
            auth=(self.admin_key, '')
        )
        response.raise_for_status()


class SendGridAPIKeyProvider(APIKeyProvider):
    """SendGrid API key rotation"""

    def __init__(self, admin_key: str):
        self.admin_key = admin_key
        self.base_url = "https://api.sendgrid.com/v3"

    def create_key(self, name: str) -> Dict[str, str]:
        response = requests.post(
            f"{self.base_url}/api_keys",
            headers={
                "Authorization": f"Bearer {self.admin_key}",
                "Content-Type": "application/json"
            },
            json={
                "name": f"{name}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                "scopes": ["mail.send", "sender_verification_eligible"]
            }
        )
        response.raise_for_status()
        data = response.json()

        return {
            "key_id": data["api_key_id"],
            "secret": data["api_key"]
        }

    def validate_key(self, key_id: str, secret: str) -> bool:
        try:
            response = requests.get(
                f"{self.base_url}/user/profile",
                headers={"Authorization": f"Bearer {secret}"}
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def revoke_key(self, key_id: str) -> None:
        response = requests.delete(
            f"{self.base_url}/api_keys/{key_id}",
            headers={"Authorization": f"Bearer {self.admin_key}"}
        )
        response.raise_for_status()


class APIKeyRotator:
    """
    Orchestrates API key rotation using dual-credential pattern
    """

    def __init__(
        self,
        provider: APIKeyProvider,
        secret_store: SecretStore,
        service_name: str
    ):
        self.provider = provider
        self.secret_store = secret_store
        self.service_name = service_name

    def _get_secret_key(self, slot: str) -> str:
        return f"{self.service_name}/api-key/{slot}"

    def _get_active_slot_key(self) -> str:
        return f"{self.service_name}/active-slot"

    def get_active_slot(self) -> str:
        slot = self.secret_store.get_secret(self._get_active_slot_key())
        return slot if slot in ("a", "b") else "a"

    def get_inactive_slot(self) -> str:
        return "b" if self.get_active_slot() == "a" else "a"

    def rotate(self, finalize: bool = False) -> Dict[str, Any]:
        """
        Perform API key rotation

        Args:
            finalize: If True, revoke old key after creating new one

        Returns:
            Dict with rotation status and details
        """
        current_slot = self.get_active_slot()
        new_slot = self.get_inactive_slot()

        logger.info(f"Starting rotation: {current_slot} -> {new_slot}")

        # Step 1: Create new API key
        new_key = self.provider.create_key(f"{self.service_name}-{new_slot}")
        logger.info(f"Created new key: {new_key['key_id']}")

        # Step 2: Validate new key works
        if not self.provider.validate_key(new_key["key_id"], new_key["secret"]):
            raise RuntimeError("New API key failed validation")
        logger.info("New key validated successfully")

        # Step 3: Store new key in secret store
        self.secret_store.set_secret(
            self._get_secret_key(new_slot),
            json.dumps({
                "key_id": new_key["key_id"],
                "secret": new_key["secret"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        )

        # Step 4: Update active slot
        self.secret_store.set_secret(self._get_active_slot_key(), new_slot)
        logger.info(f"Active slot updated to: {new_slot}")

        result = {
            "status": "rotated",
            "new_slot": new_slot,
            "new_key_id": new_key["key_id"],
            "old_slot": current_slot
        }

        # Step 5: Optionally revoke old key
        if finalize:
            old_key_data = self.secret_store.get_secret(
                self._get_secret_key(current_slot)
            )
            if old_key_data:
                old_key = json.loads(old_key_data)
                try:
                    self.provider.revoke_key(old_key["key_id"])
                    logger.info(f"Revoked old key: {old_key['key_id']}")
                    result["old_key_revoked"] = True
                except Exception as e:
                    logger.warning(f"Failed to revoke old key: {e}")
                    result["old_key_revoked"] = False

        return result


def main():
    # Example usage with SendGrid
    secret_store = AWSSecretsManagerStore(region="us-east-1")

    sendgrid_provider = SendGridAPIKeyProvider(
        admin_key=os.environ["SENDGRID_ADMIN_KEY"]
    )

    rotator = APIKeyRotator(
        provider=sendgrid_provider,
        secret_store=secret_store,
        service_name="email-service"
    )

    # Perform rotation
    result = rotator.rotate(finalize=True)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
```

## Certificate Rotation

TLS certificates require careful rotation to avoid service disruption. The approach differs for server certificates versus client certificates.

### Server Certificate Rotation with cert-manager

cert-manager automates certificate issuance and renewal in Kubernetes. This is the preferred approach for managing TLS certificates.

`certificate.yaml`

```yaml
# Install cert-manager first: kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # Let's Encrypt production server
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@example.com

    # Secret to store the ACME account private key
    privateKeySecretRef:
      name: letsencrypt-prod-account-key

    # HTTP01 challenge solver using ingress
    solvers:
      - http01:
          ingress:
            class: nginx
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
  namespace: production
spec:
  # Secret where cert will be stored (used by Ingress)
  secretName: api-tls-secret

  # Certificate validity and renewal settings
  duration: 2160h      # 90 days
  renewBefore: 360h    # Renew 15 days before expiry

  # Subject information
  commonName: api.example.com
  dnsNames:
    - api.example.com
    - www.api.example.com

  # Reference to the ClusterIssuer
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
    group: cert-manager.io

  # Private key settings
  privateKey:
    algorithm: ECDSA
    size: 256
    rotationPolicy: Always  # Generate new key on each renewal
```

### Monitoring Certificate Expiration

Set up alerts for certificates approaching expiration.

`cert-expiry-check.sh`

```bash
#!/bin/bash
# Check certificate expiration and alert if within threshold
# Run via cron: 0 9 * * * /opt/scripts/cert-expiry-check.sh

set -euo pipefail

ALERT_DAYS=${ALERT_DAYS:-14}
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

check_cert_expiry() {
    local host=$1
    local port=${2:-443}
    local name=${3:-$host}

    # Get certificate expiration date
    expiry_date=$(echo | openssl s_client -servername "$host" \
        -connect "${host}:${port}" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | \
        cut -d= -f2)

    if [[ -z "$expiry_date" ]]; then
        echo "ERROR: Could not retrieve certificate for $host:$port"
        return 1
    fi

    # Calculate days until expiration
    expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || \
                   date -j -f "%b %d %T %Y %Z" "$expiry_date" +%s)
    current_epoch=$(date +%s)
    days_remaining=$(( (expiry_epoch - current_epoch) / 86400 ))

    echo "$name: $days_remaining days until expiration ($expiry_date)"

    # Alert if within threshold
    if [[ $days_remaining -le $ALERT_DAYS ]]; then
        alert_cert_expiry "$name" "$days_remaining" "$expiry_date"
    fi
}

alert_cert_expiry() {
    local name=$1
    local days=$2
    local expiry_date=$3

    local message="Certificate expiring soon: $name has $days days remaining (expires: $expiry_date)"

    echo "ALERT: $message"

    # Send Slack notification if webhook configured
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-type: application/json' \
            -d "{\"text\": \"$message\"}"
    fi
}

# Check certificates for all services
echo "=== Certificate Expiration Check $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

check_cert_expiry "api.example.com" 443 "Production API"
check_cert_expiry "app.example.com" 443 "Production App"
check_cert_expiry "internal.example.com" 443 "Internal Services"

echo "=== Check Complete ==="
```

### Client Certificate Rotation

For mTLS (mutual TLS), client certificates also need rotation. This script generates and distributes client certificates.

`rotate-client-cert.sh`

```bash
#!/bin/bash
# Client certificate rotation for mTLS
# Generates new client cert, validates against server, then distributes

set -euo pipefail

CA_CERT="${CA_CERT:-/etc/pki/ca/ca.crt}"
CA_KEY="${CA_KEY:-/etc/pki/ca/ca.key}"
CERT_DIR="${CERT_DIR:-/etc/pki/client}"
SERVICE_NAME="${SERVICE_NAME:-api-client}"
VALID_DAYS="${VALID_DAYS:-90}"

generate_client_cert() {
    local service_name=$1
    local output_dir=$2
    local valid_days=$3

    echo "Generating client certificate for: $service_name"

    # Generate private key (ECDSA P-256)
    openssl ecparam -genkey -name prime256v1 -noout \
        -out "${output_dir}/${service_name}.key"

    # Set restrictive permissions on private key
    chmod 600 "${output_dir}/${service_name}.key"

    # Generate certificate signing request
    openssl req -new \
        -key "${output_dir}/${service_name}.key" \
        -out "${output_dir}/${service_name}.csr" \
        -subj "/CN=${service_name}/O=MyOrg/OU=Services"

    # Create certificate extension config for client auth
    cat > "${output_dir}/extensions.cnf" <<EOF
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
subjectAltName = DNS:${service_name},DNS:${service_name}.svc.cluster.local
EOF

    # Sign the certificate with CA
    openssl x509 -req \
        -in "${output_dir}/${service_name}.csr" \
        -CA "$CA_CERT" \
        -CAkey "$CA_KEY" \
        -CAcreateserial \
        -out "${output_dir}/${service_name}.crt" \
        -days "$valid_days" \
        -extfile "${output_dir}/extensions.cnf"

    # Clean up temporary files
    rm -f "${output_dir}/${service_name}.csr" "${output_dir}/extensions.cnf"

    # Verify certificate
    openssl verify -CAfile "$CA_CERT" "${output_dir}/${service_name}.crt"

    echo "Certificate generated: ${output_dir}/${service_name}.crt"
    echo "Expires: $(openssl x509 -noout -enddate -in ${output_dir}/${service_name}.crt)"
}

update_kubernetes_secret() {
    local service_name=$1
    local cert_dir=$2
    local namespace=$3

    echo "Updating Kubernetes secret for: $service_name"

    kubectl create secret tls "${service_name}-mtls" \
        --cert="${cert_dir}/${service_name}.crt" \
        --key="${cert_dir}/${service_name}.key" \
        --namespace="$namespace" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Trigger rolling restart of pods using this secret
    kubectl rollout restart deployment/"$service_name" -n "$namespace" || true
}

main() {
    local namespace="${NAMESPACE:-default}"

    # Create output directory if needed
    mkdir -p "$CERT_DIR"

    # Generate new certificate
    generate_client_cert "$SERVICE_NAME" "$CERT_DIR" "$VALID_DAYS"

    # Update Kubernetes secret
    update_kubernetes_secret "$SERVICE_NAME" "$CERT_DIR" "$namespace"

    echo "=== Client certificate rotation complete ==="
}

main "$@"
```

## HashiCorp Vault Dynamic Secrets

Vault's dynamic secrets eliminate the need for rotation entirely by generating short-lived credentials on demand.

### Vault Database Secrets Engine Setup

Configure Vault to generate PostgreSQL credentials dynamically.

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/myapp-postgres \
    plugin_name=postgresql-database-plugin \
    allowed_roles="app-readonly,app-readwrite" \
    connection_url="postgresql://{{username}}:{{password}}@postgres.example.com:5432/myapp?sslmode=require" \
    username="vault_admin" \
    password="vault_admin_password"

# Create a role for read-only access
vault write database/roles/app-readonly \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create a role for read-write access
vault write database/roles/app-readwrite \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

### Application Integration with Vault Agent

Vault Agent automatically manages credential lifecycle, including renewal.

`vault-agent-config.hcl`

```hcl
# Vault Agent configuration for automatic credential management

# Exit after auth to let init container pattern work
exit_after_auth = false

# Vault server address
vault {
  address = "https://vault.example.com:8200"
}

# Auto-auth using Kubernetes service account
auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "myapp"
    }
  }

  # Cache tokens in memory
  sink "file" {
    config = {
      path = "/home/vault/.vault-token"
    }
  }
}

# Template for database credentials
# Vault Agent will automatically renew before TTL expires
template {
  source      = "/etc/vault/templates/db-credentials.ctmpl"
  destination = "/var/run/secrets/db/credentials.json"

  # Run this command after rendering (signal app to reload)
  command     = "pkill -HUP myapp || true"

  # Re-render when credentials are about to expire
  error_on_missing_key = true
}

template {
  source      = "/etc/vault/templates/api-key.ctmpl"
  destination = "/var/run/secrets/api/key.json"
  command     = "pkill -HUP myapp || true"
}
```

`db-credentials.ctmpl`

```
{{- with secret "database/creds/app-readwrite" -}}
{
  "username": "{{ .Data.username }}",
  "password": "{{ .Data.password }}",
  "host": "postgres.example.com",
  "port": 5432,
  "database": "myapp",
  "lease_id": "{{ .LeaseID }}",
  "lease_duration": {{ .LeaseDuration }},
  "renewable": {{ .Renewable }}
}
{{- end -}}
```

### Kubernetes Deployment with Vault Agent Sidecar

`deployment-with-vault.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        # Vault Agent Injector annotations
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"

        # Database credentials template
        vault.hashicorp.com/agent-inject-secret-db.json: "database/creds/app-readwrite"
        vault.hashicorp.com/agent-inject-template-db.json: |
          {{- with secret "database/creds/app-readwrite" -}}
          {
            "username": "{{ .Data.username }}",
            "password": "{{ .Data.password }}"
          }
          {{- end -}}

        # Automatically renew credentials
        vault.hashicorp.com/agent-pre-populate-only: "false"
    spec:
      serviceAccountName: myapp
      containers:
        - name: myapp
          image: myapp:latest

          # Read credentials from Vault Agent rendered files
          env:
            - name: DB_CREDENTIALS_FILE
              value: /vault/secrets/db.json

          volumeMounts:
            - name: vault-secrets
              mountPath: /vault/secrets
              readOnly: true

          # Liveness probe should not depend on DB connection
          # to avoid cascading failures during credential rotation
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10

          # Readiness probe can check DB connection
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5

      volumes:
        - name: vault-secrets
          emptyDir:
            medium: Memory
```

## Automation with Cron and Scheduled Jobs

### Kubernetes CronJob for Rotation

`rotation-cronjob.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secret-rotation
  namespace: security
spec:
  # Run daily at 2 AM UTC
  schedule: "0 2 * * *"

  # Prevent overlapping jobs
  concurrencyPolicy: Forbid

  # Keep last 3 successful and 1 failed job for debugging
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1

  jobTemplate:
    spec:
      # Retry once on failure
      backoffLimit: 1

      template:
        metadata:
          labels:
            app: secret-rotation
        spec:
          serviceAccountName: secret-rotation
          restartPolicy: OnFailure

          containers:
            - name: rotator
              image: ghcr.io/example/secret-rotator:latest

              env:
                # Vault configuration
                - name: VAULT_ADDR
                  value: "https://vault.example.com:8200"
                - name: VAULT_ROLE
                  value: "secret-rotation"

                # Rotation targets
                - name: ROTATE_DB_CREDENTIALS
                  value: "true"
                - name: ROTATE_API_KEYS
                  value: "true"

                # Notification settings
                - name: SLACK_WEBHOOK_URL
                  valueFrom:
                    secretKeyRef:
                      name: rotation-config
                      key: slack-webhook

              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 500m
                  memory: 256Mi

              securityContext:
                runAsNonRoot: true
                runAsUser: 1000
                readOnlyRootFilesystem: true
                allowPrivilegeEscalation: false
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secret-rotation
  namespace: security
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-rotation
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "update", "patch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: secret-rotation
  namespace: production
subjects:
  - kind: ServiceAccount
    name: secret-rotation
    namespace: security
roleRef:
  kind: Role
  name: secret-rotation
  apiGroup: rbac.authorization.k8s.io
```

### Rotation Orchestrator Script

This script coordinates rotation across multiple services.

`rotation-orchestrator.py`

```python
#!/usr/bin/env python3
"""
Secret Rotation Orchestrator
Coordinates rotation of multiple secret types with proper sequencing
"""

import os
import sys
import json
import logging
import subprocess
from datetime import datetime, timezone
from typing import List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RotationStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class RotationResult:
    target: str
    status: RotationStatus
    message: str
    duration_seconds: float


class RotationOrchestrator:
    def __init__(self):
        self.results: List[RotationResult] = []
        self.slack_webhook = os.environ.get("SLACK_WEBHOOK_URL")

    def rotate_database_credentials(self) -> RotationResult:
        """Rotate PostgreSQL credentials using dual-user pattern"""
        start_time = datetime.now(timezone.utc)
        target = "postgresql-credentials"

        try:
            # Run the PostgreSQL rotation script
            result = subprocess.run(
                ["/opt/scripts/rotate-postgres-user.sh"],
                capture_output=True,
                text=True,
                timeout=300,
                env={
                    **os.environ,
                    "DB_HOST": os.environ.get("DB_HOST", "postgres.production"),
                    "DB_NAME": os.environ.get("DB_NAME", "myapp"),
                }
            )

            if result.returncode != 0:
                raise RuntimeError(f"Rotation script failed: {result.stderr}")

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            return RotationResult(
                target=target,
                status=RotationStatus.SUCCESS,
                message="Database credentials rotated successfully",
                duration_seconds=duration
            )

        except Exception as e:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            return RotationResult(
                target=target,
                status=RotationStatus.FAILED,
                message=str(e),
                duration_seconds=duration
            )

    def rotate_api_keys(self) -> RotationResult:
        """Rotate external API keys"""
        start_time = datetime.now(timezone.utc)
        target = "api-keys"

        try:
            # Import and run API key rotation
            from api_key_rotator import (
                APIKeyRotator,
                SendGridAPIKeyProvider,
                AWSSecretsManagerStore
            )

            secret_store = AWSSecretsManagerStore()

            # Rotate SendGrid API key
            sendgrid_rotator = APIKeyRotator(
                provider=SendGridAPIKeyProvider(
                    admin_key=os.environ["SENDGRID_ADMIN_KEY"]
                ),
                secret_store=secret_store,
                service_name="sendgrid"
            )
            sendgrid_rotator.rotate(finalize=True)

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            return RotationResult(
                target=target,
                status=RotationStatus.SUCCESS,
                message="API keys rotated successfully",
                duration_seconds=duration
            )

        except Exception as e:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            return RotationResult(
                target=target,
                status=RotationStatus.FAILED,
                message=str(e),
                duration_seconds=duration
            )

    def trigger_app_reload(self) -> RotationResult:
        """Trigger application pods to reload credentials"""
        start_time = datetime.now(timezone.utc)
        target = "app-reload"

        try:
            # Annotate deployment to trigger rollout
            result = subprocess.run(
                [
                    "kubectl", "patch", "deployment", "myapp",
                    "-n", "production",
                    "-p", json.dumps({
                        "spec": {
                            "template": {
                                "metadata": {
                                    "annotations": {
                                        "secrets-rotated-at": datetime.now(
                                            timezone.utc
                                        ).isoformat()
                                    }
                                }
                            }
                        }
                    })
                ],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                raise RuntimeError(f"Patch failed: {result.stderr}")

            # Wait for rollout to complete
            subprocess.run(
                [
                    "kubectl", "rollout", "status",
                    "deployment/myapp", "-n", "production",
                    "--timeout=300s"
                ],
                check=True,
                timeout=330
            )

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            return RotationResult(
                target=target,
                status=RotationStatus.SUCCESS,
                message="Application reload completed",
                duration_seconds=duration
            )

        except Exception as e:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            return RotationResult(
                target=target,
                status=RotationStatus.FAILED,
                message=str(e),
                duration_seconds=duration
            )

    def send_notification(self, results: List[RotationResult]):
        """Send rotation summary to Slack"""
        if not self.slack_webhook:
            logger.info("No Slack webhook configured, skipping notification")
            return

        # Build summary
        success_count = sum(1 for r in results if r.status == RotationStatus.SUCCESS)
        failed_count = sum(1 for r in results if r.status == RotationStatus.FAILED)
        total_duration = sum(r.duration_seconds for r in results)

        color = "good" if failed_count == 0 else "danger"

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"Secret Rotation {'Complete' if failed_count == 0 else 'Failed'}"
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Successful:* {success_count}"},
                    {"type": "mrkdwn", "text": f"*Failed:* {failed_count}"},
                    {"type": "mrkdwn", "text": f"*Duration:* {total_duration:.1f}s"},
                ]
            }
        ]

        # Add details for each rotation
        for result in results:
            emoji = ":white_check_mark:" if result.status == RotationStatus.SUCCESS else ":x:"
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{emoji} *{result.target}*: {result.message}"
                }
            })

        payload = {"blocks": blocks}

        try:
            requests.post(self.slack_webhook, json=payload, timeout=10)
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")

    def run(self) -> int:
        """Execute full rotation workflow"""
        logger.info("=== Starting Secret Rotation ===")

        # Step 1: Rotate database credentials
        if os.environ.get("ROTATE_DB_CREDENTIALS", "true").lower() == "true":
            result = self.rotate_database_credentials()
            self.results.append(result)
            logger.info(f"Database rotation: {result.status.value}")

        # Step 2: Rotate API keys
        if os.environ.get("ROTATE_API_KEYS", "true").lower() == "true":
            result = self.rotate_api_keys()
            self.results.append(result)
            logger.info(f"API key rotation: {result.status.value}")

        # Step 3: Trigger application reload
        result = self.trigger_app_reload()
        self.results.append(result)
        logger.info(f"App reload: {result.status.value}")

        # Send notification
        self.send_notification(self.results)

        # Return exit code
        failed = any(r.status == RotationStatus.FAILED for r in self.results)

        logger.info("=== Secret Rotation Complete ===")
        return 1 if failed else 0


def main():
    orchestrator = RotationOrchestrator()
    exit_code = orchestrator.run()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
```

## Rotation Checklist

Before implementing secret rotation, verify these prerequisites:

| Requirement | Check |
|-------------|-------|
| Secret store supports versioning | Can roll back to previous secret |
| Applications support credential reload | No restart required for new credentials |
| Monitoring in place | Detect failed rotations immediately |
| Runbook documented | Steps to manually rotate if automation fails |
| Tested in staging | Rotation tested end-to-end before production |
| Alerting configured | Team notified of rotation success/failure |
| Audit logging enabled | Track who/what accessed credentials |

## Common Pitfalls

1. **Rotating too fast**: Applications need time to pick up new credentials. Add grace periods.

2. **Missing rollback plan**: Always keep the previous credential valid until new one is confirmed working.

3. **Hardcoded credentials**: Rotation is useless if apps have credentials baked into images or committed to repos.

4. **Insufficient monitoring**: A silent rotation failure means credentials are not being rotated at all.

5. **Single point of failure**: The rotation system itself needs high availability.

6. **Clock skew**: Certificate validation fails if clocks are out of sync. Use NTP.

---

Secret rotation is operational hygiene, not a one-time project. Start with the highest-risk credentials (database passwords, admin API keys), automate the rotation, and gradually expand coverage. The goal is making rotation so routine that it becomes invisible - until the day a leaked credential becomes worthless because it was already rotated.
