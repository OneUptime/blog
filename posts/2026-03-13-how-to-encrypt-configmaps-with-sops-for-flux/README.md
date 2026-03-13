# How to Encrypt ConfigMaps with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, ConfigMap, Configuration

Description: Learn how to encrypt sensitive ConfigMap data using SOPS in Flux when your application reads credentials from ConfigMaps instead of Secrets.

---

While Kubernetes Secrets are the standard way to store sensitive data, many applications read configuration from ConfigMaps that may contain sensitive values like database connection strings, API endpoints with embedded tokens, or configuration files with credentials. This guide shows how to encrypt ConfigMaps with SOPS for secure storage in your Flux GitOps repository.

## Why Encrypt ConfigMaps

Some applications do not distinguish between sensitive and non-sensitive configuration. They expect all configuration in a single ConfigMap, including passwords and API keys. Other times, configuration files like `application.yaml` or `config.json` contain a mix of sensitive and non-sensitive settings. Encrypting these ConfigMaps ensures credentials are not exposed in your Git repository.

## Prerequisites

You need:

- A Kubernetes cluster with Flux and SOPS decryption configured
- SOPS and age CLI tools installed
- An age key pair with the private key stored as a secret in the flux-system namespace

## Configuring SOPS for ConfigMaps

Set up `.sops.yaml` to encrypt ConfigMap data fields:

```yaml
creation_rules:
  - path_regex: .*configmap.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|binaryData)$
```

This encrypts the `data` and `binaryData` fields while keeping metadata readable.

## Encrypting a Simple ConfigMap

Create a ConfigMap with sensitive values:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  DATABASE_URL: "postgresql://appuser:secretpassword@db.example.com:5432/mydb"
  REDIS_URL: "redis://:redispassword@redis.example.com:6379/0"
  LOG_LEVEL: "info"
  APP_PORT: "8080"
```

Encrypt it with SOPS:

```bash
sops --encrypt --in-place app-configmap.yaml
```

After encryption, the `data` values are encrypted while the ConfigMap metadata stays readable:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  DATABASE_URL: ENC[AES256_GCM,data:...,type:str]
  REDIS_URL: ENC[AES256_GCM,data:...,type:str]
  LOG_LEVEL: ENC[AES256_GCM,data:...,type:str]
  APP_PORT: ENC[AES256_GCM,data:...,type:str]
sops:
  # ... metadata ...
```

Note that with `encrypted_regex: ^(data)$`, all keys under `data` are encrypted, including non-sensitive ones like `LOG_LEVEL`. If you want to encrypt only specific keys, you need a different approach.

## Selectively Encrypting ConfigMap Values

To encrypt only specific keys within a ConfigMap, use a more targeted regex or restructure your configuration:

```yaml
creation_rules:
  - path_regex: .*configmap.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data)$
```

Alternatively, split your ConfigMap into sensitive and non-sensitive parts:

```yaml
# plain-configmap.yaml (not encrypted)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-plain
  namespace: default
data:
  LOG_LEVEL: "info"
  APP_PORT: "8080"
```

```yaml
# secret-configmap.yaml (encrypted with SOPS)
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-secret
  namespace: default
data:
  DATABASE_URL: "postgresql://appuser:secretpassword@db.example.com:5432/mydb"
  REDIS_URL: "redis://:redispassword@redis.example.com:6379/0"
```

## Encrypting ConfigMaps with Embedded Files

ConfigMaps often contain embedded configuration files:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config-file
  namespace: default
data:
  application.yaml: |
    server:
      port: 8080
    database:
      url: jdbc:postgresql://db.example.com:5432/mydb
      username: appuser
      password: secretdbpassword
    cache:
      redis:
        host: redis.example.com
        password: redispass123
```

Encrypt the entire ConfigMap data:

```bash
sops --encrypt --in-place app-config-file.yaml
```

The embedded `application.yaml` content is encrypted as a single string value.

## Flux Kustomization Setup

Configure your Flux Kustomization with SOPS decryption:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

When Flux reconciles, it decrypts the SOPS-encrypted ConfigMap and applies the plaintext ConfigMap to the cluster.

## Converting Sensitive ConfigMaps to Secrets

A better pattern when possible is to convert sensitive ConfigMaps to Kubernetes Secrets. Secrets are base64 encoded in the cluster and can be restricted with RBAC:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: default
type: Opaque
stringData:
  DATABASE_URL: "postgresql://appuser:secretpassword@db.example.com:5432/mydb"
  REDIS_URL: "redis://:redispassword@redis.example.com:6379/0"
```

Then reference both the ConfigMap and Secret in your deployment:

```yaml
envFrom:
  - configMapRef:
      name: app-config-plain
  - secretRef:
      name: app-credentials
```

## Directory Layout

A recommended layout for mixed configuration:

```text
config/
  kustomization.yaml
  plain-configmap.yaml          # Not encrypted
  secret-configmap.yaml         # SOPS encrypted
  app-credentials-secret.yaml   # SOPS encrypted
```

## Editing Encrypted ConfigMaps

Use the SOPS editor integration to modify encrypted ConfigMaps:

```bash
sops secret-configmap.yaml
```

This opens the decrypted content in your editor. After saving, SOPS re-encrypts the file automatically.

## Verifying Deployment

After pushing changes, verify the ConfigMap is correctly deployed:

```bash
# Check Flux reconciliation
flux get kustomizations app-config

# Verify the ConfigMap exists with decrypted data
kubectl get configmap app-config -n default -o yaml

# Check that the application can read the configuration
kubectl logs deployment/myapp -n default | head -20
```

## Conclusion

Encrypting ConfigMaps with SOPS in Flux ensures that sensitive configuration values are protected in your Git repository. While converting sensitive data to Kubernetes Secrets is generally preferred, SOPS-encrypted ConfigMaps provide a practical solution when applications expect configuration in ConfigMap format. Flux handles the decryption seamlessly during reconciliation.
