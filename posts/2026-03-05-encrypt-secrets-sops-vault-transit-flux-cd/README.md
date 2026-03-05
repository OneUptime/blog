# How to Encrypt Secrets with SOPS and HashiCorp Vault Transit for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secrets, SOPS, HashiCorp Vault, Transit, Encryption

Description: Learn how to encrypt Kubernetes secrets using SOPS with HashiCorp Vault Transit secrets engine for Flux CD GitOps workflows.

---

HashiCorp Vault's Transit secrets engine provides encryption as a service, allowing SOPS to encrypt and decrypt data without Vault ever storing the secrets themselves. This approach combines the benefits of centralized key management in Vault with the GitOps pattern of storing encrypted secrets in Git for Flux CD.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- `sops` CLI installed (v3.7+)
- A running HashiCorp Vault instance (accessible from the cluster)
- `vault` CLI configured and authenticated
- `kubectl` access to your cluster

## Step 1: Enable the Transit Secrets Engine

Enable the Transit secrets engine in Vault if it is not already active.

```bash
# Enable the transit secrets engine
vault secrets enable transit

# Verify it is enabled
vault secrets list | grep transit
```

## Step 2: Create a Transit Encryption Key

Create a named encryption key that SOPS will use for encrypting and decrypting secrets.

```bash
# Create a transit encryption key for SOPS
vault write -f transit/keys/flux-sops type=rsa-4096
```

## Step 3: Create a Vault Policy for Decryption

Create a Vault policy that grants the minimum permissions needed for decryption.

```bash
# Create a policy file for the Flux kustomize-controller
cat > flux-sops-policy.hcl <<EOF
# Allow decrypting data with the flux-sops transit key
path "transit/decrypt/flux-sops" {
  capabilities = ["update"]
}

# Allow reading the key metadata (required by SOPS)
path "transit/keys/flux-sops" {
  capabilities = ["read"]
}
EOF

# Write the policy to Vault
vault policy write flux-sops flux-sops-policy.hcl
```

## Step 4: Create a Vault Token for Flux

Generate a Vault token with the decryption policy attached. For production, consider using Kubernetes auth instead.

```bash
# Create a token with the flux-sops policy
vault token create \
  -policy=flux-sops \
  -period=720h \
  -display-name="flux-kustomize-controller"
```

Store the token as a Kubernetes secret for the kustomize-controller.

```bash
# Create a Kubernetes secret with the Vault token
kubectl create secret generic sops-vault \
  --namespace=flux-system \
  --from-literal=sops.vault-token=<vault-token>
```

## Step 5: Configure Vault Kubernetes Authentication (Production)

For production environments, use Vault's Kubernetes auth method instead of static tokens.

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure the Kubernetes auth backend
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"

# Create a role for the kustomize-controller
vault write auth/kubernetes/role/flux-sops \
  bound_service_account_names=kustomize-controller \
  bound_service_account_namespaces=flux-system \
  policies=flux-sops \
  ttl=1h
```

## Step 6: Create and Encrypt a Secret

Create a Kubernetes secret manifest and encrypt it using SOPS with the Vault Transit key.

```yaml
# secret.yaml - Plaintext secret
apiVersion: v1
kind: Secret
metadata:
  name: vault-app-secret
  namespace: default
type: Opaque
stringData:
  vault-addr: https://vault.example.com
  app-secret: my-super-secret-value
  jwt-signing-key: LS0tLS1CRUdJTi...
```

Set the Vault address and encrypt the secret.

```bash
# Set the Vault address environment variable
export VAULT_ADDR=https://vault.example.com

# Encrypt using Vault Transit
sops --encrypt \
  --hc-vault-transit https://vault.example.com/v1/transit/keys/flux-sops \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

## Step 7: Examine the Encrypted Output

The encrypted file will contain Vault Transit metadata in the SOPS block.

```yaml
# secret.enc.yaml - Encrypted with Vault Transit
apiVersion: v1
kind: Secret
metadata:
  name: vault-app-secret
  namespace: default
type: Opaque
stringData:
  vault-addr: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
  app-secret: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
  jwt-signing-key: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
sops:
  hc_vault:
    - vault_address: https://vault.example.com
      engine_path: transit
      key_name: flux-sops
      created_at: "2026-03-05T00:00:00Z"
      enc: vault:v1:...
  lastmodified: "2026-03-05T00:00:00Z"
  version: 3.7.3
```

## Step 8: Configure the Flux Kustomization

Set up the Flux Kustomization to use SOPS decryption with the Vault token secret.

```yaml
# clusters/my-cluster/apps-kustomization.yaml
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
      name: sops-vault
```

## Step 9: Set Up .sops.yaml Configuration

Define creation rules for consistent encryption across the team.

```yaml
# .sops.yaml - Vault Transit configuration
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    hc_vault_transit_uri: https://vault.example.com/v1/transit/keys/flux-sops
```

## Step 10: Commit and Verify

Commit the encrypted secret and verify Flux handles the decryption.

```bash
# Remove plaintext and commit
rm secret.yaml
git add secret.enc.yaml
git commit -m "Add Vault Transit encrypted secret"
git push

# Reconcile and verify
flux reconcile kustomization my-app --with-source
kubectl get secret vault-app-secret -n default
```

## Troubleshooting

Common issues with Vault Transit decryption and how to resolve them.

```bash
# Check if the Vault token is valid
kubectl get secret sops-vault -n flux-system -o jsonpath='{.data.sops\.vault-token}' | base64 -d | vault token lookup -

# Verify the kustomize-controller can reach Vault
kubectl exec -n flux-system deployment/kustomize-controller -- wget -qO- https://vault.example.com/v1/sys/health

# Check controller logs for Vault-related errors
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "vault\|transit\|decrypt"
```

Frequent issues include expired Vault tokens, network connectivity problems between the cluster and Vault, or incorrect Transit key paths. When using Kubernetes auth, ensure the service account binding is correctly configured and the Vault role matches the kustomize-controller service account.

Vault Transit with SOPS offers a powerful combination for organizations already invested in HashiCorp Vault, providing centralized key management with full audit trails while keeping the GitOps workflow intact with Flux CD.
