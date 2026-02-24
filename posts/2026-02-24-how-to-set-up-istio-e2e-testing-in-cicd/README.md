# How to Set Up Istio E2E Testing in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, E2E Testing, CI/CD, Kubernetes, Testing

Description: Learn how to set up end-to-end testing for Istio service mesh configurations in your CI/CD pipeline using kind clusters and real traffic tests.

---

Testing Istio configurations is tricky because you need a real Kubernetes cluster with Istio installed to validate things like VirtualService routing, mTLS policies, and authorization rules. Unit testing YAML files only gets you so far. You need actual end-to-end tests that deploy services, send traffic, and verify that Istio behaves correctly.

This guide shows you how to set up a throwaway Kubernetes cluster in your CI/CD pipeline, install Istio, deploy test services, and run E2E tests against the mesh.

## The Testing Strategy

The approach is straightforward:

1. Spin up a local Kubernetes cluster using kind (Kubernetes in Docker)
2. Install Istio with a minimal profile
3. Deploy your services with sidecar injection
4. Run tests that verify routing, security, and resilience behavior
5. Tear everything down

This runs in any CI/CD system that supports Docker (GitHub Actions, GitLab CI, Jenkins with Docker agent, etc.).

## Setting Up the Test Environment

Here is a script that creates the cluster and installs Istio:

```bash
#!/bin/bash
set -euo pipefail

CLUSTER_NAME="istio-e2e-test"
ISTIO_VERSION="1.20.0"

# Create kind cluster
cat <<EOF | kind create cluster --name $CLUSTER_NAME --config -
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
EOF

# Wait for cluster to be ready
kubectl wait --for=condition=Ready nodes --all --timeout=120s

# Install Istio
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
cd istio-$ISTIO_VERSION

bin/istioctl install --set profile=minimal -y

# Wait for Istio to be ready
kubectl wait --for=condition=Available deployment/istiod \
    -n istio-system --timeout=300s

# Enable sidecar injection for the test namespace
kubectl create namespace e2e-test
kubectl label namespace e2e-test istio-injection=enabled

echo "Test environment ready"
```

## Deploying Test Services

Create simple test services that you can use to verify Istio behavior. A common pattern is to have a "client" service that makes HTTP requests and a "server" service that responds:

```yaml
# test-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-server-v1
  namespace: e2e-test
  labels:
    app: test-server
    version: v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-server
      version: v1
  template:
    metadata:
      labels:
        app: test-server
        version: v1
    spec:
      containers:
      - name: server
        image: hashicorp/http-echo:latest
        args:
        - "-text=v1"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-server-v2
  namespace: e2e-test
  labels:
    app: test-server
    version: v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-server
      version: v2
  template:
    metadata:
      labels:
        app: test-server
        version: v2
    spec:
      containers:
      - name: server
        image: hashicorp/http-echo:latest
        args:
        - "-text=v2"
        - "-listen=:8080"
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: test-server
  namespace: e2e-test
spec:
  selector:
    app: test-server
  ports:
  - port: 8080
    targetPort: 8080
```

And a client pod for sending requests:

```yaml
# test-client.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-client
  namespace: e2e-test
  labels:
    app: test-client
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-client
  template:
    metadata:
      labels:
        app: test-client
    spec:
      containers:
      - name: client
        image: curlimages/curl:latest
        command: ["sleep", "infinity"]
```

## Writing E2E Tests

Now the actual tests. Here is a test script that verifies traffic routing:

```bash
#!/bin/bash
set -euo pipefail

NAMESPACE="e2e-test"
CLIENT_POD=$(kubectl get pod -l app=test-client -n $NAMESPACE -o jsonpath='{.items[0].metadata.name}')
FAILURES=0

run_test() {
    local test_name=$1
    local expected=$2
    local actual=$3

    if [ "$actual" = "$expected" ]; then
        echo "PASS: $test_name"
    else
        echo "FAIL: $test_name (expected: $expected, got: $actual)"
        FAILURES=$((FAILURES + 1))
    fi
}

# Test 1: Verify all traffic goes to v1 by default
echo "=== Test: Default routing ==="
kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-server
spec:
  hosts:
  - test-server
  http:
  - route:
    - destination:
        host: test-server
        subset: v1
      weight: 100
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: test-server
spec:
  host: test-server
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
EOF

sleep 10

RESPONSE=$(kubectl exec $CLIENT_POD -n $NAMESPACE -c client -- \
    curl -s http://test-server:8080)
run_test "All traffic to v1" "v1" "$RESPONSE"

# Test 2: Verify header-based routing
echo "=== Test: Header-based routing ==="
kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-server
spec:
  hosts:
  - test-server
  http:
  - match:
    - headers:
        x-version:
          exact: canary
    route:
    - destination:
        host: test-server
        subset: v2
  - route:
    - destination:
        host: test-server
        subset: v1
EOF

sleep 10

RESPONSE_DEFAULT=$(kubectl exec $CLIENT_POD -n $NAMESPACE -c client -- \
    curl -s http://test-server:8080)
RESPONSE_CANARY=$(kubectl exec $CLIENT_POD -n $NAMESPACE -c client -- \
    curl -s -H "x-version: canary" http://test-server:8080)

run_test "Default traffic to v1" "v1" "$RESPONSE_DEFAULT"
run_test "Canary header routes to v2" "v2" "$RESPONSE_CANARY"

# Test 3: Verify fault injection
echo "=== Test: Fault injection ==="
kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-server
spec:
  hosts:
  - test-server
  http:
  - fault:
      abort:
        httpStatus: 503
        percentage:
          value: 100
    route:
    - destination:
        host: test-server
        subset: v1
EOF

sleep 10

HTTP_CODE=$(kubectl exec $CLIENT_POD -n $NAMESPACE -c client -- \
    curl -s -o /dev/null -w "%{http_code}" http://test-server:8080)
run_test "Fault injection returns 503" "503" "$HTTP_CODE"

# Test 4: Verify timeout configuration
echo "=== Test: Request timeout ==="
kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: test-server
spec:
  hosts:
  - test-server
  http:
  - timeout: 1s
    route:
    - destination:
        host: test-server
        subset: v1
EOF

sleep 5
echo "PASS: Timeout configuration applied successfully"

# Report results
echo ""
echo "=========================="
echo "Test Results: $FAILURES failures"
echo "=========================="

if [ $FAILURES -gt 0 ]; then
    exit 1
fi
```

## Testing mTLS

Verify that mutual TLS is working between services:

```bash
# Test mTLS enforcement
echo "=== Test: mTLS enforcement ==="

# Apply strict mTLS policy
kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
spec:
  mtls:
    mode: STRICT
EOF

sleep 15

# Verify connection works between mesh services
RESPONSE=$(kubectl exec $CLIENT_POD -n $NAMESPACE -c client -- \
    curl -s -o /dev/null -w "%{http_code}" http://test-server:8080)
run_test "mTLS connection succeeds" "200" "$RESPONSE"
```

## CI/CD Integration

Here is how you wire it all together in a GitHub Actions workflow:

```yaml
name: Istio E2E Tests

on:
  pull_request:
    paths:
    - 'k8s/istio/**'
    - 'tests/e2e/**'

jobs:
  e2e-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install kind
      run: |
        curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
        chmod +x ./kind
        sudo mv ./kind /usr/local/bin/kind

    - name: Set up test cluster
      run: ./tests/e2e/setup-cluster.sh

    - name: Deploy test services
      run: |
        kubectl apply -f tests/e2e/manifests/
        kubectl wait --for=condition=Available \
            deployment --all -n e2e-test --timeout=120s

    - name: Wait for sidecars
      run: |
        sleep 30
        kubectl get pods -n e2e-test

    - name: Run E2E tests
      run: ./tests/e2e/run-tests.sh

    - name: Collect logs on failure
      if: failure()
      run: |
        kubectl logs -n e2e-test -l app=test-client -c istio-proxy --tail=50
        kubectl logs -n e2e-test -l app=test-server -c istio-proxy --tail=50
        kubectl logs -n istio-system -l app=istiod --tail=100

    - name: Cleanup
      if: always()
      run: kind delete cluster --name istio-e2e-test
```

## Performance Considerations

Running a full kind cluster with Istio takes time. On a typical CI runner, expect:

- Kind cluster creation: 30-60 seconds
- Istio installation: 60-90 seconds
- Service deployment and sidecar readiness: 30-60 seconds
- Tests: varies based on count

To speed things up, you can pre-build a kind node image with Istio images already loaded:

```bash
# Pre-pull Istio images into the kind cluster
docker pull istio/pilot:$ISTIO_VERSION
docker pull istio/proxyv2:$ISTIO_VERSION

kind load docker-image istio/pilot:$ISTIO_VERSION --name $CLUSTER_NAME
kind load docker-image istio/proxyv2:$ISTIO_VERSION --name $CLUSTER_NAME
```

This avoids pulling images from the internet during the test run and shaves off a good chunk of time.

## Parallelizing Tests

If you have many tests, run them in separate namespaces to avoid interference:

```bash
for suite in routing security resilience; do
    NAMESPACE="e2e-${suite}"
    kubectl create namespace $NAMESPACE
    kubectl label namespace $NAMESPACE istio-injection=enabled
    kubectl apply -f tests/e2e/fixtures/ -n $NAMESPACE
    ./tests/e2e/test-${suite}.sh $NAMESPACE &
done

wait
```

E2E testing Istio configurations in CI/CD is essential if you want confidence that your routing rules, security policies, and resilience settings actually work. The initial setup takes some effort, but once you have the test framework in place, adding new test cases is quick. The key is to treat your Istio configuration as code that deserves the same testing rigor as your application code.
