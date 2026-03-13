# How to Configure SOPS Path-Based Encryption Rules in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Path Rules, Configuration

Description: Learn how to use SOPS path-based encryption rules to apply different encryption keys and settings based on file location in your Flux repository.

---

In a Flux GitOps repository, secrets often live in different directories corresponding to different clusters, environments, or applications. SOPS path-based encryption rules let you automatically apply the correct encryption keys and settings based on where a file is located. This guide shows you how to set up and use path-based rules effectively.

## Why Path-Based Rules Matter

A typical Flux repository organizes resources by cluster and environment. Different environments have different security requirements. Production secrets need stronger controls than development secrets. Path-based rules let you encode these requirements directly in your `.sops.yaml` configuration, so the right encryption is applied automatically without manual key selection.

## Repository Structure

Consider a standard Flux repository layout:

```
flux-repo/
  .sops.yaml
  clusters/
    dev/
      secrets/
        app-secret.yaml
        db-secret.yaml
    staging/
      secrets/
        app-secret.yaml
    production/
      secrets/
        app-secret.yaml
        db-secret.yaml
        api-keys.yaml
  infrastructure/
    secrets/
      registry-creds.yaml
```

## Configuring Path-Based Rules

Define rules that match each directory path:

```yaml
creation_rules:
  # Production secrets - strongest encryption with multiple keys
  - path_regex: clusters/production/secrets/.*\.yaml$
    age: >-
      age1prodkey1...,
      age1prodkey2...,
      age1backupkey...
    encrypted_regex: ^(data|stringData)$

  # Staging secrets
  - path_regex: clusters/staging/secrets/.*\.yaml$
    age: age1stagingkey...
    encrypted_regex: ^(data|stringData)$

  # Development secrets
  - path_regex: clusters/dev/secrets/.*\.yaml$
    age: age1devkey...
    encrypted_regex: ^(data|stringData)$

  # Infrastructure secrets shared across clusters
  - path_regex: infrastructure/secrets/.*\.yaml$
    age: >-
      age1infrakey...,
      age1backupkey...
    encrypted_regex: ^(data|stringData)$
```

## How Path Matching Works

SOPS uses the `path_regex` field to match against the file path relative to the `.sops.yaml` location. The path is matched as a regular expression. Key points to remember:

- Paths use forward slashes regardless of operating system
- The regex is matched against the full relative path
- The first matching rule wins, so order matters
- Dots in file extensions need escaping with backslash (`\.yaml$`)

## Generating Keys per Environment

Create separate age keys for each environment:

```bash
# Generate keys
age-keygen -o dev.agekey 2> dev.pub
age-keygen -o staging.agekey 2> staging.pub
age-keygen -o production.agekey 2> production.pub
age-keygen -o infrastructure.agekey 2> infrastructure.pub
age-keygen -o backup.agekey 2> backup.pub
```

Extract the public keys from each `.pub` file and place them in the `.sops.yaml` configuration.

## Deploying Keys to Clusters

Each Flux cluster needs only the key for its own environment:

```bash
# On the development cluster
cat dev.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin

# On the staging cluster
cat staging.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin

# On the production cluster
cat production.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

## Nested Path Rules

You can create rules for nested paths to handle sub-applications:

```yaml
creation_rules:
  # Payment service has its own key
  - path_regex: clusters/production/secrets/payment/.*\.yaml$
    age: age1paymentkey...
    encrypted_regex: ^(data|stringData)$

  # All other production secrets
  - path_regex: clusters/production/secrets/.*\.yaml$
    age: age1prodkey...
    encrypted_regex: ^(data|stringData)$
```

The payment service rule must come first since it is more specific. If the general production rule came first, payment service secrets would match it instead.

## Testing Path Rules

Verify which rule applies to a given file:

```bash
# Create a test secret in each path
for dir in clusters/dev/secrets clusters/staging/secrets clusters/production/secrets; do
  cat <<EOF > ${dir}/test-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: test
  namespace: default
type: Opaque
stringData:
  key: testvalue
EOF
  sops --encrypt --in-place ${dir}/test-secret.yaml
  echo "Encrypted ${dir}/test-secret.yaml successfully"
done
```

After encryption, inspect each file to confirm the correct key was used by checking the `sops.age` metadata section.

## Flux Kustomization per Environment

Configure Flux Kustomizations to point to the correct paths:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

Each cluster runs its own Kustomization pointing to its own secrets path, and Flux uses the cluster-specific age key to decrypt.

## Handling Shared Secrets

When secrets need to be shared across environments, encrypt them with all relevant keys:

```yaml
creation_rules:
  - path_regex: shared/secrets/.*\.yaml$
    age: >-
      age1devkey...,
      age1stagingkey...,
      age1prodkey...
    encrypted_regex: ^(data|stringData)$
```

Each cluster can decrypt the shared secrets with its own key.

## Conclusion

Path-based encryption rules in SOPS provide a clean, automatic way to apply the right encryption settings to secrets based on their location in your Flux repository. By aligning your directory structure with your encryption rules, you reduce the risk of misapplied keys and simplify your secret management workflow across multiple environments and clusters.
