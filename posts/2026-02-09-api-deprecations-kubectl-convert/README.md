# How to Handle Kubernetes API Deprecations and Migration with kubectl-convert

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API Deprecation, kubectl

Description: Learn how to handle Kubernetes API deprecations using kubectl-convert to migrate manifests to newer API versions, ensuring compatibility with cluster upgrades.

---

Kubernetes deprecates and removes old API versions as it evolves. When you upgrade clusters, manifests using deprecated APIs stop working. The kubectl-convert plugin automatically migrates manifests from deprecated API versions to supported ones, making cluster upgrades smoother and preventing application downtime.

Understanding API deprecation policies and using kubectl-convert ensures your manifests remain compatible across Kubernetes versions without manual rewriting.

## Understanding API Deprecation

Kubernetes follows a deprecation policy:

- GA (v1) APIs: Deprecated versions supported for 12 months or 3 releases
- Beta APIs: Deprecated versions supported for 9 months or 3 releases
- Alpha APIs: May be dropped without notice

Common deprecations:

```yaml
# Deprecated in 1.16, removed in 1.22
apiVersion: extensions/v1beta1
kind: Deployment

# Should be:
apiVersion: apps/v1
kind: Deployment

# Deprecated in 1.16, removed in 1.25
apiVersion: policy/v1beta1
kind: PodSecurityPolicy

# Deprecated in 1.21, removed in 1.25
apiVersion: batch/v1beta1
kind: CronJob

# Should be:
apiVersion: batch/v1
kind: CronJob
```

## Installing kubectl-convert

Install the kubectl convert plugin:

```bash
# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl-convert"
chmod +x kubectl-convert
sudo mv kubectl-convert /usr/local/bin/

# macOS
brew install kubectl-convert

# Or using krew
kubectl krew install convert

# Verify installation
kubectl convert --help
```

## Converting Single Files

Convert a manifest file to the latest API version:

```bash
# Convert deployment from extensions/v1beta1 to apps/v1
kubectl convert -f old-deployment.yaml --output-version apps/v1

# Save to new file
kubectl convert -f old-deployment.yaml --output-version apps/v1 > new-deployment.yaml
```

Example old manifest:

```yaml
# old-deployment.yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: web
        image: nginx:1.21
```

Convert it:

```bash
kubectl convert -f old-deployment.yaml --output-version apps/v1 > new-deployment.yaml
```

Result:

```yaml
# new-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: web
        image: nginx:1.21
```

Notice the added `selector` field required by apps/v1.

## Converting Multiple Files

Convert all files in a directory:

```bash
# Convert all YAML files in manifests directory
for file in manifests/*.yaml; do
    kubectl convert -f "$file" --output-version apps/v1 > "converted/$(basename $file)"
done
```

Or use a script:

```bash
#!/bin/bash

INPUT_DIR="old-manifests"
OUTPUT_DIR="new-manifests"

mkdir -p "$OUTPUT_DIR"

find "$INPUT_DIR" -name "*.yaml" -o -name "*.yml" | while read file; do
    echo "Converting $file..."
    kubectl convert -f "$file" > "$OUTPUT_DIR/$(basename $file)" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "  ✓ Converted successfully"
    else
        echo "  ✗ Conversion failed"
        cp "$file" "$OUTPUT_DIR/$(basename $file)"
    fi
done
```

## Converting CronJobs

CronJobs changed from batch/v1beta1 to batch/v1:

```yaml
# Old format (deprecated in 1.21, removed in 1.25)
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: backup-tool:latest
          restartPolicy: OnFailure
```

Convert:

```bash
kubectl convert -f old-cronjob.yaml --output-version batch/v1 > new-cronjob.yaml
```

## Converting Ingress Resources

Ingress API changed from extensions/v1beta1 and networking.k8s.io/v1beta1 to networking.k8s.io/v1:

```yaml
# Old format
apiVersion: extensions/v1beta1  # or networking.k8s.io/v1beta1
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
          serviceName: webapp
          servicePort: 80
```

Convert:

```bash
kubectl convert -f old-ingress.yaml --output-version networking.k8s.io/v1 > new-ingress.yaml
```

Result:

```yaml
# New format
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
        pathType: Prefix
        backend:
          service:
            name: webapp
            port:
              number: 80
```

## Detecting Deprecated APIs

Find deprecated APIs in your cluster before upgrading:

```bash
# Install kubent (Kube-No-Trouble)
sh -c "$(curl -sSL https://git.io/install-kubent)"

# Scan cluster for deprecated APIs
kubent

# Example output:
# 4.3.0
# >>> Deprecated APIs <<<
# Ingress found in extensions/v1beta1
#         ├─ Ingress: default/app-ingress
# CronJob found in batch/v1beta1
#         ├─ CronJob: default/backup
```

Use pluto to scan files:

```bash
# Install pluto
brew install FairwindsOps/tap/pluto

# Scan directory
pluto detect-files -d manifests/

# Scan Helm releases
pluto detect-helm
```

## Checking API Versions in Running Cluster

List API versions available in your cluster:

```bash
# List all API versions
kubectl api-versions

# Check specific resource
kubectl explain deployment --api-version=apps/v1

# Check deprecation warnings
kubectl get deployments -o yaml | grep apiVersion
```

## Handling Breaking Changes

Some API changes require manual adjustments beyond what kubectl-convert can do:

### PodSecurityPolicy Migration

PodSecurityPolicy was removed in 1.25. Migrate to Pod Security Standards:

```yaml
# Old: PodSecurityPolicy
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  runAsUser:
    rule: MustRunAsNonRoot
```

New approach using Pod Security admission:

```yaml
# Label namespace with pod security level
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### StatefulSet Conversion

StatefulSet selector became immutable:

```bash
# If conversion fails, you might need to recreate
kubectl delete statefulset myapp --cascade=orphan
kubectl apply -f new-statefulset.yaml
```

## Automating Conversion in CI/CD

Add conversion to your pipeline:

```yaml
# GitHub Actions example
name: Update API Versions
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Install kubectl-convert
      run: |
        curl -LO "https://dl.k8s.io/release/v1.28.0/bin/linux/amd64/kubectl-convert"
        chmod +x kubectl-convert
        sudo mv kubectl-convert /usr/local/bin/

    - name: Convert manifests
      run: |
        mkdir -p converted
        for file in manifests/*.yaml; do
          kubectl-convert -f "$file" > "converted/$(basename $file)" || cp "$file" "converted/$(basename $file)"
        done

    - name: Create PR
      uses: peter-evans/create-pull-request@v5
      with:
        commit-message: Update deprecated API versions
        title: Automated API version updates
        body: Automated conversion of deprecated APIs
        branch: update-api-versions
```

## Testing Converted Manifests

Validate converted manifests:

```bash
# Dry-run apply
kubectl apply -f new-deployment.yaml --dry-run=server

# Validate syntax
kubectl apply -f new-deployment.yaml --validate=true --dry-run=client

# Use kubeval for additional validation
kubeval new-deployment.yaml
```

## Helm Chart Updates

For Helm charts, update chart API versions:

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
version: 2.0.0

# Bump apiVersion from v1 to v2 for Helm 3 compatibility
```

Update templates:

```bash
# Convert templates
for file in templates/*.yaml; do
    kubectl convert -f "$file" > "$file.new"
    mv "$file.new" "$file"
done

# Test chart
helm lint .
helm template . > rendered.yaml
kubectl apply -f rendered.yaml --dry-run=server
```

## Migration Timeline Planning

Plan API migrations:

```bash
# Check current Kubernetes version
kubectl version --short

# Plan upgrade path
# Current: 1.24 -> Target: 1.28

# Identify affected APIs
pluto detect-files -d manifests/ --target-versions k8s=v1.28

# Convert manifests
kubectl convert -f manifests/ --output-version <latest>

# Test in staging
kubectl apply -f converted/ --dry-run=server

# Apply to production after validation
kubectl apply -f converted/
```

## Monitoring Deprecation Warnings

Enable and monitor API server warnings:

```bash
# Check API server logs for deprecation warnings
kubectl logs -n kube-system kube-apiserver-xxx | grep deprecated

# Enable audit logging for deprecated API usage
# Add to kube-apiserver flags:
# --audit-log-path=/var/log/kubernetes/audit.log
# --audit-policy-file=/etc/kubernetes/audit-policy.yaml

# Create audit policy
cat <<EOF > audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  verbs: ["create", "update", "patch"]
  omitStages:
  - RequestReceived
EOF
```

## Best Practices

Run kubectl-convert before cluster upgrades to identify issues early.

Test converted manifests in a staging environment before applying to production.

Keep manifests in version control and create separate branches for API version updates.

Use CI/CD automation to regularly check for deprecated APIs.

Document which API versions your manifests target and update your cluster compatibility matrix.

kubectl-convert simplifies API version migrations, but understanding breaking changes and testing thoroughly remain essential for successful Kubernetes cluster upgrades.
