# How to Use kubectl-convert to Migrate Deprecated API Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Upgrades, Tools

Description: Migrate Kubernetes manifests from deprecated to current API versions using kubectl-convert, automating the remediation of API deprecations before cluster upgrades.

---

kubectl-convert automates migration of Kubernetes manifests between API versions, translating deprecated resources to their current equivalents. Manual conversion is error-prone and time-consuming for large codebases. kubectl-convert handles API version translation, field mapping changes, and structural modifications required for compatibility with newer Kubernetes versions.

This guide demonstrates installing kubectl-convert, converting individual manifests and entire directories, handling conversion edge cases, and integrating conversion into CI/CD pipelines.

## Installing kubectl-convert

kubectl-convert must match your target Kubernetes version.

```bash
# Download kubectl-convert matching target cluster version
KUBE_VERSION=v1.28.4
curl -LO "https://dl.k8s.io/release/${KUBE_VERSION}/bin/linux/amd64/kubectl-convert"

# Verify checksum
curl -LO "https://dl.k8s.io/release/${KUBE_VERSION}/bin/linux/amd64/kubectl-convert.sha256"
echo "$(cat kubectl-convert.sha256) kubectl-convert" | sha256sum --check

# Install
chmod +x kubectl-convert
sudo mv kubectl-convert /usr/local/bin/

# Verify installation
kubectl-convert --help
kubectl convert --help  # Alias also works
```

## Converting Individual Manifests

Convert specific manifest files to newer API versions.

```bash
# Example deprecated Ingress manifest
cat > ingress-old.yaml <<EOF
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        backend:
          serviceName: web
          servicePort: 80
EOF

# Convert to current API version
kubectl-convert -f ingress-old.yaml --output-version networking.k8s.io/v1 > ingress-new.yaml

# View converted manifest
cat ingress-new.yaml
```

The output shows the updated API version and field structure:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

## Converting Multiple Resources

Convert all resources in a directory.

```bash
# Create directory structure
mkdir -p manifests/deprecated manifests/current

# Convert all YAML files in directory
for file in manifests/deprecated/*.yaml; do
  echo "Converting $file"
  kubectl-convert -f "$file" --output-version="" > "manifests/current/$(basename $file)"
done

# Or use find for nested directories
find manifests/deprecated -name "*.yaml" -type f | while read file; do
  output_file="manifests/current/$(basename $file)"
  echo "Converting $file -> $output_file"
  kubectl-convert -f "$file" > "$output_file"
done
```

## Converting Specific API Versions

Target specific API version conversions.

```bash
# Convert Deployment from apps/v1beta2 to apps/v1
kubectl-convert -f deployment-old.yaml --output-version apps/v1 > deployment-new.yaml

# Convert CronJob from batch/v1beta1 to batch/v1
kubectl-convert -f cronjob-old.yaml --output-version batch/v1 > cronjob-new.yaml

# Convert PodDisruptionBudget from policy/v1beta1 to policy/v1
kubectl-convert -f pdb-old.yaml --output-version policy/v1 > pdb-new.yaml

# Convert StorageClass from storage.k8s.io/v1beta1 to storage.k8s.io/v1
kubectl-convert -f storageclass-old.yaml --output-version storage.k8s.io/v1 > storageclass-new.yaml
```

## Handling Multi-Resource Files

Convert files containing multiple resources.

```bash
# multi-resource.yaml with mixed API versions
cat > multi-resource.yaml <<EOF
apiVersion: extensions/v1beta1
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
          serviceName: app
          servicePort: 80
---
apiVersion: apps/v1beta2
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: nginx:1.25
EOF

# Convert all resources
kubectl-convert -f multi-resource.yaml > multi-resource-converted.yaml

# View converted file
cat multi-resource-converted.yaml
```

## Converting Helm Chart Templates

Convert Helm chart templates to newer API versions.

```bash
# Template chart first
helm template my-release ./my-chart > templated-resources.yaml

# Convert templated resources
kubectl-convert -f templated-resources.yaml > templated-resources-converted.yaml

# Extract specific sections back to chart templates
# This requires manual work to reintegrate with Helm template syntax

# Alternative: Convert chart templates directly
for template in my-chart/templates/*.yaml; do
  if grep -q "apiVersion" "$template"; then
    echo "Converting $template"
    # Backup original
    cp "$template" "${template}.backup"
    # Convert (may break Helm template syntax)
    kubectl-convert -f "$template" > "${template}.tmp"
    # Review and manually merge changes
    echo "Review ${template}.tmp and manually update $template"
  fi
done
```

## Validating Converted Manifests

Verify converted manifests are valid before applying.

```bash
# Validate with kubectl
kubectl apply --dry-run=client -f ingress-new.yaml

# Validate server-side
kubectl apply --dry-run=server -f ingress-new.yaml

# Check differences
diff -u ingress-old.yaml ingress-new.yaml

# Validate entire directory
for file in manifests/current/*.yaml; do
  echo "Validating $file"
  kubectl apply --dry-run=server -f "$file" || echo "❌ Validation failed for $file"
done
```

## Creating Conversion Script

Automate bulk conversion with error handling.

```bash
#!/bin/bash
# convert-manifests.sh

set -e

SOURCE_DIR="${1:-manifests/deprecated}"
TARGET_DIR="${2:-manifests/current}"
TARGET_VERSION="${3:-}"

mkdir -p "$TARGET_DIR"

echo "Converting manifests from $SOURCE_DIR to $TARGET_DIR"

FAILED_FILES=()

find "$SOURCE_DIR" -name "*.yaml" -o -name "*.yml" | while read -r file; do
  filename=$(basename "$file")
  output_file="$TARGET_DIR/$filename"

  echo -n "Converting $filename... "

  if [ -n "$TARGET_VERSION" ]; then
    if kubectl-convert -f "$file" --output-version "$TARGET_VERSION" > "$output_file" 2>/dev/null; then
      echo "✓"
    else
      echo "❌"
      FAILED_FILES+=("$filename")
    fi
  else
    if kubectl-convert -f "$file" > "$output_file" 2>/dev/null; then
      echo "✓"
    else
      echo "❌"
      FAILED_FILES+=("$filename")
    fi
  fi

  # Validate converted manifest
  if ! kubectl apply --dry-run=client -f "$output_file" &>/dev/null; then
    echo "  ⚠️  Validation warning for $filename"
  fi
done

if [ ${#FAILED_FILES[@]} -gt 0 ]; then
  echo -e "\n❌ Failed to convert:"
  printf '%s\n' "${FAILED_FILES[@]}"
  exit 1
fi

echo -e "\n✓ Conversion complete!"
```

Usage:

```bash
chmod +x convert-manifests.sh

# Convert all manifests
./convert-manifests.sh manifests/old manifests/new

# Convert with specific target version
./convert-manifests.sh manifests/old manifests/new apps/v1
```

## Integrating with CI/CD

Add conversion to CI/CD pipelines.

```yaml
# .github/workflows/convert-apis.yaml
name: Convert Deprecated APIs
on:
  pull_request:
    paths:
    - 'k8s/**'

jobs:
  convert:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Install kubectl-convert
      run: |
        KUBE_VERSION=v1.28.4
        curl -LO "https://dl.k8s.io/release/${KUBE_VERSION}/bin/linux/amd64/kubectl-convert"
        chmod +x kubectl-convert
        sudo mv kubectl-convert /usr/local/bin/

    - name: Convert manifests
      run: |
        mkdir -p k8s/converted
        for file in k8s/*.yaml; do
          kubectl-convert -f "$file" > "k8s/converted/$(basename $file)"
        done

    - name: Validate converted manifests
      run: |
        kubectl apply --dry-run=client -f k8s/converted/

    - name: Create PR comment with changes
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const { execSync } = require('child_process');

          const diff = execSync('diff -u k8s/ k8s/converted/ || true').toString();

          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '## API Conversion Results\n\n```diff\n' + diff + '\n```'
          });
```

## Handling Conversion Failures

Some resources may fail conversion due to custom fields or complex transformations.

```bash
# Capture conversion errors
kubectl-convert -f problematic.yaml 2> conversion-errors.log

# Common issues and solutions:

# 1. Custom resources - Convert CRD first
kubectl-convert -f mycrd-definition.yaml --output-version apiextensions.k8s.io/v1

# 2. Admission webhooks - Update webhook configuration
kubectl-convert -f webhook.yaml --output-version admissionregistration.k8s.io/v1

# 3. Unknown fields - May require manual editing
# Review the error and manually update manifest
```

## Batch Conversion with Version Detection

Automatically detect and convert based on current API version.

```bash
#!/bin/bash
# smart-convert.sh

for file in manifests/*.yaml; do
  API_VERSION=$(yq eval '.apiVersion' "$file")

  case "$API_VERSION" in
    "extensions/v1beta1")
      KIND=$(yq eval '.kind' "$file")
      if [ "$KIND" = "Ingress" ]; then
        kubectl-convert -f "$file" --output-version networking.k8s.io/v1 > "${file}.new"
      elif [ "$KIND" = "Deployment" ]; then
        kubectl-convert -f "$file" --output-version apps/v1 > "${file}.new"
      fi
      ;;
    "apps/v1beta1" | "apps/v1beta2")
      kubectl-convert -f "$file" --output-version apps/v1 > "${file}.new"
      ;;
    "batch/v1beta1")
      kubectl-convert -f "$file" --output-version batch/v1 > "${file}.new"
      ;;
    "policy/v1beta1")
      kubectl-convert -f "$file" --output-version policy/v1 > "${file}.new"
      ;;
    *)
      echo "No conversion needed for $file (API: $API_VERSION)"
      ;;
  esac
done
```

kubectl-convert streamlines the API migration process by automating manifest translation between versions. By incorporating conversion into CI/CD pipelines and validation workflows, you ensure manifests stay current with supported API versions. The combination of automated conversion and validation prevents deprecated API usage from reaching production, enabling smooth cluster upgrades without application disruption.
