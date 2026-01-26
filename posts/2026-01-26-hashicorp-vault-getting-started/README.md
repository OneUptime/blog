# How to Get Started with HashiCorp Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Secrets Management, Security, DevOps, Infrastructure

Description: A beginner's guide to HashiCorp Vault covering installation, secrets engines, authentication methods, and policies for secure secrets management.

---

Managing secrets like API keys, database credentials, and encryption keys is one of the most critical aspects of modern infrastructure. HashiCorp Vault provides a centralized solution for storing, accessing, and managing sensitive data. This guide walks you through the fundamentals of getting started with Vault.

## What is HashiCorp Vault?

HashiCorp Vault is an identity-based secrets and encryption management system. It provides a secure way to store and tightly control access to tokens, passwords, certificates, and encryption keys.

```mermaid
flowchart TD
    subgraph Clients["Clients"]
        A[Applications]
        B[Users]
        C[CI/CD Pipelines]
        D[Kubernetes Pods]
    end

    subgraph Vault["HashiCorp Vault"]
        E[Authentication]
        F[Authorization / Policies]
        G[Secrets Engines]
        H[Audit Logging]
    end

    subgraph Backends["Secret Backends"]
        I[Key/Value Store]
        J[Database Credentials]
        K[PKI Certificates]
        L[Cloud Provider Secrets]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> F
    F --> G
    G --> H

    G --> I
    G --> J
    G --> K
    G --> L
```

## Installing HashiCorp Vault

### Installing on macOS

```bash
# Install Vault using Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/vault

# Verify the installation
vault --version
```

### Installing on Ubuntu/Debian

```bash
# Add the HashiCorp GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add the official HashiCorp Linux repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# Update and install Vault
sudo apt update && sudo apt install vault

# Verify the installation
vault --version
```

### Installing on RHEL/CentOS

```bash
# Install yum-config-manager
sudo yum install -y yum-utils

# Add the HashiCorp repository
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Vault
sudo yum -y install vault

# Verify the installation
vault --version
```

## Starting Vault in Development Mode

For learning purposes, Vault provides a development mode that runs entirely in memory. This is perfect for experimentation but should never be used in production.

```bash
# Start Vault in development mode
# The -dev flag starts an in-memory server with a pre-configured root token
vault server -dev

# You will see output like this:
# ==> Vault server configuration:
#              Api Address: http://127.0.0.1:8200
#                      Cgo: disabled
#          Cluster Address: https://127.0.0.1:8201
#               Go Version: go1.21.0
#               Listener 1: tcp (addr: "127.0.0.1:8200", cluster address: "127.0.0.1:8201", ...)
#                Log Level: info
#                    Mlock: supported: false, enabled: false
#            Recovery Mode: false
#                  Storage: inmem
#                  Version: Vault v1.15.0
#
# The unseal key and root token are displayed below in case you want to
# seal/unseal the Vault or re-authenticate.
#
# Unseal Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Root Token: hvs.xxxxxxxxxxxxxxxxxxxxxxxxxx
```

In a new terminal, set up your environment to communicate with Vault:

```bash
# Set the Vault address
export VAULT_ADDR='http://127.0.0.1:8200'

# Set the root token for authentication (copy from dev server output)
export VAULT_TOKEN='hvs.xxxxxxxxxxxxxxxxxxxxxxxxxx'

# Verify Vault is running and accessible
vault status
```

## Understanding Vault Architecture

```mermaid
flowchart LR
    subgraph Storage["Storage Backend"]
        S1[Consul]
        S2[Integrated Storage / Raft]
        S3[S3]
        S4[PostgreSQL]
    end

    subgraph Core["Vault Core"]
        direction TB
        Barrier["Encryption Barrier"]
        SecretEng["Secrets Engines"]
        AuthMeth["Auth Methods"]
        AuditDev["Audit Devices"]
        SysBack["System Backend"]
    end

    subgraph API["API Layer"]
        HTTP["HTTP API"]
        CLI["CLI"]
        UI["Web UI"]
    end

    CLI --> HTTP
    UI --> HTTP
    HTTP --> Core
    Core --> Barrier
    Barrier --> Storage
```

The key components are:

1. **Storage Backend**: Where encrypted data is persisted
2. **Encryption Barrier**: All data passes through this layer for encryption/decryption
3. **Secrets Engines**: Components that store, generate, or encrypt data
4. **Auth Methods**: How clients authenticate to Vault
5. **Audit Devices**: Log all requests and responses

## Working with the Key/Value Secrets Engine

The KV (Key/Value) secrets engine is the simplest way to store arbitrary secrets. Vault v2 KV engine provides versioning capabilities.

### Enabling the KV Secrets Engine

```bash
# Enable the KV v2 secrets engine at the path "secret"
# Note: In dev mode, this is already enabled at "secret/"
vault secrets enable -path=secret kv-v2

# List enabled secrets engines
vault secrets list
```

### Storing and Retrieving Secrets

```bash
# Store a secret at the path "secret/data/myapp/config"
# The -mount flag specifies which secrets engine to use
vault kv put -mount=secret myapp/config \
    username="admin" \
    password="s3cr3t" \
    api_key="abc123xyz"

# Read the secret back
vault kv get -mount=secret myapp/config

# Get a specific field from the secret
vault kv get -mount=secret -field=password myapp/config

# Get the secret in JSON format for programmatic use
vault kv get -mount=secret -format=json myapp/config
```

### Working with Secret Versions

```bash
# Update the secret (creates a new version)
vault kv put -mount=secret myapp/config \
    username="admin" \
    password="newpassword123" \
    api_key="abc123xyz"

# Get a specific version of the secret
vault kv get -mount=secret -version=1 myapp/config

# View metadata about the secret including all versions
vault kv metadata get -mount=secret myapp/config

# Delete a specific version (soft delete)
vault kv delete -mount=secret -versions=1 myapp/config

# Undelete a version
vault kv undelete -mount=secret -versions=1 myapp/config

# Permanently destroy a version
vault kv destroy -mount=secret -versions=1 myapp/config
```

## Authentication Methods

Vault supports multiple authentication methods. Here are the most common ones.

```mermaid
flowchart TD
    subgraph AuthMethods["Authentication Methods"]
        Token["Token Auth"]
        UserPass["Username/Password"]
        AppRole["AppRole"]
        LDAP["LDAP"]
        OIDC["OIDC/JWT"]
        K8s["Kubernetes"]
        AWS["AWS IAM"]
        GitHub["GitHub"]
    end

    subgraph UseCase["Common Use Cases"]
        Human["Human Users"]
        Machine["Machine/Apps"]
        CI["CI/CD Systems"]
        Cloud["Cloud Workloads"]
    end

    Human --> UserPass
    Human --> LDAP
    Human --> OIDC
    Human --> GitHub

    Machine --> AppRole
    Machine --> Token

    CI --> AppRole
    CI --> Token

    Cloud --> K8s
    Cloud --> AWS
```

### Token Authentication

Tokens are the core authentication method in Vault. Every authentication method ultimately creates a token.

```bash
# Create a new token with specific policies
vault token create -policy=default -ttl=1h

# Look up information about the current token
vault token lookup

# Revoke a token
vault token revoke <token>

# Create a token with a display name and metadata
vault token create \
    -display-name="ci-pipeline" \
    -policy=ci-secrets \
    -ttl=30m \
    -metadata=environment=staging
```

### Userpass Authentication

The userpass auth method allows users to authenticate with a username and password.

```bash
# Enable the userpass auth method
vault auth enable userpass

# Create a user with specific policies
vault write auth/userpass/users/john \
    password="securepassword" \
    policies="dev-secrets"

# Authenticate as the user
vault login -method=userpass \
    username=john \
    password=securepassword

# Update a user's password
vault write auth/userpass/users/john \
    password="newsecurepassword"

# List all users
vault list auth/userpass/users
```

### AppRole Authentication

AppRole is designed for machine-to-machine authentication, perfect for CI/CD pipelines and applications.

```bash
# Enable the AppRole auth method
vault auth enable approle

# Create a named role with specific policies and settings
# secret_id_ttl: How long a SecretID is valid
# token_ttl: Initial TTL for generated tokens
# token_max_ttl: Maximum TTL for generated tokens
vault write auth/approle/role/myapp \
    secret_id_ttl=10m \
    token_num_uses=10 \
    token_ttl=20m \
    token_max_ttl=30m \
    secret_id_num_uses=40 \
    policies="myapp-secrets"

# Get the RoleID (this is like a username)
vault read auth/approle/role/myapp/role-id

# Generate a SecretID (this is like a password)
vault write -f auth/approle/role/myapp/secret-id

# Authenticate using RoleID and SecretID
vault write auth/approle/login \
    role_id="<role-id>" \
    secret_id="<secret-id>"
```

## Policies

Policies in Vault control what a user or application can access. They are written in HCL (HashiCorp Configuration Language) or JSON.

```mermaid
flowchart TD
    subgraph Policy["Policy Definition"]
        Path["Path Specification"]
        Caps["Capabilities"]
    end

    subgraph Capabilities["Available Capabilities"]
        Create["create"]
        Read["read"]
        Update["update"]
        Delete["delete"]
        List["list"]
        Sudo["sudo"]
        Deny["deny"]
    end

    Path --> Caps
    Caps --> Create
    Caps --> Read
    Caps --> Update
    Caps --> Delete
    Caps --> List
    Caps --> Sudo
    Caps --> Deny
```

### Creating a Policy

Create a file called `myapp-policy.hcl`:

```hcl
# Policy for the myapp application
# This policy grants read access to secrets under secret/data/myapp/

# Allow reading secrets at the myapp path
path "secret/data/myapp/*" {
  # capabilities define what operations are allowed
  capabilities = ["read", "list"]
}

# Allow the app to read its own metadata
path "secret/metadata/myapp/*" {
  capabilities = ["read", "list"]
}

# Allow reading database credentials
path "database/creds/myapp-role" {
  capabilities = ["read"]
}

# Deny access to admin secrets explicitly
path "secret/data/admin/*" {
  capabilities = ["deny"]
}
```

### Applying the Policy

```bash
# Create the policy from the HCL file
vault policy write myapp-secrets myapp-policy.hcl

# List all policies
vault policy list

# Read a specific policy
vault policy read myapp-secrets

# Delete a policy
vault policy delete myapp-secrets
```

### Testing Policy Access

```bash
# Create a token with the policy
vault token create -policy=myapp-secrets -ttl=1h

# Switch to using that token
export VAULT_TOKEN='<new-token>'

# Try to read an allowed path (should work)
vault kv get -mount=secret myapp/config

# Try to read a denied path (should fail)
vault kv get -mount=secret admin/config
```

## Dynamic Secrets with the Database Engine

One of Vault's most powerful features is generating dynamic secrets. Here is an example with PostgreSQL.

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure the database connection
vault write database/config/my-postgresql-database \
    plugin_name=postgresql-database-plugin \
    allowed_roles="readonly-role,readwrite-role" \
    connection_url="postgresql://{{username}}:{{password}}@localhost:5432/mydb?sslmode=disable" \
    username="vault-admin" \
    password="vault-admin-password"

# Create a role that defines the SQL for creating users
vault write database/roles/readonly-role \
    db_name=my-postgresql-database \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Generate dynamic credentials
# Each call creates a new database user with the specified permissions
vault read database/creds/readonly-role

# Output will look like:
# Key                Value
# ---                -----
# lease_id           database/creds/readonly-role/abcd1234
# lease_duration     1h
# lease_renewable    true
# password           A1a-xxxxxxxxxxxxxxxxxx
# username           v-token-readonly-role-xxxxxxxxxx
```

## Using Vault in Your Application

### Python Example

```python
#!/usr/bin/env python3
"""
Example showing how to use HashiCorp Vault with Python.
Requires the hvac library: pip install hvac
"""

import hvac
import os

def get_vault_client():
    """
    Create and return an authenticated Vault client.
    Uses environment variables for configuration.
    """
    # Initialize the client with the Vault server address
    client = hvac.Client(
        url=os.environ.get('VAULT_ADDR', 'http://127.0.0.1:8200'),
        token=os.environ.get('VAULT_TOKEN')
    )

    # Verify the client is authenticated
    if not client.is_authenticated():
        raise Exception("Vault authentication failed")

    return client

def read_secret(client, path):
    """
    Read a secret from the KV v2 secrets engine.

    Args:
        client: Authenticated Vault client
        path: Path to the secret (e.g., 'myapp/config')

    Returns:
        Dictionary containing the secret data
    """
    # Read from the KV v2 secrets engine
    # The mount_point parameter specifies which secrets engine to use
    secret = client.secrets.kv.v2.read_secret_version(
        path=path,
        mount_point='secret'
    )

    # The actual secret data is nested under 'data' -> 'data'
    return secret['data']['data']

def write_secret(client, path, secret_data):
    """
    Write a secret to the KV v2 secrets engine.

    Args:
        client: Authenticated Vault client
        path: Path where the secret will be stored
        secret_data: Dictionary of key-value pairs to store
    """
    client.secrets.kv.v2.create_or_update_secret(
        path=path,
        secret=secret_data,
        mount_point='secret'
    )

def main():
    # Create the Vault client
    client = get_vault_client()

    # Write a secret
    write_secret(client, 'myapp/database', {
        'host': 'db.example.com',
        'port': '5432',
        'username': 'myapp',
        'password': 'supersecret'
    })
    print("Secret written successfully")

    # Read the secret back
    db_config = read_secret(client, 'myapp/database')
    print(f"Database host: {db_config['host']}")
    print(f"Database port: {db_config['port']}")

if __name__ == '__main__':
    main()
```

### Go Example

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	vault "github.com/hashicorp/vault/api"
)

func main() {
	// Create a new Vault client configuration
	config := vault.DefaultConfig()

	// Set the Vault address from environment variable or use default
	config.Address = os.Getenv("VAULT_ADDR")
	if config.Address == "" {
		config.Address = "http://127.0.0.1:8200"
	}

	// Create the client
	client, err := vault.NewClient(config)
	if err != nil {
		log.Fatalf("Failed to create Vault client: %v", err)
	}

	// Set the token for authentication
	// In production, use a more secure method like AppRole
	client.SetToken(os.Getenv("VAULT_TOKEN"))

	// Create a context for the API calls
	ctx := context.Background()

	// Write a secret to the KV v2 secrets engine
	secretData := map[string]interface{}{
		"data": map[string]interface{}{
			"api_key":    "my-api-key-12345",
			"api_secret": "my-api-secret-67890",
		},
	}

	// Write the secret
	// The path format for KV v2 is: secret/data/<path>
	_, err = client.KVv2("secret").Put(ctx, "myapp/api-credentials", secretData["data"].(map[string]interface{}))
	if err != nil {
		log.Fatalf("Failed to write secret: %v", err)
	}
	fmt.Println("Secret written successfully")

	// Read the secret back
	secret, err := client.KVv2("secret").Get(ctx, "myapp/api-credentials")
	if err != nil {
		log.Fatalf("Failed to read secret: %v", err)
	}

	// Access the secret data
	apiKey := secret.Data["api_key"].(string)
	fmt.Printf("API Key: %s\n", apiKey)
}
```

### Node.js Example

```javascript
/**
 * Example showing how to use HashiCorp Vault with Node.js.
 * Requires the node-vault library: npm install node-vault
 */

const vault = require('node-vault');

async function main() {
    // Initialize the Vault client
    // Configuration is picked up from environment variables
    const client = vault({
        apiVersion: 'v1',
        endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
        token: process.env.VAULT_TOKEN
    });

    try {
        // Write a secret to the KV v2 secrets engine
        // Note: For KV v2, the path includes 'data' after the mount point
        await client.write('secret/data/myapp/config', {
            data: {
                database_url: 'postgresql://localhost:5432/myapp',
                redis_url: 'redis://localhost:6379',
                jwt_secret: 'my-jwt-secret-key'
            }
        });
        console.log('Secret written successfully');

        // Read the secret back
        const result = await client.read('secret/data/myapp/config');

        // Access the secret data
        // For KV v2, the data is nested under data.data
        const secrets = result.data.data;
        console.log('Database URL:', secrets.database_url);
        console.log('Redis URL:', secrets.redis_url);

        // List secrets at a path
        const list = await client.list('secret/metadata/myapp');
        console.log('Secrets in myapp/:', list.data.keys);

    } catch (error) {
        console.error('Vault error:', error.message);
        process.exit(1);
    }
}

main();
```

## Production Considerations

When moving to production, keep these points in mind:

```mermaid
flowchart TD
    subgraph Production["Production Checklist"]
        HA["High Availability Setup"]
        TLS["TLS/SSL Encryption"]
        Storage["Persistent Storage Backend"]
        Audit["Audit Logging"]
        Seal["Auto-unseal Configuration"]
        Backup["Backup Strategy"]
        Monitor["Monitoring & Alerting"]
    end

    HA --> |"Use"| Raft["Integrated Storage / Raft"]
    HA --> |"Or"| Consul["Consul Backend"]

    TLS --> |"Configure"| Certs["TLS Certificates"]

    Seal --> |"Options"| AWS_KMS["AWS KMS"]
    Seal --> |"Options"| GCP_KMS["GCP Cloud KMS"]
    Seal --> |"Options"| Azure_KV["Azure Key Vault"]
    Seal --> |"Options"| HSM["HSM"]
```

### Example Production Configuration

```hcl
# vault-config.hcl
# Production configuration for HashiCorp Vault

# Enable the UI
ui = true

# Disable memory locking (enable in production with proper capabilities)
disable_mlock = false

# Storage backend using integrated storage (Raft)
storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-node-1"
}

# Listener configuration with TLS
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"
}

# API address for cluster communication
api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault-node-1.example.com:8201"

# Auto-unseal using AWS KMS
seal "awskms" {
  region     = "us-west-2"
  kms_key_id = "alias/vault-unseal-key"
}

# Telemetry for monitoring
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}

# Audit logging to file
audit {
  type = "file"
  path = "file"
  options = {
    file_path = "/var/log/vault/audit.log"
  }
}
```

## Summary

HashiCorp Vault provides a robust solution for secrets management with features like:

- **Centralized Secrets Storage**: Store all your secrets in one secure location
- **Dynamic Secrets**: Generate credentials on-demand with automatic expiration
- **Encryption as a Service**: Encrypt data without managing encryption keys
- **Flexible Authentication**: Support for multiple authentication methods
- **Fine-grained Access Control**: Policies that control exactly who can access what
- **Audit Logging**: Complete audit trail of all secret access

Start with the development server to learn the basics, then gradually move to a production setup with proper high availability, TLS encryption, and audit logging enabled.

## Additional Resources

- [Official Vault Documentation](https://developer.hashicorp.com/vault/docs)
- [Vault Tutorial Series](https://developer.hashicorp.com/vault/tutorials)
- [Vault API Documentation](https://developer.hashicorp.com/vault/api-docs)
- [Vault GitHub Repository](https://github.com/hashicorp/vault)
