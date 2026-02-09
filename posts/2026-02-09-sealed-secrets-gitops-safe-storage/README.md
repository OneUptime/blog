# How to Use Sealed Secrets for GitOps-Safe Secret Storage in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, GitOps, Security

Description: Learn how to use Bitnami Sealed Secrets to encrypt Kubernetes secrets for safe storage in Git repositories, enabling true GitOps workflows without exposing sensitive data.

---

Storing Kubernetes Secrets in Git is risky. Base64 encoding is not encryption, and accidentally committing secrets exposes sensitive credentials. This breaks GitOps workflows because you can't safely version control your complete cluster state, forcing you to manage secrets separately through manual processes.

Sealed Secrets solves this by encrypting secrets with a public key that only the cluster controller can decrypt. You can safely commit encrypted SealedSecret resources to Git, and the controller automatically decrypts them into Kubernetes Secrets when applied to the cluster.

In this guide, you'll learn how to install Sealed Secrets, encrypt secrets for Git storage, implement rotation strategies, and integrate with GitOps tools like ArgoCD and Flux.

## How Sealed Secrets Work

Sealed Secrets uses asymmetric cryptography:

1. The controller generates a key pair (private key stays in the cluster)
2. You encrypt secrets using the public key (can be done anywhere)
3. Encrypted SealedSecrets are safe to commit to Git
4. When applied, the controller decrypts them using the private key
5. Regular Kubernetes Secrets are created for pods to use

The private key never leaves the cluster, ensuring only that cluster can decrypt the secrets.

## Installing Sealed Secrets

Install the Sealed Secrets controller:

```bash
# Install using kubectl
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Or using Helm
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system \
  --create-namespace
```

Verify installation:

```bash
# Check controller pod is running
kubectl get pods -n kube-system | grep sealed-secrets

# View controller logs
kubectl logs -n kube-system -l name=sealed-secrets-controller
```

Install the kubeseal CLI tool:

```bash
# macOS
brew install kubeseal

# Linux
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-0.24.0-linux-amd64.tar.gz
tar xfz kubeseal-0.24.0-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal

# Verify installation
kubeseal --version
```

## Creating Your First Sealed Secret

Create a regular Kubernetes Secret manifest:

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: dbuser
  password: SuperSecurePassword123
  host: postgres.example.com
```

Encrypt it using kubeseal:

```bash
# Encrypt the secret
kubeseal \
  --format=yaml \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  < secret.yaml > sealed-secret.yaml
```

The encrypted SealedSecret:

```yaml
# sealed-secret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  encryptedData:
    username: AgBR8dK3...encrypted...
    password: AgCX9mP5...encrypted...
    host: AgDY2nQ8...encrypted...
  template:
    metadata:
      name: database-credentials
      namespace: production
    type: Opaque
```

This file is safe to commit to Git. Apply it:

```bash
kubectl apply -f sealed-secret.yaml
```

The controller automatically creates the decrypted Secret:

```bash
# Verify the Secret was created
kubectl get secret database-credentials -n production

# View the decrypted values
kubectl get secret database-credentials -n production -o jsonpath='{.data.password}' | base64 -d
```

## Encryption Scopes

Sealed Secrets supports three encryption scopes:

### Strict Scope (Default)

Encrypted for specific name and namespace:

```bash
kubeseal --scope strict < secret.yaml > sealed-secret.yaml
```

The SealedSecret only works with the exact name and namespace. Changing either breaks decryption.

### Namespace-Wide Scope

Encrypted for any name within a namespace:

```bash
kubeseal --scope namespace-wide < secret.yaml > sealed-secret.yaml
```

You can rename the secret, but it must stay in the same namespace.

### Cluster-Wide Scope

Encrypted for use anywhere in the cluster:

```bash
kubeseal --scope cluster-wide < secret.yaml > sealed-secret.yaml
```

The secret can be renamed and moved to any namespace.

Example use case comparison:

```bash
# Production database (strict - can't be moved)
kubeseal --scope strict < prod-db-secret.yaml > prod-db-sealed.yaml

# Shared TLS cert (namespace-wide - can rename)
kubeseal --scope namespace-wide < tls-cert.yaml > tls-cert-sealed.yaml

# Registry credentials (cluster-wide - can move anywhere)
kubeseal --scope cluster-wide < registry-creds.yaml > registry-creds-sealed.yaml
```

## GitOps Workflow with Sealed Secrets

Organize your Git repository:

```
my-k8s-repo/
├── base/
│   ├── deployments/
│   │   └── app.yaml
│   └── sealed-secrets/
│       ├── database-credentials.yaml
│       ├── api-keys.yaml
│       └── tls-certificates.yaml
├── overlays/
│   ├── production/
│   │   ├── kustomization.yaml
│   │   └── sealed-secrets/
│   │       ├── prod-db-credentials.yaml
│   │       └── prod-api-keys.yaml
│   └── staging/
│       ├── kustomization.yaml
│       └── sealed-secrets/
│           ├── staging-db-credentials.yaml
│           └── staging-api-keys.yaml
```

Workflow for adding a new secret:

```bash
# 1. Create secret manifest locally (don't commit)
cat > /tmp/new-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: new-api-key
  namespace: production
stringData:
  api-key: secret-key-value
EOF

# 2. Seal it
kubeseal < /tmp/new-secret.yaml > base/sealed-secrets/new-api-key.yaml

# 3. Delete plain secret
rm /tmp/new-secret.yaml

# 4. Commit sealed secret
git add base/sealed-secrets/new-api-key.yaml
git commit -m "Add new API key sealed secret"
git push

# 5. Apply through GitOps tool or manually
kubectl apply -f base/sealed-secrets/new-api-key.yaml
```

## Using with ArgoCD

Configure ArgoCD to manage SealedSecrets:

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-k8s-repo
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

ArgoCD automatically applies SealedSecrets, and the controller decrypts them.

## Using with Flux

Configure Flux to manage SealedSecrets:

```yaml
# flux-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-k8s-repo
  targetNamespace: production
```

Flux syncs SealedSecrets from Git, and the controller handles decryption.

## Key Rotation and Management

Sealed Secrets automatically rotates keys every 30 days by default. Old keys are retained for decryption.

View current keys:

```bash
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active
```

Manually back up encryption keys:

```bash
# Back up keys
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active \
  -o yaml > sealed-secrets-keys-backup.yaml

# Store safely (encrypted) outside the cluster
```

Restore keys to a new cluster:

```bash
# Delete default key
kubectl delete secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active

# Restore backed up keys
kubectl apply -f sealed-secrets-keys-backup.yaml

# Restart controller
kubectl rollout restart deployment sealed-secrets-controller -n kube-system
```

## Re-encrypting All Secrets After Key Rotation

When rotating to a new key, re-encrypt all SealedSecrets:

```bash
#!/bin/bash
# re-encrypt-sealed-secrets.sh

for file in $(find . -name "*sealed*.yaml"); do
  echo "Re-encrypting $file..."
  # Extract the original secret
  kubectl create --dry-run=client -o yaml \
    -f $file | \
    kubeseal --format yaml > ${file}.new
  mv ${file}.new $file
done

git add .
git commit -m "Re-encrypt all sealed secrets with new key"
git push
```

## Multi-Cluster Strategy

For multiple clusters, each has its own encryption key:

```bash
# Get public key from production cluster
kubeseal --fetch-cert \
  --controller-name sealed-secrets-controller \
  --controller-namespace kube-system \
  --kubeconfig ~/.kube/prod-config \
  > pub-cert-prod.pem

# Get public key from staging cluster
kubeseal --fetch-cert \
  --controller-name sealed-secrets-controller \
  --controller-namespace kube-system \
  --kubeconfig ~/.kube/staging-config \
  > pub-cert-staging.pem

# Encrypt for production
kubeseal --cert pub-cert-prod.pem < secret.yaml > sealed-secret-prod.yaml

# Encrypt for staging
kubeseal --cert pub-cert-staging.pem < secret.yaml > sealed-secret-staging.yaml
```

Store cluster-specific sealed secrets in separate directories:

```
overlays/
├── production/
│   └── sealed-secrets/
│       └── db-credentials.yaml
└── staging/
    └── sealed-secrets/
        └── db-credentials.yaml
```

## Updating Sealed Secrets

To update a secret value:

```bash
# 1. Create updated secret manifest
cat > /tmp/updated-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
stringData:
  username: dbuser
  password: NewSecurePassword456
  host: postgres.example.com
EOF

# 2. Re-seal
kubeseal < /tmp/updated-secret.yaml > base/sealed-secrets/database-credentials.yaml

# 3. Commit and push
git add base/sealed-secrets/database-credentials.yaml
git commit -m "Update database password"
git push

# 4. Apply (or let GitOps sync)
kubectl apply -f base/sealed-secrets/database-credentials.yaml
```

The controller updates the underlying Secret automatically.

## Best Practices

1. **Never commit unencrypted secrets**: Always seal secrets before committing to Git.

2. **Back up encryption keys**: Store key backups securely outside the cluster.

3. **Use appropriate scopes**: Choose strict scope for production secrets, cluster-wide for shared credentials.

4. **Automate re-encryption**: Set up automated re-encryption after key rotation.

5. **Monitor controller logs**: Watch for decryption failures or key issues.

6. **Test disaster recovery**: Practice restoring keys to a new cluster.

7. **Use separate keys per environment**: Don't share encryption keys between prod and non-prod clusters.

8. **Document key rotation schedule**: Know when keys will rotate and plan re-encryption.

Sealed Secrets enables true GitOps by making it safe to store encrypted secrets in Git repositories. Your entire cluster configuration, including sensitive data, can be version controlled and deployed through automated pipelines without security compromises.
