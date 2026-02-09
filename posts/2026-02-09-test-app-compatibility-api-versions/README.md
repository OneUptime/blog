# How to Test Application Compatibility with New Kubernetes API Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, Testing

Description: Master testing application compatibility with new Kubernetes API versions using deprecation warnings, kubectl convert, API server logs, and automated compatibility scanning tools.

---

Kubernetes API versions change with each release, deprecating old APIs and introducing new ones. Applications using deprecated APIs will eventually break after upgrades. Testing API compatibility before upgrading ensures your workloads continue running without interruption on newer Kubernetes versions.

## Understanding API Deprecation

Kubernetes follows a well-defined API deprecation policy. APIs are marked as deprecated for at least two minor versions before removal. For example, an API deprecated in 1.27 won't be removed until 1.29 at the earliest. This gives you time to migrate, but only if you test compatibility proactively.

Common API changes include extensions/v1beta1 Ingress moving to networking.k8s.io/v1, apiextensions.k8s.io/v1beta1 CustomResourceDefinitions moving to v1, and batch/v1beta1 CronJob moving to batch/v1. Each change requires updating your manifests and deployments.

## Checking for Deprecated APIs

Scan your cluster for resources using deprecated APIs before upgrading.

```bash
#!/bin/bash
# check-deprecated-apis.sh

TARGET_VERSION="1.29"

echo "Checking for deprecated APIs for Kubernetes $TARGET_VERSION..."

# Use kubectl to list all resources
kubectl api-resources --verbs=list --namespaced -o name | while read resource; do
  kubectl get $resource -A -o json 2>/dev/null | \
    jq -r --arg version "$TARGET_VERSION" '
      .items[] |
      select(.apiVersion | contains("v1beta") or contains("v1alpha")) |
      "\(.kind),\(.apiVersion),\(.metadata.namespace),\(.metadata.name)"
    '
done | sort -u | column -t -s,

# Check specifically for known deprecated APIs
echo "Checking specific deprecated APIs..."

# Ingress (deprecated in 1.19, removed in 1.22)
kubectl get ingress -A -o json | jq -r '.items[] | select(.apiVersion == "extensions/v1beta1") | "\(.metadata.namespace)/\(.metadata.name)"'

# CronJob (deprecated in 1.21, removed in 1.25)
kubectl get cronjob -A -o json | jq -r '.items[] | select(.apiVersion == "batch/v1beta1") | "\(.metadata.namespace)/\(.metadata.name)"'

# PodSecurityPolicy (removed in 1.25)
kubectl get psp -A 2>/dev/null || echo "PSP already removed or not used"
```

Use pluto tool for comprehensive deprecated API scanning:

```bash
#!/bin/bash
# scan-with-pluto.sh

# Install pluto
curl -L https://github.com/FairwindsOps/pluto/releases/download/v5.19.0/pluto_5.19.0_linux_amd64.tar.gz | tar xz
sudo mv pluto /usr/local/bin/

# Scan cluster
pluto detect-all-in-cluster --target-versions k8s=v1.29.0

# Scan Helm releases
pluto detect-helm --target-versions k8s=v1.29.0

# Scan manifest files
pluto detect-files -d ./k8s-manifests/ --target-versions k8s=v1.29.0
```

## Testing Against New API Server

Test your applications against a Kubernetes API server running the target version.

```bash
#!/bin/bash
# test-against-new-api.sh

TARGET_VERSION="1.29.0"

echo "Setting up test cluster with Kubernetes $TARGET_VERSION..."

# Create test cluster with kind
cat <<EOF | kind create cluster --name api-test --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kindest/node:v$TARGET_VERSION
- role: worker
  image: kindest/node:v$TARGET_VERSION
EOF

# Get kubeconfig for test cluster
kind get kubeconfig --name api-test > /tmp/api-test-kubeconfig

# Deploy your applications to test cluster
kubectl --kubeconfig=/tmp/api-test-kubeconfig apply -f ./k8s-manifests/

# Check for warnings and errors
kubectl --kubeconfig=/tmp/api-test-kubeconfig get all -A

# Run application tests
./run-integration-tests.sh --kubeconfig=/tmp/api-test-kubeconfig

# Cleanup
kind delete cluster --name api-test
```

## Converting Manifests to New API Versions

Use kubectl convert to migrate manifests to new API versions.

```bash
#!/bin/bash
# convert-manifests.sh

MANIFEST_DIR="./k8s-manifests"
OUTPUT_DIR="./k8s-manifests-converted"

mkdir -p $OUTPUT_DIR

echo "Converting manifests to latest API versions..."

# Install kubectl convert plugin
curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl-convert"
chmod +x kubectl-convert
sudo mv kubectl-convert /usr/local/bin/

# Convert all YAML files
find $MANIFEST_DIR -name "*.yaml" -o -name "*.yml" | while read file; do
  filename=$(basename $file)
  echo "Converting $filename..."

  kubectl-convert -f $file --output-version latest > $OUTPUT_DIR/$filename

  # Show differences
  diff $file $OUTPUT_DIR/$filename || true
done

echo "Conversion complete. Review files in $OUTPUT_DIR"
```

## Monitoring API Deprecation Warnings

Enable and monitor API deprecation warnings from the API server.

```bash
#!/bin/bash
# monitor-deprecation-warnings.sh

echo "Monitoring API deprecation warnings..."

# Check API server audit logs
kubectl logs -n kube-system -l component=kube-apiserver | grep -i "deprecated"

# For managed clusters, check provider-specific logging
# AWS EKS
aws logs filter-log-events \
  --log-group-name /aws/eks/production/cluster \
  --filter-pattern "deprecated"

# Enable audit logging to capture all API calls
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: audit-policy
  namespace: kube-system
data:
  audit-policy.yaml: |
    apiVersion: audit.k8s.io/v1
    kind: Policy
    rules:
    - level: RequestResponse
      verbs: ["create", "update", "patch"]
      omitStages: ["RequestReceived"]
EOF
```

## Automated API Compatibility Testing

Create automated tests to catch API compatibility issues early.

```bash
#!/bin/bash
# automated-api-compatibility-test.sh

set -e

TEST_CLUSTER="api-compat-test"
TARGET_VERSION="1.29.0"
TEST_DIR="./k8s-manifests"

echo "Running automated API compatibility tests..."

# Create test cluster
kind create cluster --name $TEST_CLUSTER --image kindest/node:v$TARGET_VERSION

# Function to test a manifest
test_manifest() {
  local file=$1
  echo "Testing $file..."

  # Try to apply manifest
  if kubectl apply -f $file --dry-run=server 2>&1 | tee /tmp/test-output.txt; then
    # Check for warnings
    if grep -i "warning\|deprecated" /tmp/test-output.txt; then
      echo "WARNING: Deprecation warnings found in $file"
      return 1
    else
      echo "PASS: $file"
      return 0
    fi
  else
    echo "FAIL: $file could not be applied"
    return 1
  fi
}

# Test all manifests
failures=0
for file in $(find $TEST_DIR -name "*.yaml" -o -name "*.yml"); do
  if ! test_manifest $file; then
    ((failures++))
  fi
done

# Cleanup
kind delete cluster --name $TEST_CLUSTER

if [ $failures -gt 0 ]; then
  echo "FAILED: $failures manifests have compatibility issues"
  exit 1
else
  echo "PASSED: All manifests are compatible"
fi
```

## Testing Helm Charts

Test Helm charts against new API versions.

```bash
#!/bin/bash
# test-helm-compatibility.sh

CHART_DIR="./helm-charts"
TARGET_VERSION="1.29.0"

echo "Testing Helm chart compatibility..."

# Create test cluster
kind create cluster --name helm-test --image kindest/node:v$TARGET_VERSION

# Test each chart
for chart in $(find $CHART_DIR -name "Chart.yaml" -exec dirname {} \;); do
  echo "Testing chart: $chart"

  # Lint chart
  helm lint $chart

  # Template and check for deprecated APIs
  helm template test $chart | pluto detect - --target-versions k8s=v$TARGET_VERSION

  # Try installing
  helm install test-$RANDOM $chart --dry-run

  echo "Chart $chart tested successfully"
done

# Cleanup
kind delete cluster --name helm-test
```

## CI/CD Integration

Integrate API compatibility tests into your CI/CD pipeline.

```yaml
# .github/workflows/k8s-api-compatibility.yml
name: Kubernetes API Compatibility

on:
  pull_request:
    paths:
      - 'k8s/**'
      - 'helm/**'

jobs:
  api-compatibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up kind
        uses: helm/kind-action@v1
        with:
          version: v0.20.0
          node_image: kindest/node:v1.29.0

      - name: Install pluto
        run: |
          curl -L https://github.com/FairwindsOps/pluto/releases/download/v5.19.0/pluto_5.19.0_linux_amd64.tar.gz | tar xz
          sudo mv pluto /usr/local/bin/

      - name: Check for deprecated APIs
        run: |
          pluto detect-files -d k8s/ --target-versions k8s=v1.29.0
          pluto detect-files -d helm/ --target-versions k8s=v1.29.0

      - name: Test manifests
        run: |
          for file in k8s/**/*.yaml; do
            kubectl apply -f $file --dry-run=server
          done
```

## Updating Application Code

Some API changes require application code updates, not just manifest changes.

```go
// Example: Updating client-go code
package main

import (
    "context"
    networkingv1 "k8s.io/api/networking/v1" // Updated from extensions/v1beta1
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func createIngress(clientset *kubernetes.Clientset) error {
    pathType := networkingv1.PathTypePrefix

    ingress := &networkingv1.Ingress{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "example-ingress",
            Namespace: "default",
        },
        Spec: networkingv1.IngressSpec{
            Rules: []networkingv1.IngressRule{
                {
                    Host: "example.com",
                    IngressRuleValue: networkingv1.IngressRuleValue{
                        HTTP: &networkingv1.HTTPIngressRuleValue{
                            Paths: []networkingv1.HTTPIngressPath{
                                {
                                    Path:     "/",
                                    PathType: &pathType,
                                    Backend: networkingv1.IngressBackend{
                                        Service: &networkingv1.IngressServiceBackend{
                                            Name: "example-service",
                                            Port: networkingv1.ServiceBackendPort{
                                                Number: 80,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    }

    _, err := clientset.NetworkingV1().Ingresses("default").Create(
        context.TODO(),
        ingress,
        metav1.CreateOptions{},
    )
    return err
}
```

## Creating Migration Scripts

Automate the migration of resources to new API versions.

```bash
#!/bin/bash
# migrate-deprecated-apis.sh

echo "Migrating resources to new API versions..."

# Migrate Ingress from extensions/v1beta1 to networking.k8s.io/v1
kubectl get ingress -A -o json | \
  jq '.items[] | select(.apiVersion == "extensions/v1beta1")' | \
  while read -r ing; do
    ns=$(echo $ing | jq -r '.metadata.namespace')
    name=$(echo $ing | jq -r '.metadata.name')

    echo "Migrating Ingress $ns/$name..."

    # Get current ingress
    kubectl get ingress $name -n $ns -o yaml | \
      sed 's/apiVersion: extensions\/v1beta1/apiVersion: networking.k8s.io\/v1/' | \
      kubectl apply -f -
  done

# Migrate CronJob from batch/v1beta1 to batch/v1
kubectl get cronjob -A -o json | \
  jq '.items[] | select(.apiVersion == "batch/v1beta1")' | \
  while read -r cj; do
    ns=$(echo $cj | jq -r '.metadata.namespace')
    name=$(echo $cj | jq -r '.metadata.name')

    echo "Migrating CronJob $ns/$name..."

    kubectl get cronjob $name -n $ns -o yaml | \
      sed 's/apiVersion: batch\/v1beta1/apiVersion: batch\/v1/' | \
      kubectl apply -f -
  done

echo "Migration complete"
```

Testing application compatibility with new Kubernetes API versions is essential for successful upgrades. By scanning for deprecated APIs, testing against new API servers, converting manifests proactively, and integrating compatibility checks into your CI/CD pipeline, you can confidently upgrade Kubernetes while ensuring your applications continue to function correctly.
