# How to Encrypt Only Specific Fields with SOPS in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, SOPS, Partial Encryption

Description: Learn how to selectively encrypt only specific fields in Kubernetes manifests using SOPS encrypted_regex and encrypted_suffix for Flux CD.

---

By default, SOPS encrypts all values in a YAML file. However, in a Flux CD GitOps workflow, you often want to keep metadata fields (like `apiVersion`, `kind`, `metadata`) in plaintext so Git diffs remain useful and reviewable. SOPS provides several mechanisms for selective field encryption: `encrypted_regex`, `encrypted_suffix`, `encrypted_comment_regex`, and `unencrypted_regex`.

## Why Encrypt Only Specific Fields?

When you encrypt an entire Kubernetes manifest, the Git diff becomes unreadable. By encrypting only sensitive fields like `data` and `stringData`, you get several benefits:

- Readable Git diffs showing which resources changed
- Ability to review metadata changes in pull requests
- Easier debugging when secrets are not applied correctly
- Flux can still parse the resource metadata for reconciliation

## Using encrypted_regex

The `encrypted_regex` flag matches top-level YAML keys by regular expression. Only matching keys have their values encrypted.

```bash
# Encrypt only data and stringData fields using encrypted_regex
sops --encrypt \
  --age age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

Given this input file:

```yaml
# secret.yaml - Input file
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
  labels:
    app: myapp
type: Opaque
stringData:
  username: admin
  password: super-secret
```

The encrypted output preserves all metadata in plaintext.

```yaml
# secret.enc.yaml - Only stringData values are encrypted
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
  labels:
    app: myapp
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:dGVzdA==,iv:...,tag:...,type:str]
  password: ENC[AES256_GCM,data:c3VwZXItc2VjcmV0,iv:...,tag:...,type:str]
sops:
  # ... SOPS metadata
```

## Configuring encrypted_regex in .sops.yaml

Define the encryption regex in your `.sops.yaml` so the team does not need to remember the flag.

```yaml
# .sops.yaml - Standard Kubernetes secret encryption
creation_rules:
  # For Kubernetes Secrets, encrypt data and stringData
  - path_regex: .*secret.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # For HelmRelease values, encrypt only the values section
  - path_regex: .*helmrelease.*\.enc\.yaml$
    encrypted_regex: ^(spec)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

## Using encrypted_suffix

The `encrypted_suffix` flag encrypts only keys that end with a specific suffix. This is useful for custom configuration files.

```bash
# Encrypt only keys ending with _secret
sops --encrypt \
  --age age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
  --encrypted-suffix _secret \
  config.yaml > config.enc.yaml
```

Given this input:

```yaml
# config.yaml - Mixed sensitive and non-sensitive values
app_name: my-application
app_port: 8080
database_host: postgres.example.com
database_password_secret: super-secret-password
api_key_secret: sk-1234567890
log_level: info
```

Only keys ending with `_secret` are encrypted.

```yaml
# config.enc.yaml - Only _secret fields encrypted
app_name: my-application
app_port: 8080
database_host: postgres.example.com
database_password_secret: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
api_key_secret: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
log_level: info
```

## Using unencrypted_regex

The `unencrypted_regex` flag works in reverse: it specifies which keys should NOT be encrypted. Everything else gets encrypted.

```bash
# Keep apiVersion, kind, metadata, and type unencrypted
sops --encrypt \
  --age age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
  --unencrypted-regex '^(apiVersion|kind|metadata|type)$' \
  secret.yaml > secret.enc.yaml
```

## Practical Examples for Flux CD

### Encrypting Kubernetes Secrets

The most common use case: encrypt only the secret values.

```yaml
# .sops.yaml
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1key...
```

### Encrypting ConfigMaps with Sensitive Data

Sometimes ConfigMaps contain sensitive configuration.

```yaml
# configmap.yaml - ConfigMap with mixed content
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: default
data:
  config.json: |
    {
      "database_url": "postgres://user:password@host:5432/db",
      "log_level": "info"
    }
```

```bash
# Encrypt only the data field of the ConfigMap
sops --encrypt \
  --age age1key... \
  --encrypted-regex '^(data)$' \
  configmap.yaml > configmap.enc.yaml
```

### Encrypting Specific Nested Fields

For more granular control, use SOPS in-place editing to encrypt specific paths.

```bash
# Edit a file with SOPS (opens in $EDITOR with decrypted view)
# Only the fields matching encrypted_regex will be re-encrypted on save
EDITOR="vim" sops secret.enc.yaml
```

## Verifying Partial Encryption

After encrypting, verify that the correct fields were encrypted and metadata remains readable.

```bash
# Check which fields are encrypted
cat secret.enc.yaml | grep -E "^(apiVersion|kind|metadata|type|data|stringData)"

# Verify you can still parse the metadata
kubectl apply --dry-run=client -f <(sops --decrypt secret.enc.yaml)

# Decrypt and inspect the full content
sops --decrypt secret.enc.yaml
```

## Integration with Flux Kustomization

The Flux Kustomization decryption provider handles partially encrypted files seamlessly. No special configuration is needed beyond the standard SOPS decryption setup.

```yaml
# Standard Flux Kustomization - works with partially encrypted files
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Pre-commit Validation

Add a pre-commit hook to ensure developers use the correct encryption regex and do not accidentally commit plaintext secrets.

```bash
#!/bin/bash
# .git/hooks/pre-commit - Verify SOPS encryption

for file in $(git diff --cached --name-only --diff-filter=ACM | grep '\.enc\.yaml$'); do
  # Check if the file contains SOPS metadata
  if ! grep -q "sops:" "$file"; then
    echo "ERROR: $file appears to be unencrypted"
    exit 1
  fi

  # Check that non-sensitive fields are in plaintext
  if ! grep -q "^apiVersion:" "$file"; then
    echo "WARNING: $file may have metadata encrypted. Check encrypted_regex."
  fi
done
```

Selective field encryption is essential for maintaining a usable GitOps workflow. By encrypting only what needs to be secret, you preserve the auditability and reviewability that make Git-based operations valuable while keeping sensitive data secure.
