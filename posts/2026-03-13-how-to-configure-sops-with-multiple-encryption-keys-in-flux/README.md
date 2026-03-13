# How to Configure SOPS with Multiple Encryption Keys in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Age, GPG, Key Management

Description: Learn how to configure SOPS with multiple encryption keys in Flux to enable redundant decryption and team-based secret management across your GitOps workflow.

---

Managing secrets in a GitOps workflow requires careful planning, especially when multiple teams or environments need access to encrypted data. SOPS (Secrets OPerationS) supports multiple encryption keys, allowing you to encrypt a single secret so that any of several keys can decrypt it. This guide walks you through configuring SOPS with multiple encryption keys in a Flux-managed Kubernetes cluster.

## Why Use Multiple Encryption Keys

Using multiple encryption keys with SOPS provides several advantages. Different teams can have their own decryption keys while sharing encrypted resources. You can maintain separate keys for different environments such as staging and production. If one key is compromised, you can rotate it without losing access to your secrets. Backup keys ensure you are never locked out of your encrypted data.

## Prerequisites

Before starting, make sure you have the following tools installed and configured:

- A Kubernetes cluster with Flux installed
- The `sops` CLI tool
- The `age` key generation tool (or GPG if preferred)
- `kubectl` access to your cluster

## Generating Multiple Age Keys

Start by generating multiple age keys for different purposes or teams:

```bash
# Generate a key for the platform team
age-keygen -o platform-team.agekey
# Output: public key: age1platform...

# Generate a key for the application team
age-keygen -o app-team.agekey
# Output: public key: age1appteam...

# Generate a backup recovery key
age-keygen -o backup.agekey
# Output: public key: age1backup...
```

Store each private key securely. You will need the public keys for encryption and the private keys for decryption.

## Creating the .sops.yaml Configuration

Create a `.sops.yaml` file in the root of your Flux repository that lists all the public keys:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: >-
      age1platform...,
      age1appteam...,
      age1backup...
```

When you list multiple age recipients separated by commas, SOPS encrypts the data so that any one of the listed keys can decrypt it. Each key holder can independently access the secrets.

## Encrypting a Secret with Multiple Keys

Create a Kubernetes secret manifest and encrypt it:

```bash
cat <<EOF > secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: default
type: Opaque
stringData:
  username: admin
  password: supersecretpassword
EOF

sops --encrypt --in-place secret.yaml
```

SOPS reads the `.sops.yaml` file and encrypts the secret for all three keys. You can verify this by inspecting the `sops` metadata block at the bottom of the encrypted file:

```bash
sops --decrypt --extract '["sops"]' secret.yaml
```

## Configuring Flux to Decrypt with a Specific Key

Flux needs access to at least one of the private keys to decrypt secrets during reconciliation. Create a Kubernetes secret containing the private key:

```bash
cat platform-team.agekey |
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

Then configure your Flux Kustomization to use the decryption key:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
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

## Using Multiple Keys Across Environments

For multi-environment setups, you can assign different keys to different clusters while sharing the same encrypted files:

```yaml
creation_rules:
  - path_regex: environments/staging/.*\.yaml$
    age: >-
      age1staging...,
      age1backup...
  - path_regex: environments/production/.*\.yaml$
    age: >-
      age1production...,
      age1backup...
  - path_regex: .*\.yaml$
    age: >-
      age1platform...,
      age1backup...
```

Each cluster only needs the private key corresponding to its environment, plus the backup key remains available for emergency access.

## Verifying Decryption with Each Key

Test that each key can independently decrypt the file:

```bash
# Test with platform team key
SOPS_AGE_KEY_FILE=platform-team.agekey sops --decrypt secret.yaml

# Test with app team key
SOPS_AGE_KEY_FILE=app-team.agekey sops --decrypt secret.yaml

# Test with backup key
SOPS_AGE_KEY_FILE=backup.agekey sops --decrypt secret.yaml
```

All three commands should produce the same decrypted output, confirming that each key can independently access the secrets.

## Best Practices

Keep backup keys stored offline in a secure location such as a hardware security module or a vault. Rotate keys periodically and re-encrypt files when team members leave. Use descriptive comments in your `.sops.yaml` to identify which key belongs to which team or environment. Always test decryption with each key after encrypting new files.

## Conclusion

Configuring SOPS with multiple encryption keys in Flux gives you flexibility and resilience in managing secrets across teams and environments. By assigning different keys to different groups and maintaining backup keys, you ensure that your GitOps workflow remains secure without creating single points of failure. Flux handles the decryption transparently during reconciliation, making multi-key SOPS a practical choice for production Kubernetes deployments.
