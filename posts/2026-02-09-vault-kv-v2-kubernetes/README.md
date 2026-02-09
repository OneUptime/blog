# How to Use Vault KV v2 Secrets Engine with Kubernetes Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Kubernetes, KV Secrets, Secret Management, Versioning

Description: Learn how to leverage HashiCorp Vault's KV v2 secrets engine in Kubernetes applications with versioning, metadata, and access control for enhanced secret management.

---

The Key/Value version 2 (KV v2) secrets engine in HashiCorp Vault provides versioned secret storage with built-in metadata, soft deletes, and configurable retention policies. When integrated with Kubernetes applications, KV v2 offers a robust solution for managing configuration data and sensitive information. This guide demonstrates how to effectively use Vault KV v2 with Kubernetes workloads.

## Understanding KV v2 vs KV v1

KV v2 introduces several improvements over v1. The most significant is automatic versioning. Every write operation creates a new version, allowing you to track changes and roll back if needed. KV v2 also supports check-and-set operations to prevent concurrent modification issues, soft deletes that retain data for recovery, and custom metadata for organizing secrets.

Unlike KV v1, KV v2 uses a different API path structure. Secrets are written to `secret/data/path` and read from the same location, while metadata operations use `secret/metadata/path`. This separation allows for granular access control between secret data and metadata.

## Enabling and Configuring KV v2

Enable KV v2 in your Vault cluster:

```bash
# Enable KV v2 at the default path
vault secrets enable -version=2 kv

# Enable KV v2 at a custom path
vault secrets enable -path=app-secrets -version=2 kv

# Configure maximum versions to retain
vault write app-secrets/config max_versions=10

# Configure deletion policy
vault write app-secrets/config \
    max_versions=10 \
    cas_required=false \
    delete_version_after="30d"
```

The `delete_version_after` parameter automatically destroys old versions after the specified duration, helping manage storage usage.

## Writing Secrets to KV v2

Write secrets using the data path:

```bash
# Write a secret with multiple key-value pairs
vault kv put app-secrets/database \
    username="dbuser" \
    password="secure-password" \
    host="postgres.database.svc.cluster.local" \
    port="5432"

# Write with check-and-set to prevent overwriting
vault kv put -cas=0 app-secrets/api-keys \
    stripe="sk_test_123456" \
    sendgrid="SG.abcdef123456"

# Add metadata to a secret
vault kv metadata put -custom-metadata=environment=production \
    -custom-metadata=team=backend \
    app-secrets/database
```

The `-cas` flag ensures the write only succeeds if the current version matches the specified value. Use `-cas=0` for the initial write.

## Reading Secrets from KV v2

Read the latest version or specific versions:

```bash
# Read the latest version
vault kv get app-secrets/database

# Read a specific version
vault kv get -version=2 app-secrets/database

# Read only specific fields
vault kv get -field=password app-secrets/database

# Read in JSON format
vault kv get -format=json app-secrets/database | jq .
```

## Integrating KV v2 with Kubernetes Using External Secrets Operator

The External Secrets Operator provides a Kubernetes-native way to sync Vault secrets:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "http://vault.vault-system:8200"
      path: "app-secrets"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "production-apps"
          serviceAccountRef:
            name: app-serviceaccount
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-secret
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: database
      property: username
  - secretKey: password
    remoteRef:
      key: database
      property: password
  - secretKey: connection-string
    remoteRef:
      key: database
      property: host
```

This creates a Kubernetes Secret that automatically syncs with Vault.

## Using Vault Agent with KV v2

Configure Vault Agent to inject KV v2 secrets into pods:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-agent-config
  namespace: production
data:
  agent-config.hcl: |
    vault {
      address = "http://vault.vault-system:8200"
    }

    auto_auth {
      method {
        type = "kubernetes"
        config = {
          role = "production-apps"
        }
      }
      sink {
        type = "file"
        config = {
          path = "/vault/.vault-token"
        }
      }
    }

    template {
      destination = "/vault/secrets/config.json"
      contents = <<EOT
      {{- with secret "app-secrets/data/database" }}
      {
        "database": {
          "username": "{{ .Data.data.username }}",
          "password": "{{ .Data.data.password }}",
          "host": "{{ .Data.data.host }}",
          "port": "{{ .Data.data.port }}"
        }
      }
      {{- end }}
      EOT
    }

    template {
      destination = "/vault/secrets/api-keys.env"
      contents = <<EOT
      {{- with secret "app-secrets/data/api-keys" }}
      STRIPE_API_KEY={{ .Data.data.stripe }}
      SENDGRID_API_KEY={{ .Data.data.sendgrid }}
      {{- end }}
      EOT
    }
---
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
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "production-apps"
        vault.hashicorp.com/agent-inject-secret-config.json: "app-secrets/data/database"
        vault.hashicorp.com/agent-inject-secret-api-keys.env: "app-secrets/data/api-keys"
    spec:
      serviceAccountName: app-serviceaccount
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: vault-secrets
          mountPath: /vault/secrets
          readOnly: true
      volumes:
      - name: vault-secrets
        emptyDir:
          medium: Memory
```

Note the path structure: `app-secrets/data/database` is used to read secrets, not `app-secrets/database`.

## Managing Secret Versions

KV v2's versioning capabilities enable safe secret rotation:

```bash
# View version history
vault kv metadata get app-secrets/database

# Roll back to a previous version (create a new version with old data)
vault kv rollback -version=2 app-secrets/database

# Soft delete a version (can be undeleted)
vault kv delete -versions=3 app-secrets/database

# Permanently destroy a version
vault kv destroy -versions=3 app-secrets/database

# Undelete a soft-deleted version
vault kv undelete -versions=3 app-secrets/database
```

Implement version checking in applications:

```go
package main

import (
    "fmt"
    "github.com/hashicorp/vault/api"
)

func getSecretWithVersion(client *api.Client, path string, version int) (map[string]interface{}, error) {
    var secretPath string
    if version > 0 {
        secretPath = fmt.Sprintf("%s?version=%d", path, version)
    } else {
        secretPath = path
    }

    secret, err := client.Logical().Read(secretPath)
    if err != nil {
        return nil, fmt.Errorf("failed to read secret: %w", err)
    }

    if secret == nil || secret.Data == nil {
        return nil, fmt.Errorf("secret not found")
    }

    // KV v2 stores data under the "data" key
    data, ok := secret.Data["data"].(map[string]interface{})
    if !ok {
        return nil, fmt.Errorf("invalid secret format")
    }

    // Get metadata including version information
    metadata := secret.Data["metadata"].(map[string]interface{})
    currentVersion := metadata["version"]
    fmt.Printf("Retrieved secret version: %v\n", currentVersion)

    return data, nil
}
```

## Setting Up Access Control Policies

Create fine-grained policies for KV v2:

```hcl
# Policy for applications to read secrets
path "app-secrets/data/database" {
  capabilities = ["read"]
}

path "app-secrets/data/api-keys" {
  capabilities = ["read"]
}

# Policy for operators to manage secrets
path "app-secrets/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "app-secrets/metadata/*" {
  capabilities = ["list", "read"]
}

# Policy for auditors to view metadata only
path "app-secrets/metadata/*" {
  capabilities = ["read", "list"]
}

path "app-secrets/data/*" {
  capabilities = ["deny"]
}
```

Apply policies to Kubernetes service accounts:

```bash
vault write auth/kubernetes/role/production-apps \
    bound_service_account_names=app-serviceaccount \
    bound_service_account_namespaces=production \
    policies=app-read-secrets \
    ttl=1h
```

## Implementing Secret Rotation with KV v2

Automate secret rotation using CronJobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-database-password
  namespace: production
spec:
  schedule: "0 2 * * 0"  # Weekly at 2 AM Sunday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          containers:
          - name: rotator
            image: vault:1.15
            command:
            - /bin/sh
            - -c
            - |
              # Login to Vault
              export VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login \
                role=secret-rotator jwt=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token))

              # Generate new password
              NEW_PASSWORD=$(openssl rand -base64 32)

              # Read current secret
              CURRENT_VERSION=$(vault kv get -format=json app-secrets/database | jq -r .data.metadata.version)

              # Write new version with updated password
              vault kv put -cas=$CURRENT_VERSION app-secrets/database \
                username="dbuser" \
                password="$NEW_PASSWORD" \
                host="postgres.database.svc.cluster.local" \
                port="5432"

              # Update actual database password
              PGPASSWORD="$OLD_PASSWORD" psql -h postgres.database.svc.cluster.local \
                -U dbuser -c "ALTER USER dbuser WITH PASSWORD '$NEW_PASSWORD';"
          restartPolicy: OnFailure
```

## Monitoring and Auditing

Track KV v2 operations with audit logging:

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Query audit logs for KV v2 operations
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select(.request.path | startswith("app-secrets/data/"))'
```

Set up Prometheus metrics:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-vault-rules
  namespace: monitoring
data:
  kv-metrics.yaml: |
    groups:
    - name: vault-kv-v2
      rules:
      - record: vault_kv_secret_versions
        expr: vault_secret_kv_count{version="v2"}

      - alert: TooManySecretVersions
        expr: vault_secret_kv_count{version="v2"} > 50
        annotations:
          summary: "Secret has excessive versions"
```

## Best Practices

Always use the data path (`app-secrets/data/path`) when reading secrets, not the metadata path. Enable `cas_required` for secrets that require coordination between multiple writers to prevent race conditions.

Set appropriate `max_versions` limits to control storage usage. For secrets that change frequently, use lower limits. For audit-critical secrets, retain more versions.

Implement automated cleanup of old versions using the `delete_version_after` setting. This prevents unbounded storage growth while maintaining recent version history for rollbacks.

## Conclusion

Vault KV v2 provides a powerful, versioned secret storage solution that integrates seamlessly with Kubernetes. The combination of versioning, metadata, and soft deletes makes it ideal for production environments where secret history and recoverability matter. By following the patterns in this guide, you can build robust secret management workflows that balance security, operational flexibility, and audit requirements.
