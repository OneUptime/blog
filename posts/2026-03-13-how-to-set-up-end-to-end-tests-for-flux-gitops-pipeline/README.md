# How to Set Up End-to-End Tests for Flux GitOps Pipeline

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, E2E Testing, CI/CD, Testing

Description: Learn how to build a complete end-to-end testing pipeline that validates your entire Flux GitOps workflow from Git push to cluster deployment.

---

End-to-end testing for a Flux GitOps pipeline validates the entire workflow: pushing manifests to Git, Flux detecting the changes, reconciling resources, and verifying the final cluster state. This level of testing gives you confidence that the complete pipeline works correctly, not just individual components.

This guide covers building a comprehensive E2E testing setup for Flux.

## E2E Testing Strategy

An end-to-end test for Flux should cover these stages:

1. Set up a test cluster with Flux installed
2. Configure Flux to watch a test repository or branch
3. Push manifest changes to the repository
4. Wait for Flux to detect and reconcile the changes
5. Verify the cluster state matches expectations
6. Test updates and deletions
7. Clean up

## Setting Up the Test Environment

Start by creating the test infrastructure. Use kind for a local cluster and Gitea or a dedicated Git branch for the source repository.

```bash
#!/bin/bash
set -euo pipefail

# Create cluster
kind create cluster --name flux-e2e --wait 5m

# Install Flux
flux install --components-extra=image-reflector-controller,image-automation-controller

# Verify Flux is running
flux check
```

## Using a Local Git Server

For isolated testing, run a local Git server with Gitea:

```yaml
# gitea-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gitea
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: gitea
  template:
    metadata:
      labels:
        app: gitea
    spec:
      containers:
        - name: gitea
          image: gitea/gitea:latest
          ports:
            - containerPort: 3000
            - containerPort: 22
---
apiVersion: v1
kind: Service
metadata:
  name: gitea
  namespace: default
spec:
  type: ClusterIP
  ports:
    - port: 3000
      targetPort: 3000
      name: http
  selector:
    app: gitea
```

## Configuring the Test Repository

Set up a test repository with a known structure:

```bash
# Initialize test repo
mkdir -p /tmp/flux-e2e-repo
cd /tmp/flux-e2e-repo
git init

# Create base manifests
mkdir -p apps/base
cat > apps/base/deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
EOF

cat > apps/base/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
EOF

git add -A && git commit -m "Initial commit"
```

## Connecting Flux to the Test Repository

Point Flux at the test repository:

```bash
flux create source git e2e-test \
  --url=http://gitea.default.svc.cluster.local:3000/test/flux-e2e.git \
  --branch=main \
  --interval=30s

flux create kustomization e2e-test \
  --source=GitRepository/e2e-test \
  --path=./apps/base \
  --prune=true \
  --interval=30s
```

## Writing E2E Test Scenarios

### Test 1: Initial Deployment

```bash
wait_for_condition() {
  local resource=$1
  local condition=$2
  local timeout=$3

  kubectl wait "$resource" --for="$condition" --timeout="$timeout"
}

echo "Test 1: Initial deployment"
wait_for_condition "kustomization/e2e-test -n flux-system" "condition=Ready" "120s"
wait_for_condition "deployment/test-app -n default" "condition=Available" "120s"

REPLICAS=$(kubectl get deployment test-app -n default -o jsonpath='{.spec.replicas}')
if [ "$REPLICAS" != "1" ]; then
  echo "FAIL: Expected 1 replica, got $REPLICAS"
  exit 1
fi
echo "PASS: Initial deployment successful"
```

### Test 2: Update Detection

```bash
echo "Test 2: Update detection"

# Push an update to the repository
cd /tmp/flux-e2e-repo
cat > apps/base/deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
EOF

git add -A && git commit -m "Scale to 3 replicas"
git push origin main

# Trigger reconciliation
flux reconcile source git e2e-test -n flux-system
flux reconcile kustomization e2e-test -n flux-system

# Wait and verify
sleep 15
REPLICAS=$(kubectl get deployment test-app -n default -o jsonpath='{.spec.replicas}')
if [ "$REPLICAS" != "3" ]; then
  echo "FAIL: Expected 3 replicas, got $REPLICAS"
  exit 1
fi
echo "PASS: Update detected and applied"
```

### Test 3: Resource Deletion (Pruning)

```bash
echo "Test 3: Resource pruning"

# Add a new resource
cat > apps/base/configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
  namespace: default
data:
  key: value
EOF

# Update kustomization to include it
cat > apps/base/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - configmap.yaml
EOF

git add -A && git commit -m "Add configmap"
git push origin main
flux reconcile source git e2e-test -n flux-system
flux reconcile kustomization e2e-test -n flux-system
sleep 15

# Verify configmap exists
kubectl get configmap test-config -n default || { echo "FAIL: ConfigMap not created"; exit 1; }

# Now remove it
rm apps/base/configmap.yaml
cat > apps/base/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
EOF

git add -A && git commit -m "Remove configmap"
git push origin main
flux reconcile source git e2e-test -n flux-system
flux reconcile kustomization e2e-test -n flux-system
sleep 15

# Verify configmap is pruned
if kubectl get configmap test-config -n default 2>/dev/null; then
  echo "FAIL: ConfigMap was not pruned"
  exit 1
fi
echo "PASS: Resource pruning works correctly"
```

## Complete E2E Test Script

Combine all tests into a single runnable script:

```bash
#!/bin/bash
set -euo pipefail

PASSED=0
FAILED=0

run_test() {
  local name=$1
  shift
  echo "--- Running: $name ---"
  if "$@"; then
    PASSED=$((PASSED + 1))
  else
    FAILED=$((FAILED + 1))
  fi
}

run_test "Initial Deployment" test_initial_deployment
run_test "Update Detection" test_update_detection
run_test "Resource Pruning" test_pruning

echo ""
echo "Results: $PASSED passed, $FAILED failed"
[ $FAILED -eq 0 ] || exit 1
```

## CI Pipeline Configuration

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create kind cluster
        uses: helm/kind-action@v1

      - name: Install Flux
        run: |
          curl -s https://fluxcd.io/install.sh | bash
          flux install

      - name: Run E2E tests
        run: ./tests/e2e/run-tests.sh
        timeout-minutes: 15

      - name: Collect logs on failure
        if: failure()
        run: |
          flux logs --all-namespaces
          kubectl get all --all-namespaces
```

## Conclusion

End-to-end testing for your Flux GitOps pipeline validates the complete workflow from Git commits to cluster state. While these tests take longer to run than unit or integration tests, they provide the highest level of confidence that your entire GitOps process works correctly. Running them in CI on every pull request ensures that changes to your Flux configurations are thoroughly validated before merging.
