# How to Manage Secrets with ArgoCD and SOPS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, SOPS, Encryption

Description: A practical guide to using Mozilla SOPS with ArgoCD for encrypting secrets in Git repositories using AGE, PGP, or cloud KMS keys for GitOps workflows.

---

SOPS (Secrets OPerationS) by Mozilla is a tool for encrypting and decrypting files. Unlike Sealed Secrets which is Kubernetes-specific, SOPS works with any file format - YAML, JSON, ENV, or INI. It encrypts individual values while keeping the keys in plaintext, making diffs readable and merge conflicts manageable. This guide covers how to integrate SOPS with ArgoCD for encrypted secret management in Git.

## How SOPS Works

SOPS encrypts the values in your files while leaving the keys and structure visible:

```yaml
# Before SOPS encryption
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
stringData:
  DB_PASSWORD: super-secret
  API_KEY: key-12345

# After SOPS encryption
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
stringData:
  DB_PASSWORD: ENC[AES256_GCM,data:abc123...,iv:...,tag:...,type:str]
  API_KEY: ENC[AES256_GCM,data:def456...,iv:...,tag:...,type:str]
sops:
  kms: []
  age:
    - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw...
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-02-26T00:00:00Z"
  version: 3.9.0
```

The structure remains readable for code reviews, but the values are encrypted.

## Installing SOPS

```bash
# macOS
brew install sops

# Linux
VERSION=3.9.0
curl -LO https://github.com/getsops/sops/releases/download/v${VERSION}/sops-v${VERSION}.linux.amd64
chmod +x sops-v${VERSION}.linux.amd64
sudo mv sops-v${VERSION}.linux.amd64 /usr/local/bin/sops
```

## Choosing an Encryption Backend

SOPS supports multiple encryption backends:

### AGE (Recommended for simplicity)

```bash
# Install age
brew install age  # macOS
# or: apt install age  # Debian/Ubuntu

# Generate a key pair
age-keygen -o age-key.txt

# Output looks like:
# Public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw...
# Created: 2026-02-26T00:00:00Z
```

### AWS KMS

```bash
# No additional installation needed, uses AWS credentials
# Get your KMS key ARN
aws kms list-keys --query 'Keys[0].KeyArn' --output text
```

### GCP KMS

```bash
# Get your KMS key resource ID
gcloud kms keys list \
  --location global \
  --keyring my-keyring \
  --project my-project
```

### Azure Key Vault

```bash
# Get your Key Vault key URL
az keyvault key show \
  --vault-name my-vault \
  --name sops-key \
  --query key.kid
```

## Configuring SOPS

Create a `.sops.yaml` file in your repository root to define encryption rules:

```yaml
# .sops.yaml
creation_rules:
  # Encrypt secrets in production with AGE
  - path_regex: overlays/production/.*secret.*\.yaml$
    age: "age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw..."

  # Encrypt secrets in staging with a different key
  - path_regex: overlays/staging/.*secret.*\.yaml$
    age: "age1abc123..."

  # Use AWS KMS for AWS-hosted environments
  - path_regex: aws/.*secret.*\.yaml$
    kms: "arn:aws:kms:us-east-1:123456789:key/abc-123-def"

  # Use GCP KMS for GCP environments
  - path_regex: gcp/.*secret.*\.yaml$
    gcp_kms: "projects/my-project/locations/global/keyRings/my-keyring/cryptoKeys/sops-key"

  # Only encrypt specific fields
  - path_regex: .*values.*\.yaml$
    encrypted_regex: "^(password|secret|token|key)$"
    age: "age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw..."
```

## Encrypting and Decrypting Secrets

### Encrypt a File

```bash
# Create a plaintext secret
cat > secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: app
stringData:
  DB_PASSWORD: super-secret
  API_KEY: key-12345
EOF

# Encrypt it with SOPS
sops --encrypt secret.yaml > secret.enc.yaml

# Or encrypt in-place
sops --encrypt --in-place secret.yaml
```

### Decrypt a File

```bash
# Decrypt to stdout
sops --decrypt secret.enc.yaml

# Decrypt in-place
sops --decrypt --in-place secret.enc.yaml
```

### Edit an Encrypted File

```bash
# Opens in your editor with decrypted values, re-encrypts on save
sops secret.enc.yaml
```

## Integrating SOPS with ArgoCD

ArgoCD cannot decrypt SOPS files natively. You need a mechanism to decrypt them during the sync process. There are two main approaches.

### Approach 1: Kustomize with KSOPS Plugin

KSOPS is a Kustomize plugin that decrypts SOPS-encrypted files during Kustomize builds.

Install KSOPS in the ArgoCD repo-server:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      initContainers:
        - name: install-ksops
          image: viaductoss/ksops:v4.3.2
          command: ["/bin/sh", "-c"]
          args:
            - echo "Installing KSOPS...";
              mv /usr/local/bin/ksops /custom-tools/;
              mv /usr/local/bin/kustomize /custom-tools/;
          volumeMounts:
            - name: custom-tools
              mountPath: /custom-tools
      containers:
        - name: argocd-repo-server
          env:
            # AGE secret key for decryption
            - name: SOPS_AGE_KEY_FILE
              value: /sops/age/keys.txt
            - name: XDG_CONFIG_HOME
              value: /home/argocd/.config
            - name: KUSTOMIZE_PLUGIN_HOME
              value: /home/argocd/.config/kustomize/plugin
          volumeMounts:
            - name: custom-tools
              mountPath: /usr/local/bin/ksops
              subPath: ksops
            - name: sops-age
              mountPath: /sops/age
      volumes:
        - name: custom-tools
          emptyDir: {}
        - name: sops-age
          secret:
            secretName: sops-age-key
```

Create the AGE key secret:

```bash
kubectl create secret generic sops-age-key \
  --namespace argocd \
  --from-file=keys.txt=age-key.txt
```

### Using KSOPS in Your Kustomization

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

generators:
  - secret-generator.yaml

resources:
  - deployment.yaml
  - service.yaml
```

```yaml
# secret-generator.yaml
apiVersion: viaduct.ai/v1
kind: ksops
metadata:
  name: my-app-secrets
  annotations:
    config.kubernetes.io/function: |
      exec:
        path: ksops
files:
  - secret.enc.yaml
```

### Approach 2: Helm Secrets Plugin

If you use Helm with ArgoCD, the helm-secrets plugin decrypts SOPS-encrypted values files:

```yaml
# values-secret.yaml (encrypted with SOPS)
db:
  password: ENC[AES256_GCM,data:abc...,iv:...,tag:...,type:str]
api:
  key: ENC[AES256_GCM,data:def...,iv:...,tag:...,type:str]
```

Configure the ArgoCD application to use helm-secrets:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/your-org/helm-charts.git
    path: my-app
    helm:
      valueFiles:
        - values.yaml
        - secrets+age-import:///sops/age/keys.txt?values-secret.yaml
```

## Repository Structure

```
my-app/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    production/
      secret.enc.yaml         # SOPS-encrypted secret
      secret-generator.yaml   # KSOPS generator
      kustomization.yaml      # References the generator
    staging/
      secret.enc.yaml
      secret-generator.yaml
      kustomization.yaml
  .sops.yaml                  # SOPS configuration
```

## Key Rotation

When you need to rotate the encryption key:

```bash
# Generate a new AGE key
age-keygen -o new-age-key.txt

# Update .sops.yaml with the new key
# Then re-encrypt all files
find . -name '*.enc.yaml' -exec sops updatekeys {} \;
```

## Multi-Key Encryption

SOPS supports encrypting with multiple keys, so different teams can decrypt:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: .*secret.*\.yaml$
    age: >-
      age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw...,
      age1abc123def456...
```

Both keys can decrypt the file, so the ArgoCD key and a team member's key can both work.

## Troubleshooting

```bash
# Verify SOPS can decrypt
sops --decrypt secret.enc.yaml

# Check if the AGE key is mounted in repo-server
kubectl exec -n argocd deployment/argocd-repo-server -- ls -la /sops/age/

# Check repo-server logs for SOPS errors
kubectl logs -n argocd deployment/argocd-repo-server | grep -i sops

# Verify KSOPS is installed
kubectl exec -n argocd deployment/argocd-repo-server -- ksops --version
```

## Conclusion

SOPS with ArgoCD gives you encrypted secrets in Git with readable diffs and flexible encryption backends. Use AGE for simplicity, cloud KMS for cloud-native workflows, or PGP for existing PKI infrastructure. The KSOPS plugin for Kustomize or the helm-secrets plugin for Helm handle decryption during ArgoCD sync. The main advantage over Sealed Secrets is that SOPS is not Kubernetes-specific and supports multiple encryption keys for team-based access control.

For alternative approaches, see our guides on [using Sealed Secrets with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-sealed-secrets-management/view) and [using Kustomize SOPS with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-kustomize-sops/view).
