# How to Use Bitnami Sealed Secrets Controller with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sealed Secrets, Security

Description: A step-by-step guide to deploying and using the Bitnami Sealed Secrets controller with ArgoCD, covering installation, sealing secrets, key management, and multi-cluster configurations.

---

Bitnami Sealed Secrets is one of the most popular solutions for managing secrets in GitOps workflows. It lets you encrypt Kubernetes Secrets into SealedSecret resources that are safe to store in Git. Only the Sealed Secrets controller running in your cluster can decrypt them. When paired with ArgoCD, you get a fully declarative, Git-driven secret management workflow.

In this guide, I will cover everything from installing the Sealed Secrets controller through ArgoCD itself to handling common operational tasks like key rotation and multi-cluster setups.

## How Sealed Secrets Work

The flow is straightforward:

```mermaid
graph LR
    A[Developer creates Secret] --> B[kubeseal encrypts it]
    B --> C[SealedSecret committed to Git]
    C --> D[ArgoCD syncs to cluster]
    D --> E[Sealed Secrets controller decrypts]
    E --> F[Kubernetes Secret created]
    F --> G[Pod uses Secret]
```

The controller generates an RSA key pair. The public key encrypts secrets on developer machines. The private key stays in the cluster and decrypts SealedSecrets into regular Kubernetes Secrets.

## Installing the Sealed Secrets Controller with ArgoCD

Deploy the controller itself as an ArgoCD Application. This is the GitOps-native approach:

```yaml
# sealed-secrets-controller.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sealed-secrets-controller
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-5"  # Deploy early
spec:
  project: infrastructure
  source:
    repoURL: https://bitnami-labs.github.io/sealed-secrets
    chart: sealed-secrets
    targetRevision: 2.14.0
    helm:
      releaseName: sealed-secrets
      values: |
        fullnameOverride: sealed-secrets-controller
        resources:
          requests:
            memory: 128Mi
            cpu: 50m
          limits:
            memory: 256Mi
            cpu: 100m
        # Key renewal interval (default 30 days)
        keyrenewperiod: "720h"
        # Metrics for monitoring
        metrics:
          serviceMonitor:
            enabled: true
  destination:
    server: https://kubernetes.default.svc
    namespace: kube-system
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

Apply it:

```bash
kubectl apply -f sealed-secrets-controller.yaml
```

## Fetching the Public Key

Once the controller is running, fetch the public key for encrypting secrets:

```bash
# Fetch the public key from the controller
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  > pub-sealed-secrets.pem

# Verify the certificate
openssl x509 -in pub-sealed-secrets.pem -inform PEM -noout -text
```

Store this public key in your repository so developers can seal secrets without cluster access:

```bash
# Store in repo (this is a PUBLIC key, safe for Git)
cp pub-sealed-secrets.pem .sealed-secrets/pub-cert.pem
git add .sealed-secrets/pub-cert.pem
git commit -m "add sealed secrets public cert"
```

## Creating Sealed Secrets

There are several ways to create a SealedSecret:

### From a literal value

```bash
# Create a secret and seal it in one command
kubectl create secret generic api-key \
  --from-literal=key=my-secret-api-key-12345 \
  --dry-run=client -o yaml | \
  kubeseal --cert .sealed-secrets/pub-cert.pem \
  --format yaml > sealed-api-key.yaml
```

### From a file

```bash
# Seal a secret from a file
kubectl create secret generic tls-certs \
  --from-file=tls.crt=server.crt \
  --from-file=tls.key=server.key \
  --dry-run=client -o yaml | \
  kubeseal --cert .sealed-secrets/pub-cert.pem \
  --format yaml > sealed-tls-certs.yaml
```

### From an existing YAML file

```bash
# If you have a Secret YAML file
kubeseal --cert .sealed-secrets/pub-cert.pem \
  --format yaml < my-secret.yaml > my-sealed-secret.yaml

# Delete the plaintext secret immediately
rm my-secret.yaml
```

## Scoping Sealed Secrets

Sealed Secrets support three scoping modes that control where the decrypted secret can be used:

### Strict scope (default)

The secret is bound to a specific name and namespace. If you change either, decryption fails:

```bash
kubeseal --cert .sealed-secrets/pub-cert.pem \
  --scope strict \
  --format yaml < secret.yaml > sealed-secret.yaml
```

### Namespace-wide scope

The secret can have any name but must stay in the specified namespace:

```bash
kubeseal --cert .sealed-secrets/pub-cert.pem \
  --scope namespace-wide \
  --format yaml < secret.yaml > sealed-secret.yaml
```

### Cluster-wide scope

The secret can be deployed to any namespace with any name:

```bash
kubeseal --cert .sealed-secrets/pub-cert.pem \
  --scope cluster-wide \
  --format yaml < secret.yaml > sealed-secret.yaml
```

The scope is stored in the SealedSecret annotations:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: my-secret
  namespace: production
  annotations:
    sealedsecrets.bitnami.com/cluster-wide: "true"  # For cluster-wide scope
spec:
  encryptedData:
    api-key: AgBy3i4OJSWK+PiTySYZZA9rO43c...
```

## Deploying Sealed Secrets with ArgoCD

Organize your sealed secrets alongside application manifests:

```text
apps/
  myapp/
    base/
      deployment.yaml
      service.yaml
    overlays/
      staging/
        kustomization.yaml
        sealed-db-secret.yaml
      production/
        kustomization.yaml
        sealed-db-secret.yaml
```

The Kustomization includes the sealed secret:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - sealed-db-secret.yaml
```

ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/apps.git
    targetRevision: main
    path: apps/myapp/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

## Handling Key Rotation

The Sealed Secrets controller generates new key pairs periodically (default: every 30 days). Old keys are kept so existing SealedSecrets continue to work. However, you should re-encrypt secrets with the new key for forward secrecy.

### Check existing keys

```bash
# List all sealing keys
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key

# Output:
# NAME                      TYPE                DATA   AGE
# sealed-secrets-keyrjkrm   kubernetes.io/tls   2      90d
# sealed-secrets-keybd7tq   kubernetes.io/tls   2      60d
# sealed-secrets-keyf4v9x   kubernetes.io/tls   2      30d
```

### Re-encrypt all secrets

```bash
#!/bin/bash
# re-encrypt-all.sh

# Fetch the latest certificate
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system \
  > /tmp/new-cert.pem

# Re-encrypt all sealed secrets in the repo
find . -name 'sealed-*.yaml' -o -name '*sealed*.yaml' | while read f; do
  echo "Re-encrypting: $f"
  kubeseal --re-encrypt --cert /tmp/new-cert.pem < "$f" > "$f.tmp"
  mv "$f.tmp" "$f"
done

echo "Done. Commit and push the re-encrypted files."
```

## Multi-Cluster Setup

When using ArgoCD to manage multiple clusters, each cluster needs its own Sealed Secrets controller with its own key pair:

```yaml
# ApplicationSet for deploying sealed-secrets to all clusters
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: sealed-secrets-controllers
  namespace: argocd
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            sealed-secrets: "enabled"
  template:
    metadata:
      name: 'sealed-secrets-{{name}}'
      namespace: argocd
    spec:
      project: infrastructure
      source:
        repoURL: https://bitnami-labs.github.io/sealed-secrets
        chart: sealed-secrets
        targetRevision: 2.14.0
        helm:
          releaseName: sealed-secrets
      destination:
        server: '{{server}}'
        namespace: kube-system
      syncPolicy:
        automated:
          selfHeal: true
```

Store per-cluster public certificates:

```text
.sealed-secrets/
  staging-cert.pem
  production-cert.pem
  dr-cert.pem
```

Seal secrets for a specific cluster:

```bash
# Seal for production cluster
kubeseal --cert .sealed-secrets/production-cert.pem \
  --format yaml < secret.yaml > production/sealed-secret.yaml

# Seal for staging cluster
kubeseal --cert .sealed-secrets/staging-cert.pem \
  --format yaml < secret.yaml > staging/sealed-secret.yaml
```

## Backing Up Sealing Keys

If you lose the private key, all SealedSecrets become undecryptable. Back up the keys:

```bash
# Backup all sealing keys
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > sealed-secrets-keys-backup.yaml

# Store this backup securely (NOT in Git)
# Use your organization's secret storage for this backup
```

## Troubleshooting Common Issues

If a SealedSecret is not being decrypted:

```bash
# Check controller logs
kubectl logs -n kube-system -l app.kubernetes.io/name=sealed-secrets

# Check the SealedSecret status
kubectl get sealedsecret my-secret -n production -o yaml

# Common issues:
# - Wrong scope: secret name/namespace changed after sealing
# - Key mismatch: sealed with a different cluster's public key
# - Controller not running: check pod status
```

## Summary

The Bitnami Sealed Secrets controller integrates naturally with ArgoCD's GitOps model. Encrypted SealedSecret resources live in Git alongside your application manifests, and ArgoCD syncs them to the cluster where the controller decrypts them into regular Kubernetes Secrets. The key management is handled automatically with periodic key rotation, and multi-cluster setups work by maintaining per-cluster key pairs. For more advanced secret management patterns, see our guide on [ArgoCD secret management](https://oneuptime.com/blog/post/2026-02-02-argocd-secrets/view).
