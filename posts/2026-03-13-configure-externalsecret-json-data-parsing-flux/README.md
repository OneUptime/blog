# How to Configure ExternalSecret with JSON Data Parsing with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, JSON, Secret Parsing

Description: Parse JSON-structured secrets from external stores using ESO ExternalSecret with Flux CD, enabling fine-grained field extraction from complex secret objects.

---

## Introduction

Modern secret stores often store secrets as JSON objects rather than flat strings. A single AWS Secrets Manager secret might contain a JSON blob with a database hostname, port, username, password, and SSL certificate — all logically grouped together. The External Secrets Operator provides powerful JSON parsing capabilities to extract individual fields from these complex secret structures and map them to specific Kubernetes Secret keys.

Understanding JSON data parsing in `ExternalSecret` resources lets you design your secret store layout around logical groupings (one secret per application, one secret per service) rather than being forced into one-key-per-secret organization to satisfy Kubernetes. Managed through Flux CD, these parsing configurations are version-controlled alongside the applications that consume them.

This guide covers the different JSON parsing strategies available in ESO: property extraction, nested key access, and using `dataFrom` to expand JSON objects.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- A `SecretStore` configured and validated
- External secrets stored as JSON objects (common in AWS Secrets Manager, Vault)

## Step 1: Understand JSON Secret Layout in External Stores

Assume AWS Secrets Manager contains:

**Secret name:** `myapp/database`
**Secret value:**
```json
{
  "host": "db.example.com",
  "port": "5432",
  "username": "appuser",
  "password": "s3cr3t-p@ssw0rd",
  "ssl_mode": "require",
  "connection_string": "postgres://appuser:s3cr3t-p@ssw0rd@db.example.com:5432/mydb"
}
```

## Step 2: Extract Individual JSON Properties

Use `remoteRef.property` to extract specific fields from a JSON secret:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-json-extract.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-db-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-db
    creationPolicy: Owner
  data:
    # Extract the 'host' field from the JSON object
    - secretKey: DB_HOST
      remoteRef:
        key: myapp/database
        property: host

    # Extract the 'password' field
    - secretKey: DB_PASSWORD
      remoteRef:
        key: myapp/database
        property: password

    # Extract the full connection string
    - secretKey: DATABASE_URL
      remoteRef:
        key: myapp/database
        property: connection_string
```

## Step 3: Extract Nested JSON Fields

For deeply nested JSON structures, use dot notation or bracket notation in the `property` field:

**Secret value (Vault KV):**
```json
{
  "prod": {
    "database": {
      "host": "prod-db.example.com",
      "password": "prod-secret"
    }
  }
}
```

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-nested-json.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-nested-config
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: hashicorp-vault
    kind: SecretStore
  target:
    name: myapp-nested
    creationPolicy: Owner
  data:
    # Use dot notation to access nested fields
    - secretKey: DB_HOST
      remoteRef:
        key: myapp/config
        # Access prod.database.host using dot notation
        property: prod.database.host
    - secretKey: DB_PASSWORD
      remoteRef:
        key: myapp/config
        property: prod.database.password
```

## Step 4: Expand Full JSON Object with dataFrom

Use `dataFrom.extract` to explode all top-level JSON fields into Kubernetes Secret keys:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-datafrom-extract.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-full-config
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-full-config
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: myapp/database
        # conversionStrategy controls how JSON keys are mapped to Secret keys
        # None: use keys as-is (host, password, ssl_mode)
        # Unicode: sanitize keys to valid Secret key format
        conversionStrategy: None
        decodingStrategy: None
```

The resulting Kubernetes Secret will contain keys: `host`, `port`, `username`, `password`, `ssl_mode`, `connection_string`.

## Step 5: Decode Base64-Encoded JSON Values

If the external store contains base64-encoded values within the JSON:

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-base64-decode.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-encoded-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-encoded
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: myapp/base64-config
        # Decode base64-encoded values automatically
        decodingStrategy: Base64
```

## Step 6: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/apps/myapp/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-secrets
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: secret-stores
```

## Step 7: Verify JSON Parsing

```bash
# Check sync status
kubectl get externalsecret myapp-db-secrets -n default

# Inspect the resulting Secret keys
kubectl get secret myapp-db -n default -o json | jq '.data | keys'

# Verify a specific field was parsed correctly
kubectl get secret myapp-db -n default \
  -o jsonpath='{.data.DB_HOST}' | base64 -d
```

## Best Practices

- Group logically related secrets into a single JSON object in the external store rather than creating many flat secrets; it reduces secret count and simplifies rotation.
- Use `conversionStrategy: Unicode` when your JSON keys contain characters invalid in Kubernetes Secret key names (spaces, dots in unusual positions).
- Document the expected JSON schema of each external secret in a comment on the `ExternalSecret` manifest so future developers know what structure is expected.
- Prefer `dataFrom.extract` for application config objects to keep `ExternalSecret` manifests concise and automatically adapt to new fields added to the JSON.
- Test JSON property path expressions locally using the ESO `kubectl` plugin before committing to Git.

## Conclusion

JSON data parsing in `ExternalSecret` resources allows your secret store layout to reflect logical application boundaries rather than Kubernetes key constraints. By managing these parsing configurations through Flux CD, application teams can evolve their secret structure through pull requests, ensuring that changes to both the external secret schema and the `ExternalSecret` mapping are reviewed together.
