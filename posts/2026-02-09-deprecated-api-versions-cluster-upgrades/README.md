# How to Handle Deprecated API Versions During Kubernetes Cluster Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, API Versions, Migration

Description: Learn how to identify deprecated Kubernetes API versions in your cluster, migrate resources to supported APIs, and ensure smooth upgrades without breaking existing workloads.

---

Kubernetes evolves rapidly, introducing new API versions and deprecating old ones. When you upgrade clusters, resources using deprecated APIs may fail to function. Understanding the deprecation policy, identifying affected resources, and migrating them to current API versions before upgrading prevents service disruptions and failed deployments.

## Understanding Kubernetes API Deprecation Policy

Kubernetes follows a strict deprecation policy. API versions go through alpha, beta, and stable stages. Alpha APIs may be removed without notice. Beta APIs are deprecated but supported for at least 9 months or 3 releases. Stable APIs must be supported for 12 months or 3 releases after deprecation.

Common deprecation patterns:

- v1beta1 -> v1beta2 -> v1 (graduation to stable)
- Extensions/v1beta1 -> apps/v1 (API group migration)
- Removal of deprecated APIs after support period ends

Check the Kubernetes release notes for your target version to see which APIs are removed.

## Identifying Deprecated API Usage

Find deprecated APIs currently in use:

```bash
# Check for deprecated API requests in the last hour
kubectl get --raw /metrics | \
  grep apiserver_requested_deprecated_apis

# View API server audit logs for deprecated API usage
kubectl logs -n kube-system kube-apiserver-<node> | \
  grep -i deprecated

# Use kubectl-convert plugin to find conversion candidates
kubectl get all --all-namespaces -o json | \
  jq -r '.items[] | select(.apiVersion | contains("v1beta"))' | \
  jq '.kind, .apiVersion'
```

Install pluto to scan for deprecated APIs:

```bash
# Install pluto
wget https://github.com/FairwindsOps/pluto/releases/download/v5.19.0/pluto_5.19.0_linux_amd64.tar.gz
tar xzf pluto_5.19.0_linux_amd64.tar.gz
sudo mv pluto /usr/local/bin/

# Scan cluster for deprecated APIs
pluto detect-api-resources --target-versions k8s=v1.29.0

# Scan Helm releases
pluto detect-helm --target-versions k8s=v1.29.0

# Scan files
pluto detect-files -d /path/to/manifests --target-versions k8s=v1.29.0
```

Use kubent (Kubernetes No Trouble) for comprehensive scanning:

```bash
# Install kubent
sh -c "$(curl -sSL https://git.io/install-kubent)"

# Scan cluster
kubent

# Example output shows resources using deprecated APIs:
# 5:25PM INF >>> Deprecated APIs removed in 1.29 <<<
# 5:25PM INF PodDisruptionBudget found
#         ├─ API: policy/v1beta1
#         ├─ Deprecated In: v1.21
#         ├─ Removed In: v1.25
#         └─ Replacement: policy/v1
```

## Migrating Deployments from extensions/v1beta1 to apps/v1

One of the most common migrations is from extensions/v1beta1 to apps/v1:

```bash
# Find Deployments using old API
kubectl get deployments --all-namespaces -o json | \
  jq -r '.items[] | select(.apiVersion == "extensions/v1beta1") | "\(.metadata.namespace)/\(.metadata.name)"'

# Export with old API
kubectl get deployment old-deployment -n production \
  -o yaml > deployment.yaml

# Convert using kubectl-convert
kubectl-convert -f deployment.yaml --output-version apps/v1 > deployment-v1.yaml

# Review changes
diff deployment.yaml deployment-v1.yaml

# Apply updated version
kubectl apply -f deployment-v1.yaml
```

Manual conversion example:

```yaml
# Old API (extensions/v1beta1)
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: nginx
  namespace: production
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25

# New API (apps/v1)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: production
spec:
  replicas: 3
  # selector is now required
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
```

## Migrating PodSecurityPolicy to PodSecurity Admission

PodSecurityPolicy was removed in v1.25. Migrate to Pod Security Standards:

```bash
# Audit existing PSPs
kubectl get psp

# Map PSP to Pod Security Standards levels
# restricted, baseline, or privileged

# Enable Pod Security admission
# Edit API server manifest
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

Add admission configuration:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --admission-control-config-file=/etc/kubernetes/admission/admission-config.yaml
    volumeMounts:
    - name: admission-config
      mountPath: /etc/kubernetes/admission
  volumes:
  - name: admission-config
    hostPath:
      path: /etc/kubernetes/admission
```

Create admission configuration:

```yaml
# /etc/kubernetes/admission/admission-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: "baseline"
      enforce-version: "latest"
      audit: "restricted"
      audit-version: "latest"
      warn: "restricted"
      warn-version: "latest"
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces: ["kube-system"]
```

Label namespaces with security levels:

```bash
# Set namespace to baseline
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/audit=baseline \
  pod-security.kubernetes.io/warn=baseline

# Set namespace to restricted
kubectl label namespace critical-apps \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

## Migrating Ingress from networking.k8s.io/v1beta1

Update Ingress resources:

```yaml
# Old API (networking.k8s.io/v1beta1)
apiVersion: networking.k8s.io/v1beta1
kind: Ingress
metadata:
  name: app-ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        backend:
          serviceName: app-service
          servicePort: 80

# New API (networking.k8s.io/v1)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix  # Required field
        backend:
          service:  # Changed structure
            name: app-service
            port:
              number: 80
```

Batch convert Ingress resources:

```bash
#!/bin/bash
# migrate-ingress.sh

kubectl get ingress --all-namespaces -o json | \
  jq -r '.items[] | select(.apiVersion == "networking.k8s.io/v1beta1") | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read namespace name; do
    echo "Converting ingress: $namespace/$name"

    # Export current
    kubectl get ingress $name -n $namespace -o yaml > /tmp/ingress-old.yaml

    # Convert
    kubectl-convert -f /tmp/ingress-old.yaml \
      --output-version networking.k8s.io/v1 > /tmp/ingress-new.yaml

    # Apply converted version
    kubectl apply -f /tmp/ingress-new.yaml

    echo "Converted $namespace/$name"
  done
```

## Updating CustomResourceDefinitions

Update CRDs to v1:

```yaml
# Old API (apiextensions.k8s.io/v1beta1)
apiVersion: apiextensions.k8s.io/v1beta1
kind: CustomResourceDefinition
metadata:
  name: examples.example.com
spec:
  group: example.com
  version: v1
  names:
    kind: Example
    plural: examples
  scope: Namespaced

# New API (apiextensions.k8s.io/v1)
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: examples.example.com
spec:
  group: example.com
  versions:  # Changed to list
  - name: v1
    served: true
    storage: true
    schema:  # Schema is now required
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              field1:
                type: string
  names:
    kind: Example
    plural: examples
  scope: Namespaced
```

## Migrating Storage API Versions

Update PersistentVolume and StorageClass resources:

```bash
# Find deprecated storage resources
kubectl get pv,pvc,storageclass --all-namespaces -o json | \
  jq -r '.items[] | select(.apiVersion | contains("v1beta"))' | \
  jq '{kind: .kind, name: .metadata.name, apiVersion: .apiVersion}'
```

## Creating a Pre-Upgrade Migration Script

Automate the migration process:

```bash
#!/bin/bash
# pre-upgrade-migration.sh

set -e

echo "=== Kubernetes API Migration Script ==="
echo "Target version: v1.29.0"
echo

# 1. Scan for deprecated APIs
echo "Scanning for deprecated APIs..."
pluto detect-api-resources --target-versions k8s=v1.29.0 > /tmp/deprecated-apis.txt
cat /tmp/deprecated-apis.txt

# 2. Backup current resources
echo "Backing up resources..."
kubectl get all --all-namespaces -o yaml > /backup/pre-migration-backup.yaml

# 3. Migrate Deployments
echo "Migrating Deployments..."
kubectl get deployments --all-namespaces -o json | \
  jq -r '.items[] | select(.apiVersion != "apps/v1") | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    kubectl get deployment $name -n $ns -o yaml | \
      kubectl-convert -f - --output-version apps/v1 | \
      kubectl apply -f -
  done

# 4. Migrate Ingress
echo "Migrating Ingress resources..."
kubectl get ingress --all-namespaces -o json | \
  jq -r '.items[] | select(.apiVersion != "networking.k8s.io/v1") | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    kubectl get ingress $name -n $ns -o yaml | \
      kubectl-convert -f - --output-version networking.k8s.io/v1 | \
      kubectl apply -f -
  done

# 5. Verify no deprecated APIs remain
echo "Verifying migration..."
pluto detect-api-resources --target-versions k8s=v1.29.0

echo "Migration complete!"
```

## Testing After Migration

Verify resources work with new API versions:

```bash
# Test deployments
kubectl get deployments --all-namespaces
kubectl rollout status deployment/<name> -n <namespace>

# Test ingress
kubectl get ingress --all-namespaces
curl -I https://app.example.com

# Test custom resources
kubectl get <custom-resource> --all-namespaces

# Check for errors
kubectl get events --all-namespaces | grep -i error
```

## Handling Helm Chart API Versions

Update Helm charts with deprecated APIs:

```bash
# Find charts using deprecated APIs
helm list --all-namespaces -o json | \
  jq -r '.[] | "\(.namespace) \(.name)"' | \
  while read ns name; do
    helm get manifest $name -n $ns | pluto detect -
  done

# Upgrade Helm chart to version with updated APIs
helm repo update
helm upgrade <release> <chart> -n <namespace> --version <new-version>

# If chart hasn't been updated, patch manually
helm get values <release> -n <namespace> > values.yaml
helm get manifest <release> -n <namespace> > manifest.yaml
# Edit manifest.yaml to update API versions
kubectl apply -f manifest.yaml
```

## Creating API Version Migration Documentation

Document your migrations:

```markdown
# API Version Migration Log

## Kubernetes Upgrade: v1.27 -> v1.29

### Deprecated APIs Removed in v1.29
- PodSecurityPolicy (policy/v1beta1) - Removed
- CronJob (batch/v1beta1) - Use batch/v1

### Migration Actions Taken

#### 2026-02-09: Deployment Migration
- Migrated 47 Deployments from extensions/v1beta1 to apps/v1
- Namespaces affected: production, staging, dev
- Script: /scripts/migrate-deployments.sh
- Backup: /backups/pre-deployment-migration.yaml

#### 2026-02-09: Ingress Migration
- Migrated 23 Ingress resources from networking.k8s.io/v1beta1 to v1
- Updated pathType fields to "Prefix"
- Backup: /backups/pre-ingress-migration.yaml

#### 2026-02-09: PSP to Pod Security Migration
- Removed 8 PodSecurityPolicies
- Applied Pod Security labels to all namespaces
- Exempted kube-system namespace

### Validation
- All resources redeployed successfully
- No deprecated API usage detected
- Pluto scan clean
- Ready for upgrade to v1.29
```

## Monitoring for Deprecated API Usage

Set up ongoing monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: deprecated-api-alerts
  namespace: monitoring
spec:
  groups:
  - name: api-deprecation
    rules:
    - alert: DeprecatedAPIUsage
      expr: apiserver_requested_deprecated_apis > 0
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Deprecated API usage detected"
        description: "API {{ $labels.group }}/{{ $labels.version }} is deprecated and will be removed"
```

Handling deprecated API versions is critical for smooth Kubernetes upgrades. Scan for deprecated APIs before upgrading, migrate resources to current versions, test thoroughly, and document all changes to ensure nothing breaks during the upgrade process.
