# How to Convert Kubernetes ConfigMaps to Sealed Secrets for GitOps Repository Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sealed Secrets, GitOps, Security, Config Management

Description: Learn how to safely migrate sensitive configuration data from ConfigMaps to Sealed Secrets, enabling secure GitOps workflows where encrypted secrets can be stored in version control alongside application code.

---

Storing configuration in ConfigMaps is convenient, but it becomes problematic when those ConfigMaps contain sensitive data and you want to adopt GitOps practices. Sealed Secrets by Bitnami solves this by encrypting secrets that can only be decrypted by your cluster, allowing you to safely commit encrypted secrets to Git repositories. This guide shows you how to migrate sensitive ConfigMap data to Sealed Secrets.

## Understanding Sealed Secrets

Sealed Secrets consists of two components: a cluster-side controller that decrypts SealedSecret resources and a client-side kubeseal CLI tool that encrypts secrets. The controller generates a key pair, and only the controller can decrypt secrets sealed with the public key. This means you can safely store encrypted SealedSecret manifests in public Git repositories.

The key advantage is that SealedSecrets integrate perfectly with GitOps tools like ArgoCD and Flux, enabling fully declarative secret management.

## Installing Sealed Secrets Controller

Deploy the controller to your cluster:

```bash
# Install using kubectl
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Verify installation
kubectl get pods -n kube-system -l name=sealed-secrets-controller

# Wait for controller to be ready
kubectl wait --for=condition=ready pod -l name=sealed-secrets-controller -n kube-system --timeout=300s
```

Install the kubeseal CLI:

```bash
# Linux
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-0.24.0-linux-amd64.tar.gz
tar xfz kubeseal-0.24.0-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal

# macOS
brew install kubeseal

# Verify installation
kubeseal --version
```

## Identifying Sensitive ConfigMaps

Audit your ConfigMaps to find ones containing sensitive data:

```bash
# List all ConfigMaps
kubectl get configmaps --all-namespaces

# Inspect ConfigMap content
kubectl get configmap myapp-config -n production -o yaml
```

Create a checklist of ConfigMaps that contain API keys, database connection strings, OAuth tokens, encryption keys, certificates, or passwords.

## Converting ConfigMaps to Secrets

First, convert ConfigMaps containing sensitive data to regular Kubernetes Secrets:

```bash
# Export ConfigMap data
kubectl get configmap myapp-config -n production -o yaml > configmap-backup.yaml

# Create Secret from ConfigMap data
kubectl create secret generic myapp-secrets -n production \
  --from-literal=api-key="abc123xyz" \
  --from-literal=database-url="postgres://user:pass@host:5432/db" \
  --dry-run=client -o yaml > secret.yaml
```

## Sealing Secrets

Convert the regular Secret to a SealedSecret:

```bash
# Seal the secret
kubeseal --format yaml < secret.yaml > sealedsecret.yaml

# The output is encrypted and safe to commit to Git
cat sealedsecret.yaml
```

Example SealedSecret:

```yaml
# sealedsecret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: myapp-secrets
  namespace: production
spec:
  encryptedData:
    api-key: AgBh3kGvXY8... (long encrypted string)
    database-url: AgCDf2kLmPQ... (long encrypted string)
  template:
    metadata:
      name: myapp-secrets
      namespace: production
    type: Opaque
```

Apply the SealedSecret:

```bash
kubectl apply -f sealedsecret.yaml

# Verify the Secret was created
kubectl get secret myapp-secrets -n production
kubectl get sealedsecret myapp-secrets -n production
```

## Bulk Migration Script

Automate migration of multiple ConfigMaps:

```bash
#!/bin/bash
# migrate-configmaps-to-sealed-secrets.sh

NAMESPACE="production"
SENSITIVE_CONFIGMAPS=("myapp-config" "database-config" "api-config")

for cm_name in "${SENSITIVE_CONFIGMAPS[@]}"; do
  echo "Processing ConfigMap: $cm_name"

  # Extract data from ConfigMap
  kubectl get configmap $cm_name -n $NAMESPACE -o json | \
    jq -r '.data | to_entries | map("--from-literal=\(.key)=\(.value)") | join(" ")' > /tmp/cm-data.txt

  # Create Secret
  SECRET_NAME="${cm_name}-secret"
  kubectl create secret generic $SECRET_NAME -n $NAMESPACE \
    $(cat /tmp/cm-data.txt) \
    --dry-run=client -o yaml > /tmp/secret.yaml

  # Seal the Secret
  kubeseal --format yaml < /tmp/secret.yaml > "sealedsecret-${cm_name}.yaml"

  echo "Created sealedsecret-${cm_name}.yaml"

  # Apply SealedSecret
  kubectl apply -f "sealedsecret-${cm_name}.yaml"

  echo "Applied SealedSecret for $cm_name"
done

# Clean up temporary files
rm /tmp/cm-data.txt /tmp/secret.yaml
```

Make it executable and run:

```bash
chmod +x migrate-configmaps-to-sealed-secrets.sh
./migrate-configmaps-to-sealed-secrets.sh
```

## Updating Application Deployments

Modify your deployments to use the new Secrets instead of ConfigMaps:

```yaml
# Before: Using ConfigMap
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: myapp-config
```

```yaml
# After: Using Secret (created from SealedSecret)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - secretRef:
            name: myapp-secrets  # Created by SealedSecret controller
```

Apply the updated deployment:

```bash
kubectl apply -f deployment.yaml

# Verify pods are running with new configuration
kubectl get pods -n production
kubectl logs -n production deployment/myapp --tail=50
```

## Scope-Based Sealing

SealedSecrets support different scopes for flexibility:

**Strict scope** (default): Tied to specific name and namespace
```bash
kubeseal --scope strict < secret.yaml > sealedsecret.yaml
```

**Namespace-wide scope**: Can be used in any secret name within the namespace
```bash
kubeseal --scope namespace-wide < secret.yaml > sealedsecret.yaml
```

**Cluster-wide scope**: Can be unsealed in any namespace
```bash
kubeseal --scope cluster-wide < secret.yaml > sealedsecret.yaml
```

Example namespace-wide SealedSecret:

```bash
# Create secret for shared database credentials
kubectl create secret generic db-credentials -n production \
  --from-literal=username=dbuser \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml | \
kubeseal --scope namespace-wide --format yaml > sealedsecret-db-shared.yaml
```

## GitOps Integration with ArgoCD

Store SealedSecrets in your Git repository:

```bash
# Project structure
my-app/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── sealedsecret.yaml  # Safe to commit
└── overlays/
    ├── dev/
    │   └── sealedsecret.yaml
    └── production/
        └── sealedsecret.yaml
```

ArgoCD Application manifest:

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/myapp-config
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

ArgoCD will deploy the SealedSecret, and the controller will automatically create the corresponding Secret.

## Key Management and Rotation

Backup the sealing key for disaster recovery:

```bash
# Backup sealing key
kubectl get secret -n kube-system sealed-secrets-key -o yaml > sealed-secrets-key-backup.yaml

# Store securely (e.g., encrypted in vault)
gpg --encrypt sealed-secrets-key-backup.yaml
```

Rotate sealing keys periodically:

```bash
# Generate new key
kubectl create secret tls sealed-secrets-key-new -n kube-system \
  --cert=new-cert.pem \
  --key=new-key.pem

# Label as active key
kubectl label secret sealed-secrets-key-new -n kube-system \
  sealedsecrets.bitnami.com/sealed-secrets-key=active

# Restart controller to pick up new key
kubectl rollout restart deployment sealed-secrets-controller -n kube-system
```

The controller supports multiple keys, allowing gradual rotation without resealing all secrets immediately.

## Handling Secret Updates

When you need to update a secret value:

```bash
# Create updated Secret
kubectl create secret generic myapp-secrets -n production \
  --from-literal=api-key="new-key-value" \
  --from-literal=database-url="updated-url" \
  --dry-run=client -o yaml | \
kubeseal --format yaml --merge-into sealedsecret.yaml

# Commit updated SealedSecret to Git
git add sealedsecret.yaml
git commit -m "Update API key"
git push

# ArgoCD will automatically sync and update the Secret
```

## Monitoring and Validation

Verify SealedSecrets are working:

```bash
# Check SealedSecret status
kubectl get sealedsecrets -n production

# Verify corresponding Secrets were created
kubectl get secrets -n production

# Check controller logs for errors
kubectl logs -n kube-system deployment/sealed-secrets-controller
```

Create alerts for sealing failures:

```yaml
# prometheus-rule-sealed-secrets.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: sealed-secrets-alerts
spec:
  groups:
  - name: sealed-secrets
    rules:
    - alert: SealedSecretUnsealFailed
      expr: increase(sealed_secrets_controller_unseal_errors_total[5m]) > 0
      annotations:
        summary: "SealedSecret unseal failed"
```

## Cleanup After Migration

Once verified, remove old ConfigMaps containing sensitive data:

```bash
# Delete sensitive ConfigMaps
kubectl delete configmap myapp-config -n production
kubectl delete configmap database-config -n production

# Keep non-sensitive ConfigMaps
kubectl get configmaps -n production
```

## Conclusion

Converting ConfigMaps to Sealed Secrets enables secure GitOps workflows where all configuration, including secrets, can be version controlled. The encryption ensures only your cluster can decrypt the values, providing both security and convenience. This approach is particularly valuable for teams practicing infrastructure as code and wanting to maintain a complete audit trail of configuration changes without exposing sensitive data.
