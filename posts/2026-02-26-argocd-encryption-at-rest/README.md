# How to Implement Encryption at Rest for ArgoCD Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Encryption

Description: Learn how to implement encryption at rest for ArgoCD sensitive data including repository credentials, cluster secrets, SSO tokens, and Redis cache using Kubernetes encryption and secret management.

---

ArgoCD stores sensitive data including repository credentials, cluster connection secrets, SSO tokens, and user session information. If an attacker gains access to the underlying storage, they could extract these credentials and compromise your entire deployment pipeline. Encryption at rest ensures that even if storage is compromised, the data remains unreadable. This guide covers every data store that ArgoCD uses and how to encrypt each one.

## What ArgoCD Stores

ArgoCD persists sensitive data in several places:

1. **Kubernetes Secrets** - Repository credentials, cluster secrets, SSO client secrets, admin password
2. **Redis** - Session data, application state cache, RBAC cache
3. **etcd** (via Kubernetes) - All ArgoCD CRDs (Applications, AppProjects, ApplicationSets)
4. **Git repositories** (temporary clones) - Stored on the repo server filesystem

## Encrypting Kubernetes Secrets (etcd Encryption)

### Enable etcd Encryption at Rest

Kubernetes secrets are stored in etcd. By default, they are base64-encoded but not encrypted. Enable encryption:

```yaml
# encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      # AES-CBC encryption (recommended for most setups)
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      # Identity provider as fallback for reading unencrypted secrets
      - identity: {}
```

Generate an encryption key:

```bash
# Generate a 32-byte random key
head -c 32 /dev/urandom | base64
```

Apply the encryption configuration to the API server:

```bash
# For kubeadm clusters, add to the API server manifest
# /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
    - command:
        - kube-apiserver
        - --encryption-provider-config=/etc/kubernetes/encryption-config.yaml
```

After enabling, re-encrypt existing secrets:

```bash
# Re-encrypt all secrets in the argocd namespace
kubectl get secrets -n argocd -o json | kubectl replace -f -
```

### Using AWS KMS for Key Management

For EKS clusters, use AWS KMS:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: aws-encryption-provider
          endpoint: unix:///var/run/kmsplugin/socket.sock
      - identity: {}
```

### Using Azure Key Vault

For AKS clusters:

```bash
# Enable secret encryption with Azure Key Vault
az aks update \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --enable-azure-keyvault-kms \
  --azure-keyvault-kms-key-id <key-id> \
  --azure-keyvault-kms-key-vault-network-access Private
```

### Using GCP Cloud KMS

For GKE clusters:

```bash
# Create a KMS key for secret encryption
gcloud kms keys create argocd-secrets-key \
  --location us-central1 \
  --keyring my-keyring \
  --purpose encryption

# Enable application-layer secrets encryption
gcloud container clusters update my-cluster \
  --database-encryption-key projects/my-project/locations/us-central1/keyRings/my-keyring/cryptoKeys/argocd-secrets-key
```

## Encrypting ArgoCD Repository Credentials

ArgoCD stores repository credentials as Kubernetes Secrets:

```bash
# View the current secrets (to verify they exist)
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=repository

# These secrets contain SSH keys, passwords, and tokens
# They are protected by etcd encryption at rest (configured above)
```

### Additional Protection with Sealed Secrets

For an extra layer, use Sealed Secrets to encrypt credentials before they are stored:

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/controller.yaml

# Encrypt a repository credential
cat <<EOF | kubeseal --format yaml > sealed-repo-cred.yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-creds-github
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  url: https://github.com/org/
  password: ghp_xxxxxxxxxxxx
  username: argocd-bot
  type: git
EOF
```

The sealed secret is safe to commit to Git since only the Sealed Secrets controller can decrypt it.

### External Secrets Operator

Pull credentials from external vaults instead of storing them in Kubernetes:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: argocd-repo-creds
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: repo-creds-github
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repo-creds
      data:
        url: "https://github.com/org/"
        password: "{{ .github_token }}"
        username: "argocd-bot"
        type: "git"
  data:
    - secretKey: github_token
      remoteRef:
        key: argocd/github-token
```

## Encrypting Redis Data

ArgoCD uses Redis for caching. By default, Redis data is unencrypted in memory and on disk.

### Enable Redis TLS

```yaml
# Helm values for ArgoCD with Redis TLS
redis:
  enabled: true
  externalEndpoint: ""

redis-ha:
  enabled: true
  haproxy:
    enabled: true
  redis:
    config:
      tls-cert-file: /tls/tls.crt
      tls-key-file: /tls/tls.key
      tls-ca-cert-file: /tls/ca.crt
      tls-auth-clients: "yes"
      tls-replication: "yes"
      tls-port: 6380
      port: 0  # Disable non-TLS port
```

### Redis Password Authentication

Always enable Redis authentication:

```yaml
# Create a Redis password secret
apiVersion: v1
kind: Secret
metadata:
  name: argocd-redis
  namespace: argocd
type: Opaque
stringData:
  auth: <strong-random-password>
```

Configure ArgoCD components to use the password:

```yaml
# Helm values
redis:
  password:
    enabled: true
    existingSecret: argocd-redis
    key: auth
```

### Redis Persistence Encryption

If Redis persistence is enabled, encrypt the underlying storage:

```yaml
# Use an encrypted StorageClass for Redis PVCs
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-redis
provisioner: ebs.csi.aws.com
parameters:
  encrypted: "true"
  kmsKeyId: arn:aws:kms:us-east-1:123456789:key/xxx-xxx
```

## Encrypting Repo Server Temporary Files

The repo server clones Git repositories to generate manifests. These clones exist on the filesystem temporarily:

```yaml
# Use an emptyDir with medium: Memory for repo server
repoServer:
  volumes:
    - name: tmp
      emptyDir:
        medium: Memory  # Store in RAM, not disk
        sizeLimit: 2Gi

  volumeMounts:
    - name: tmp
      mountPath: /tmp
```

This ensures that temporary Git clones are stored in memory only and are never written to disk.

### Encrypted Persistent Storage

If you cannot use memory-backed storage, use encrypted volumes:

```yaml
repoServer:
  volumes:
    - name: tmp
      ephemeral:
        volumeClaimTemplate:
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: encrypted-storage
            resources:
              requests:
                storage: 5Gi
```

## ArgoCD Secret Key Encryption

ArgoCD uses a server secret key for encrypting session tokens:

```yaml
# Ensure the ArgoCD secret key is strong
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  # Generate a strong secret key
  server.secretkey: <random-string-at-least-32-chars>
```

Rotate this key periodically:

```bash
# Generate a new secret key
NEW_KEY=$(openssl rand -base64 32)

# Update the secret
kubectl patch secret argocd-secret -n argocd -p "{\"stringData\":{\"server.secretkey\":\"$NEW_KEY\"}}"

# Restart ArgoCD server to pick up the new key
kubectl rollout restart deployment argocd-server -n argocd
```

Note: Rotating the server secret key invalidates all existing sessions. Users will need to re-authenticate.

## Verification

Verify that encryption is working:

```bash
# Check etcd encryption status
kubectl get secret argocd-secret -n argocd -o jsonpath='{.data.server\.secretkey}' | base64 -d
# Should return the encrypted value, not plaintext

# Verify Redis TLS
kubectl exec -n argocd deployment/argocd-redis -- redis-cli --tls \
  --cert /tls/tls.crt \
  --key /tls/tls.key \
  --cacert /tls/ca.crt \
  ping

# Check that repo server uses memory-backed storage
kubectl exec -n argocd deployment/argocd-repo-server -- df -h /tmp
# Should show tmpfs
```

## Encryption Checklist

- [ ] etcd encryption at rest enabled for Kubernetes secrets
- [ ] Cloud KMS integration for key management
- [ ] Redis TLS enabled
- [ ] Redis authentication configured
- [ ] Redis persistence uses encrypted storage (if enabled)
- [ ] Repo server temp files use memory-backed storage
- [ ] ArgoCD server secret key is strong and rotated
- [ ] Sealed Secrets or External Secrets for credential management
- [ ] PV encryption for any persistent storage

For more on ArgoCD secrets management, see our guide on [ArgoCD secrets management](https://oneuptime.com/blog/post/2026-02-02-argocd-secrets/view) and [External Secrets with ArgoCD](https://oneuptime.com/blog/post/2026-01-25-external-secrets-argocd/view).
