# How to implement Vault secret versioning and rollback for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Kubernetes, Secret Versioning, Version Control, Rollback

Description: Master Vault's KV v2 secret versioning to track changes, roll back to previous versions, and implement safe secret management practices in Kubernetes environments.

---

Secrets change over time due to rotation policies, security incidents, or configuration updates. Without versioning, recovering from bad updates becomes impossible. Vault's KV version 2 secrets engine provides full version control for secrets, allowing you to track changes, roll back mistakes, and audit modifications. This guide shows you how to leverage secret versioning in Kubernetes.

## Understanding KV V2 Versioning

The KV version 2 engine stores every version of a secret, maintaining a complete history. Each update creates a new version while preserving previous ones. You can retrieve any historical version, permanently delete specific versions, or restore deleted versions before they're permanently destroyed.

Key concepts include current version (the latest version), version history (all previous versions), soft delete (marking versions as deleted), hard delete (permanently removing versions), and check-and-set (conditional updates based on version).

## Enabling KV V2 Secrets Engine

Set up versioned secrets:

```bash
# Enable KV v2 at default path
vault secrets enable -version=2 kv

# Enable at custom path
vault secrets enable -path=secret -version=2 kv

# Upgrade existing KV v1 to v2
vault kv enable-versioning secret/

# Verify version
vault secrets list -detailed | grep kv
```

## Creating and Updating Versioned Secrets

Write secrets with automatic versioning:

```bash
# Create initial secret (version 1)
vault kv put secret/app/config \
  database_url="postgresql://localhost:5432/db" \
  api_key="initial-key-123"

# Update secret (creates version 2)
vault kv put secret/app/config \
  database_url="postgresql://prod-db:5432/db" \
  api_key="updated-key-456"

# Update specific field (creates version 3)
vault kv patch secret/app/config \
  api_key="patched-key-789"

# View current version
vault kv get secret/app/config

# View specific version
vault kv get -version=1 secret/app/config

# View version metadata
vault kv metadata get secret/app/config
```

## Viewing Secret History

Track all changes to a secret:

```bash
# List all versions
vault kv metadata get secret/app/config

# Output shows:
# Key                     Value
# ---                     -----
# created_time            2024-02-09T10:00:00Z
# current_version         3
# max_versions            0
# oldest_version          1
# updated_time            2024-02-09T12:00:00Z
# versions:
#   1:
#     created_time: 2024-02-09T10:00:00Z
#     deletion_time: n/a
#     destroyed: false
#   2:
#     created_time: 2024-02-09T11:00:00Z
#     deletion_time: n/a
#     destroyed: false
#   3:
#     created_time: 2024-02-09T12:00:00Z
#     deletion_time: n/a
#     destroyed: false

# Get specific version data
vault kv get -version=2 secret/app/config
```

## Implementing Check-and-Set Updates

Prevent concurrent update conflicts:

```bash
# Get current version number
VERSION=$(vault kv metadata get -format=json secret/app/config | jq -r '.data.current_version')

# Update only if current version matches
vault kv put -cas=$VERSION secret/app/config \
  database_url="postgresql://new-db:5432/db" \
  api_key="new-key-101112"

# If version doesn't match, update fails:
# Error: check-and-set parameter did not match the current version
```

Implement in Go:

```go
func UpdateSecretSafely(client *vault.Client, path string, data map[string]interface{}) error {
    // Get current version
    metadata, err := client.Logical().Read(path + "/metadata")
    if err != nil {
        return err
    }

    currentVersion := metadata.Data["current_version"].(json.Number)
    version, _ := currentVersion.Int64()

    // Prepare data with CAS
    data["options"] = map[string]interface{}{
        "cas": version,
    }

    // Attempt update
    _, err = client.Logical().Write(path + "/data", map[string]interface{}{
        "data":    data,
        "options": map[string]interface{}{"cas": version},
    })

    if err != nil {
        return fmt.Errorf("update failed, secret was modified: %v", err)
    }

    return nil
}
```

## Rolling Back to Previous Versions

Restore previous secret versions:

```bash
# View version 1 content
vault kv get -version=1 secret/app/config

# Rollback by writing version 1 data as new version
vault kv get -version=1 -format=json secret/app/config | \
  jq -r '.data.data' | \
  vault kv put secret/app/config -

# Or use patch to rollback specific fields
OLD_KEY=$(vault kv get -version=1 -field=api_key secret/app/config)
vault kv patch secret/app/config api_key="$OLD_KEY"
```

Create a rollback script:

```bash
#!/bin/bash
# rollback-secret.sh

SECRET_PATH=$1
TARGET_VERSION=$2

if [ -z "$SECRET_PATH" ] || [ -z "$TARGET_VERSION" ]; then
  echo "Usage: $0 <secret-path> <version>"
  exit 1
fi

# Get data from target version
DATA=$(vault kv get -version=$TARGET_VERSION -format=json $SECRET_PATH | \
  jq -r '.data.data')

if [ $? -ne 0 ]; then
  echo "Failed to get version $TARGET_VERSION"
  exit 1
fi

# Write as new version
echo "$DATA" | vault kv put $SECRET_PATH -

NEW_VERSION=$(vault kv metadata get -format=json $SECRET_PATH | \
  jq -r '.data.current_version')

echo "Rolled back $SECRET_PATH to version $TARGET_VERSION (now version $NEW_VERSION)"
```

## Soft Deleting Versions

Mark versions as deleted without permanent removal:

```bash
# Delete specific versions
vault kv delete -versions=2,3 secret/app/config

# Delete latest version
vault kv delete secret/app/config

# View metadata shows deletion_time
vault kv metadata get secret/app/config

# Undelete specific versions
vault kv undelete -versions=2,3 secret/app/config

# Retrieve undeleted version
vault kv get -version=2 secret/app/config
```

## Permanently Destroying Versions

Hard delete versions beyond recovery:

```bash
# Permanently destroy specific versions
vault kv destroy -versions=1,2 secret/app/config

# Metadata shows destroyed: true
vault kv metadata get secret/app/config

# Attempting to read destroyed version fails
vault kv get -version=1 secret/app/config
# Error: version is destroyed
```

## Configuring Version Limits

Control how many versions to retain:

```bash
# Set maximum versions to keep
vault kv metadata put -max-versions=5 secret/app/config

# Older versions auto-delete when limit exceeded

# Configure delete version after period
vault kv metadata put -delete-version-after=720h secret/app/config

# Versions older than 30 days auto-delete

# Combine both settings
vault kv metadata put \
  -max-versions=10 \
  -delete-version-after=2160h \
  secret/app/config
```

## Creating Policies for Version Access

Control who can access which versions:

```bash
vault policy write app-current-only - <<EOF
# Allow reading current version only
path "secret/data/app/*" {
  capabilities = ["read"]
}

# Allow updating (creates new versions)
path "secret/data/app/*" {
  capabilities = ["create", "update"]
}
EOF

vault policy write app-version-admin - <<EOF
# Full access to all versions
path "secret/data/app/*" {
  capabilities = ["create", "read", "update", "delete"]
}

# Access to metadata and version management
path "secret/metadata/app/*" {
  capabilities = ["read", "list", "update", "delete"]
}

# Can delete versions
path "secret/delete/app/*" {
  capabilities = ["update"]
}

# Can destroy versions
path "secret/destroy/app/*" {
  capabilities = ["update"]
}

# Can undelete versions
path "secret/undelete/app/*" {
  capabilities = ["update"]
}
EOF
```

## Implementing Version-Aware Applications

Read specific versions in applications:

```go
package main

import (
    "fmt"
    vault "github.com/hashicorp/vault/api"
)

type VersionedSecret struct {
    client *vault.Client
    path   string
}

func (vs *VersionedSecret) GetCurrent() (map[string]interface{}, error) {
    secret, err := vs.client.Logical().Read(vs.path + "/data")
    if err != nil {
        return nil, err
    }

    return secret.Data["data"].(map[string]interface{}), nil
}

func (vs *VersionedSecret) GetVersion(version int) (map[string]interface{}, error) {
    params := map[string]interface{}{
        "version": version,
    }

    secret, err := vs.client.Logical().ReadWithData(vs.path+"/data", params)
    if err != nil {
        return nil, err
    }

    return secret.Data["data"].(map[string]interface{}), nil
}

func (vs *VersionedSecret) GetHistory() ([]VersionInfo, error) {
    metadata, err := vs.client.Logical().Read(vs.path + "/metadata")
    if err != nil {
        return nil, err
    }

    versions := metadata.Data["versions"].(map[string]interface{})
    var history []VersionInfo

    for vnum, vdata := range versions {
        vinfo := vdata.(map[string]interface{})
        history = append(history, VersionInfo{
            Version:      vnum,
            CreatedTime:  vinfo["created_time"].(string),
            DeletionTime: vinfo["deletion_time"].(string),
            Destroyed:    vinfo["destroyed"].(bool),
        })
    }

    return history, nil
}

func (vs *VersionedSecret) Rollback(targetVersion int) error {
    // Get target version data
    data, err := vs.GetVersion(targetVersion)
    if err != nil {
        return err
    }

    // Write as new version
    _, err = vs.client.Logical().Write(vs.path+"/data", map[string]interface{}{
        "data": data,
    })

    return err
}

type VersionInfo struct {
    Version      string
    CreatedTime  string
    DeletionTime string
    Destroyed    bool
}
```

## Auditing Version Changes

Track who changed what and when:

```bash
# Enable audit logging
vault audit enable file file_path=/vault/logs/audit.log

# Query version changes
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq 'select(.request.path | contains("secret/data/app/config"))'

# Filter by operation
kubectl -n vault exec vault-0 -- cat /vault/logs/audit.log | \
  jq 'select(.request.path | contains("secret/data")) |
      select(.request.operation == "update") |
      {time: .time, user: .auth.display_name, path: .request.path}'
```

## Automating Version Cleanup

Create cleanup job:

```yaml
# vault-version-cleanup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vault-version-cleanup
  namespace: vault
spec:
  schedule: "0 0 * * 0"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: vault-admin-sa
          containers:
          - name: cleanup
            image: hashicorp/vault:latest
            env:
            - name: VAULT_ADDR
              value: "http://vault:8200"
            command:
            - /bin/sh
            - -c
            - |
              # Authenticate
              VAULT_TOKEN=$(vault write -field=token auth/kubernetes/login \
                role=admin jwt=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token))
              export VAULT_TOKEN

              # List all secrets
              SECRETS=$(vault kv list -format=json secret/ | jq -r '.[]')

              # For each secret, destroy old versions
              for secret in $SECRETS; do
                echo "Processing secret/$secret"

                # Get versions older than 90 days
                OLD_VERSIONS=$(vault kv metadata get -format=json secret/$secret | \
                  jq -r '.data.versions | to_entries[] |
                    select(.value.created_time | fromdateiso8601 < (now - 7776000)) |
                    .key')

                if [ -n "$OLD_VERSIONS" ]; then
                  echo "Destroying versions: $OLD_VERSIONS"
                  vault kv destroy -versions="$OLD_VERSIONS" secret/$secret
                fi
              done
          restartPolicy: OnFailure
```

## Best Practices

Always use KV v2 for production secrets to enable versioning. Configure appropriate max-versions limits to prevent unbounded growth. Implement check-and-set for critical secrets to prevent concurrent update issues. Document rollback procedures before incidents occur. Use soft delete first, hard delete only when certain. Regularly audit version history for unexpected changes. Automate cleanup of old versions to manage storage. Test rollback procedures in non-production environments.

Vault's secret versioning provides safety and auditability for secret management. With the ability to track every change, roll back mistakes, and prevent concurrent updates, you can manage secrets confidently in production Kubernetes environments. These version control capabilities are essential for maintaining reliable and secure secret management practices.
