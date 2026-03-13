# How to Configure SOPS Regex-Based Encryption Rules in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Regex, Configuration

Description: Learn how to use regex patterns in SOPS to selectively encrypt specific fields within Kubernetes manifests for your Flux GitOps workflow.

---

SOPS provides regex-based encryption rules that let you control exactly which fields within a file get encrypted. Instead of encrypting every value, you can target specific YAML keys using `encrypted_regex` or exclude certain keys using `unencrypted_regex`. This fine-grained control is especially useful in Flux deployments where you need encrypted secrets to remain partially readable for code reviews and debugging.

## Why Selective Field Encryption

Encrypting an entire Kubernetes manifest makes it impossible to review changes in pull requests. You cannot see which namespace a secret belongs to, what its name is, or what type it has. By using regex-based rules, you keep metadata visible while protecting only the sensitive values.

## Using encrypted_regex

The `encrypted_regex` field specifies a regular expression that matches YAML keys whose values should be encrypted. Only values under matching keys are encrypted:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData)$
```

With this rule, only the `data` and `stringData` fields of a Kubernetes Secret are encrypted. The `metadata`, `apiVersion`, `kind`, and `type` fields remain in plaintext.

## Before and After Encryption

Given this input secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
stringData:
  username: admin
  password: secret123
```

After encryption with `encrypted_regex: ^(data|stringData)$`, the file looks like:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:...,type:str]
  password: ENC[AES256_GCM,data:...,type:str]
sops:
  # ... SOPS metadata ...
```

The metadata remains readable, but the actual secret values are encrypted.

## Using unencrypted_regex

The inverse approach uses `unencrypted_regex` to specify which keys should remain unencrypted. Everything else gets encrypted:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1yourkey...
    unencrypted_regex: ^(apiVersion|kind|metadata|type)$
```

This achieves a similar result but from the opposite direction. Use whichever approach is simpler for your use case.

## Matching Nested Keys

The regex matches against the full key path in dot notation. For deeply nested structures, you can write patterns that match at any level:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData|password|secret|token|key)$
```

This encrypts any key named `password`, `secret`, `token`, or `key` regardless of where it appears in the YAML hierarchy.

## Environment-Specific Regex Rules

Different environments might need different encryption scopes:

```yaml
creation_rules:
  # Production: encrypt more aggressively
  - path_regex: production/.*\.yaml$
    age: age1prodkey...
    encrypted_regex: ^(data|stringData|spec)$

  # Development: only encrypt secret data
  - path_regex: dev/.*\.yaml$
    age: age1devkey...
    encrypted_regex: ^(data|stringData)$
```

## Using encrypted_suffix and unencrypted_suffix

In addition to regex, SOPS supports suffix-based rules:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1yourkey...
    encrypted_suffix: _secret
```

With this rule, only keys ending with `_secret` are encrypted:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  log_level: debug
  api_endpoint: https://api.example.com
  api_key_secret: mysecretapikey
```

After encryption, only `api_key_secret` would be encrypted while `log_level` and `api_endpoint` remain in plaintext.

## Combining Path and Key Regex

You can combine `path_regex` for file selection with `encrypted_regex` for field selection:

```yaml
creation_rules:
  - path_regex: secrets/database/.*\.yaml$
    age: age1dbkey...
    encrypted_regex: ^(data|stringData|password|connectionString)$

  - path_regex: secrets/api/.*\.yaml$
    age: age1apikey...
    encrypted_regex: ^(data|stringData|apiKey|token)$

  - path_regex: secrets/.*\.yaml$
    age: age1generalkey...
    encrypted_regex: ^(data|stringData)$
```

## Configuring Flux Kustomization

The Flux Kustomization does not need any special configuration for regex-based encryption. Flux decrypts the entire file using the SOPS provider:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Testing Regex Patterns

Before applying regex rules to your repository, test them on sample files:

```bash
# Create a test file
cat <<EOF > test.yaml
apiVersion: v1
kind: Secret
metadata:
  name: test
  namespace: default
type: Opaque
stringData:
  username: testuser
  password: testpass
data:
  config: dGVzdA==
EOF

# Encrypt with regex
sops --encrypt \
  --age age1yourkey... \
  --encrypted-regex '^(data|stringData)$' \
  test.yaml
```

Inspect the output to confirm that only the intended fields are encrypted.

## Common Regex Patterns

Here are regex patterns for common Kubernetes use cases:

```yaml
# Only Secret data fields
encrypted_regex: ^(data|stringData)$

# Passwords and tokens anywhere in the document
encrypted_regex: ^(password|token|secret|key|credential)$

# Everything except standard Kubernetes metadata
unencrypted_regex: ^(apiVersion|kind|metadata|type|spec\.selector|spec\.replicas)$

# Only values under a specific parent key
encrypted_regex: ^(data|stringData|spec\.template\.spec\.containers\[\d+\]\.env)$
```

## Best Practices

Use `encrypted_regex: ^(data|stringData)$` as your default for Kubernetes Secrets, as it keeps manifests reviewable in pull requests. Avoid overly broad patterns that encrypt metadata, since this breaks `kubectl diff` and makes debugging harder. Document your regex patterns with comments in `.sops.yaml` so team members understand what gets encrypted. Test regex patterns on representative files before applying them across the repository.

## Conclusion

Regex-based encryption rules in SOPS give you precise control over which fields are encrypted in your Flux-managed Kubernetes manifests. By targeting only sensitive fields, you maintain readability for code reviews while protecting the values that matter. Combined with path-based rules, regex patterns let you build a comprehensive and maintainable secret management strategy.
