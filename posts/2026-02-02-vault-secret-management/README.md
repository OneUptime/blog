# How to Use Vault for Secret Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Secrets, Security, DevOps, Infrastructure

Description: Learn how to use HashiCorp Vault to securely store, access, and manage secrets in your applications and infrastructure.

---

Managing secrets like API keys, database passwords, and certificates is one of the most critical aspects of running secure infrastructure. Hardcoding secrets in configuration files or environment variables leaves you vulnerable to leaks, makes rotation difficult, and creates audit nightmares. HashiCorp Vault solves these problems by providing a centralized, secure, and auditable way to manage secrets.

In this guide, I will walk you through setting up Vault, storing secrets, and integrating it into your applications.

## Why Use Vault?

Before diving into the how, let's understand why Vault is worth the setup effort:

| Challenge | How Vault Solves It |
|-----------|---------------------|
| Secrets scattered across configs | Centralized secret storage |
| No audit trail for secret access | Complete audit logging |
| Manual, error-prone rotation | Dynamic secrets with automatic rotation |
| Plaintext secrets in repos | Encryption as a service |
| No access control | Fine-grained policies |

## How Vault Works

Here is a high-level view of how Vault fits into your infrastructure:

```mermaid
flowchart LR
    subgraph Applications
        A[Web App]
        B[API Service]
        C[CI/CD Pipeline]
    end

    subgraph Vault
        V[Vault Server]
        KV[KV Secrets Engine]
        DB[Database Engine]
        PKI[PKI Engine]
    end

    subgraph Storage
        S[(Backend Storage)]
    end

    A -->|Authenticate| V
    B -->|Authenticate| V
    C -->|Authenticate| V
    V --> KV
    V --> DB
    V --> PKI
    V --> S
```

## Installing Vault

You can run Vault in development mode for testing or production mode for real deployments. Let's start with a development setup.

### Option 1: Docker (Recommended for Development)

This command starts Vault in development mode with a known root token for easy testing.

```bash
# Run Vault in development mode
docker run -d \
  --name vault \
  -p 8200:8200 \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
  -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
  hashicorp/vault:latest

# Set environment variables for the CLI
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='myroot'
```

### Option 2: Binary Installation

Download and install the Vault binary for production setups where you need more control.

```bash
# Download Vault (check for latest version)
wget https://releases.hashicorp.com/vault/1.15.4/vault_1.15.4_linux_amd64.zip
unzip vault_1.15.4_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Verify installation
vault --version
```

## Initializing and Unsealing Vault

In production mode, Vault starts in a sealed state. You need to initialize it once and unseal it every time it starts.

### Initialize Vault

The initialization process generates the master key and root token. This only happens once.

```bash
# Initialize Vault with 5 key shares, requiring 3 to unseal
vault operator init -key-shares=5 -key-threshold=3
```

This outputs something like:

```
Unseal Key 1: Kx8pU+dZk...
Unseal Key 2: 9MkQE72nv...
Unseal Key 3: Rmx3Py2qw...
Unseal Key 4: L8mNx5Kzp...
Unseal Key 5: Vn2Wq9Rta...

Initial Root Token: hvs.CAESIGh...
```

Store these keys securely and separately. Never keep all keys in one place.

### Unseal Vault

You need to provide the threshold number of unseal keys to unseal Vault.

```bash
# Unseal with 3 different keys
vault operator unseal Kx8pU+dZk...
vault operator unseal 9MkQE72nv...
vault operator unseal Rmx3Py2qw...

# Check status
vault status
```

## Storing and Retrieving Secrets

The Key/Value (KV) secrets engine is the most common way to store static secrets.

### Enable KV Secrets Engine

Vault comes with KV version 2 enabled at `secret/` in dev mode. For production, you may want to enable it at a custom path.

```bash
# Enable KV v2 secrets engine at a custom path
vault secrets enable -path=myapp -version=2 kv
```

### Write Secrets

Store your application secrets with meaningful paths that reflect your organization structure.

```bash
# Write a database credential
vault kv put myapp/database/production \
    username="app_user" \
    password="supersecretpassword" \
    host="db.example.com" \
    port="5432"

# Write API keys
vault kv put myapp/api-keys/stripe \
    secret_key="sk_live_abc123" \
    publishable_key="pk_live_xyz789"
```

### Read Secrets

Retrieve secrets when your application needs them.

```bash
# Read all fields
vault kv get myapp/database/production

# Read specific field
vault kv get -field=password myapp/database/production

# Get output as JSON for scripting
vault kv get -format=json myapp/database/production
```

### Delete and Manage Secrets

KV v2 supports versioning, so you can recover from accidental deletions.

```bash
# Soft delete (can be recovered)
vault kv delete myapp/database/production

# Recover deleted secret
vault kv undelete -versions=1 myapp/database/production

# Permanently destroy a version
vault kv destroy -versions=1 myapp/database/production

# List secrets at a path
vault kv list myapp/
```

## Authentication Methods

Vault supports multiple ways to authenticate. Here are the most common ones.

### Token Authentication

The simplest method, but tokens need to be managed carefully.

```bash
# Create a token with specific policies
vault token create -policy=myapp-read -ttl=1h

# Revoke a token
vault token revoke <token>
```

### AppRole Authentication

AppRole is designed for machine-to-machine authentication, making it perfect for applications.

```bash
# Enable AppRole auth method
vault auth enable approle

# Create an AppRole for your application
vault write auth/approle/role/myapp \
    token_policies="myapp-read" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=10m

# Get the Role ID (public identifier)
vault read auth/approle/role/myapp/role-id

# Generate a Secret ID (private credential)
vault write -f auth/approle/role/myapp/secret-id
```

### Kubernetes Authentication

For applications running in Kubernetes, this method uses service account tokens.

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure it to talk to your cluster
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create a role for your namespace and service account
vault write auth/kubernetes/role/myapp \
    bound_service_account_names=myapp-sa \
    bound_service_account_namespaces=production \
    policies=myapp-read \
    ttl=1h
```

## Creating Policies

Policies define what secrets a token can access. Always follow the principle of least privilege.

This policy allows reading secrets under the myapp path but prevents writing or deleting.

```hcl
# myapp-read.hcl - Read-only access to myapp secrets

# Allow reading secrets
path "myapp/data/*" {
  capabilities = ["read", "list"]
}

# Allow listing secret paths
path "myapp/metadata/*" {
  capabilities = ["list"]
}

# Deny access to admin secrets
path "myapp/data/admin/*" {
  capabilities = ["deny"]
}
```

Apply the policy to Vault.

```bash
# Write the policy
vault policy write myapp-read myapp-read.hcl

# List all policies
vault policy list

# Read a policy
vault policy read myapp-read
```

## Integrating Vault with Applications

Let's look at how to use Vault from your application code.

### Python Integration

Use the hvac library to interact with Vault from Python applications.

```python
# Install: pip install hvac

import hvac
import os

# Initialize the Vault client
# The address and token can come from environment variables
client = hvac.Client(
    url=os.environ.get('VAULT_ADDR', 'http://127.0.0.1:8200'),
    token=os.environ.get('VAULT_TOKEN')
)

# Check if we are authenticated
if not client.is_authenticated():
    raise Exception("Vault authentication failed")

# Read a secret from KV v2
# The 'data' key contains the actual secret data
secret_response = client.secrets.kv.v2.read_secret_version(
    path='database/production',
    mount_point='myapp'
)

# Extract the secret values
db_config = secret_response['data']['data']
db_username = db_config['username']
db_password = db_config['password']
db_host = db_config['host']

print(f"Connecting to {db_host} as {db_username}")


# Using AppRole authentication for production apps
def authenticate_with_approle(role_id, secret_id):
    """
    Authenticate using AppRole and return a configured client.
    This is the recommended approach for applications.
    """
    client = hvac.Client(url=os.environ.get('VAULT_ADDR'))

    # Login with AppRole credentials
    response = client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id
    )

    # The client is now authenticated with the returned token
    return client


# Example usage in a real application
def get_database_connection():
    """
    Get database credentials from Vault and create a connection.
    Handles token refresh automatically through hvac.
    """
    role_id = os.environ.get('VAULT_ROLE_ID')
    secret_id = os.environ.get('VAULT_SECRET_ID')

    client = authenticate_with_approle(role_id, secret_id)

    secret = client.secrets.kv.v2.read_secret_version(
        path='database/production',
        mount_point='myapp'
    )

    creds = secret['data']['data']

    # Use credentials to connect (example with psycopg2)
    # import psycopg2
    # conn = psycopg2.connect(
    #     host=creds['host'],
    #     user=creds['username'],
    #     password=creds['password'],
    #     dbname='myapp'
    # )

    return creds
```

### Node.js Integration

Use the node-vault package to access Vault from Node.js applications.

```javascript
// Install: npm install node-vault

const vault = require('node-vault')({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
  token: process.env.VAULT_TOKEN
});

// Read a secret from KV v2
// Note: KV v2 paths need 'data' in the path
async function getSecret(path) {
  try {
    const result = await vault.read(`myapp/data/${path}`);
    // The actual secret data is nested under data.data for KV v2
    return result.data.data;
  } catch (error) {
    console.error(`Failed to read secret: ${error.message}`);
    throw error;
  }
}

// AppRole authentication for production
async function authenticateWithAppRole(roleId, secretId) {
  // Create a client without a token
  const vaultClient = require('node-vault')({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200'
  });

  // Login with AppRole
  const response = await vaultClient.approleLogin({
    role_id: roleId,
    secret_id: secretId
  });

  // Set the token from the login response
  vaultClient.token = response.auth.client_token;

  return vaultClient;
}

// Example: Get database config on startup
async function initializeDatabaseConfig() {
  const dbConfig = await getSecret('database/production');

  console.log(`Database host: ${dbConfig.host}`);
  console.log(`Database user: ${dbConfig.username}`);
  // Never log passwords!

  return {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password
  };
}

// Run the example
initializeDatabaseConfig()
  .then(config => console.log('Database configured'))
  .catch(err => console.error('Configuration failed:', err));
```

### Go Integration

Use the official Vault API client for Go applications.

```go
// Install: go get github.com/hashicorp/vault/api

package main

import (
	"fmt"
	"log"
	"os"

	vault "github.com/hashicorp/vault/api"
)

func main() {
	// Create a Vault client with default configuration
	// This reads VAULT_ADDR and VAULT_TOKEN from environment
	config := vault.DefaultConfig()
	client, err := vault.NewClient(config)
	if err != nil {
		log.Fatalf("Failed to create Vault client: %v", err)
	}

	// Read a secret from KV v2
	// For KV v2, the path must include 'data' after the mount point
	secret, err := client.KVv2("myapp").Get(
		context.Background(),
		"database/production",
	)
	if err != nil {
		log.Fatalf("Failed to read secret: %v", err)
	}

	// Access the secret data
	username := secret.Data["username"].(string)
	password := secret.Data["password"].(string)
	host := secret.Data["host"].(string)

	fmt.Printf("Connecting to %s as %s\n", host, username)
}

// AppRole authentication for production deployments
func authenticateWithAppRole(roleID, secretID string) (*vault.Client, error) {
	config := vault.DefaultConfig()
	client, err := vault.NewClient(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create client: %w", err)
	}

	// Authenticate with AppRole
	data := map[string]interface{}{
		"role_id":   roleID,
		"secret_id": secretID,
	}

	resp, err := client.Logical().Write("auth/approle/login", data)
	if err != nil {
		return nil, fmt.Errorf("approle login failed: %w", err)
	}

	// Set the token from the auth response
	client.SetToken(resp.Auth.ClientToken)

	return client, nil
}
```

## Dynamic Secrets

One of Vault's most powerful features is generating short-lived credentials on demand. This eliminates the need to manage static database passwords.

### Database Secrets Engine

Configure Vault to generate database credentials automatically.

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure connection to PostgreSQL
vault write database/config/myapp-postgres \
    plugin_name=postgresql-database-plugin \
    allowed_roles="myapp-readonly,myapp-readwrite" \
    connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/myapp?sslmode=require" \
    username="vault_admin" \
    password="vault_admin_password"

# Create a role that generates read-only credentials
vault write database/roles/myapp-readonly \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Create a role for read-write access
vault write database/roles/myapp-readwrite \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

Now your applications can request fresh credentials.

```bash
# Request temporary database credentials
vault read database/creds/myapp-readonly

# Output:
# Key                Value
# lease_id           database/creds/myapp-readonly/abc123...
# lease_duration     1h
# username           v-approle-myapp-r-xyz789
# password           A1B2-C3D4-E5F6-G7H8
```

## Vault Agent for Automatic Token Management

Vault Agent runs as a sidecar and handles authentication and token renewal automatically. This is the recommended approach for production.

Create a Vault Agent configuration file.

```hcl
# vault-agent-config.hcl

# Exit after rendering templates (for init containers)
# Remove this for long-running sidecars
exit_after_auth = false

pid_file = "/tmp/vault-agent.pid"

vault {
  address = "https://vault.example.com:8200"
}

# Automatic authentication with AppRole
auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path   = "/vault/role-id"
      secret_id_file_path = "/vault/secret-id"
      remove_secret_id_file_after_reading = true
    }
  }

  # Store the token in a file for the application to use
  sink "file" {
    config = {
      path = "/vault/token"
      mode = 0640
    }
  }
}

# Render secrets to files
template {
  source      = "/vault/templates/database.tpl"
  destination = "/app/config/database.json"
}

template {
  source      = "/vault/templates/api-keys.tpl"
  destination = "/app/config/api-keys.json"
}
```

Create template files that Vault Agent will render with secrets.

```hcl
# /vault/templates/database.tpl
# This template is rendered by Vault Agent with actual secrets

{{- with secret "myapp/data/database/production" -}}
{
  "host": "{{ .Data.data.host }}",
  "port": {{ .Data.data.port }},
  "username": "{{ .Data.data.username }}",
  "password": "{{ .Data.data.password }}"
}
{{- end -}}
```

Run Vault Agent.

```bash
vault agent -config=vault-agent-config.hcl
```

## Kubernetes Deployment Example

Here is how to deploy an application with Vault integration in Kubernetes using the Vault Agent sidecar injector.

First, install the Vault Agent Injector in your cluster.

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault with the injector
helm install vault hashicorp/vault \
  --set "injector.enabled=true" \
  --set "server.enabled=false" \
  --set "injector.externalVaultAddr=https://vault.example.com:8200"
```

Then annotate your deployment to inject secrets.

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
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
        # Enable Vault Agent injection
        vault.hashicorp.com/agent-inject: "true"

        # The Vault role to authenticate as
        vault.hashicorp.com/role: "myapp"

        # Inject database credentials to a file
        vault.hashicorp.com/agent-inject-secret-database.json: "myapp/data/database/production"
        vault.hashicorp.com/agent-inject-template-database.json: |
          {{- with secret "myapp/data/database/production" -}}
          {
            "host": "{{ .Data.data.host }}",
            "username": "{{ .Data.data.username }}",
            "password": "{{ .Data.data.password }}"
          }
          {{- end -}}

        # Inject API keys
        vault.hashicorp.com/agent-inject-secret-api-keys.json: "myapp/data/api-keys/stripe"
        vault.hashicorp.com/agent-inject-template-api-keys.json: |
          {{- with secret "myapp/data/api-keys/stripe" -}}
          {
            "stripe_secret_key": "{{ .Data.data.secret_key }}",
            "stripe_publishable_key": "{{ .Data.data.publishable_key }}"
          }
          {{- end -}}
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myapp:latest
          # Secrets are available at /vault/secrets/
          env:
            - name: DB_CONFIG_PATH
              value: /vault/secrets/database.json
            - name: API_KEYS_PATH
              value: /vault/secrets/api-keys.json
```

## Best Practices

Here are essential practices for running Vault securely in production:

### 1. Never Store Unseal Keys Together

Distribute unseal keys to different team members or use auto-unseal with a cloud KMS.

```bash
# Configure auto-unseal with AWS KMS
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal-key"
}
```

### 2. Enable Audit Logging

Always enable audit logging to track who accessed what secrets.

```bash
# Enable file audit log
vault audit enable file file_path=/var/log/vault/audit.log

# Enable syslog audit
vault audit enable syslog tag="vault" facility="AUTH"
```

### 3. Use Short TTLs

Configure short TTLs for tokens and secrets to limit exposure if credentials are compromised.

```bash
# Set default lease TTL to 1 hour, max to 24 hours
vault write sys/mounts/myapp/tune \
    default_lease_ttl=1h \
    max_lease_ttl=24h
```

### 4. Rotate Root Tokens

Generate root tokens only when needed and revoke them immediately after use.

```bash
# Generate a new root token (requires unseal keys)
vault operator generate-root -init

# Revoke the root token when done
vault token revoke <root-token>
```

### 5. Regular Backups

Back up Vault's storage backend regularly, but remember the data is encrypted.

```bash
# For Consul backend
consul snapshot save vault-backup.snap

# For Raft storage
vault operator raft snapshot save vault-backup.snap
```

## Conclusion

Vault transforms secret management from a manual, error-prone process into a secure, auditable, and automated workflow. By centralizing your secrets, implementing proper access controls, and using dynamic credentials, you significantly reduce the risk of credential leaks and simplify compliance.

Start with the basics - store your static secrets in Vault and gradually adopt more advanced features like dynamic secrets and the Vault Agent. The initial setup effort pays off quickly in improved security posture and operational efficiency.

---

*Looking for a complete observability platform to monitor your infrastructure alongside your secret management? [OneUptime](https://oneuptime.com) provides integrated monitoring, incident management, and status pages to keep your systems running smoothly. Start your free trial today.*
