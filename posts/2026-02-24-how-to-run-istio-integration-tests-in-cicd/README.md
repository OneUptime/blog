# How to Run Istio Integration Tests in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Integration Testing, CI/CD, Kubernetes, Service Mesh

Description: How to run integration tests that validate Istio routing, mTLS, authorization policies, and traffic management in CI/CD pipelines using kind or k3d clusters.

---

Unit tests tell you your code works. Integration tests with Istio tell you your code works inside the mesh. When your application depends on Istio for routing, security, and traffic management, you need tests that verify those behaviors. Running these tests in CI catches issues before they reach staging or production.

This post shows you how to set up ephemeral Kubernetes clusters with Istio in CI and write tests that validate mesh behavior.

## Setting Up the Test Environment

The fastest way to run Istio integration tests in CI is with kind (Kubernetes in Docker). It creates a full Kubernetes cluster inside Docker containers:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30000
        hostPort: 30000
        protocol: TCP
  - role: worker
  - role: worker
```

The CI setup:

```yaml
name: Istio Integration Tests
on: [pull_request]

jobs:
  integration:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - name: Install kind
        run: |
          curl -Lo kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
          chmod +x kind
          mv kind /usr/local/bin/

      - name: Create cluster
        run: kind create cluster --config kind-config.yaml --name istio-test

      - name: Install Istio
        run: |
          ISTIO_VERSION=1.22.0
          curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
          export PATH=$PWD/istio-$ISTIO_VERSION/bin:$PATH
          istioctl install --set profile=minimal -y
          kubectl label namespace default istio-injection=enabled

      - name: Wait for Istio
        run: |
          kubectl wait --for=condition=available deployment/istiod -n istio-system --timeout=120s
```

## Deploying Test Services

Create lightweight test services that you can use to validate mesh behavior:

```yaml
# test-services.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
        - name: httpbin
          image: kennethreitz/httpbin
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
spec:
  selector:
    app: httpbin
  ports:
    - name: http
      port: 8000
      targetPort: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sleep
  labels:
    app: sleep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sleep
  template:
    metadata:
      labels:
        app: sleep
    spec:
      containers:
        - name: sleep
          image: curlimages/curl
          command: ["/bin/sleep", "infinity"]
---
apiVersion: v1
kind: Service
metadata:
  name: sleep
spec:
  selector:
    app: sleep
  ports:
    - name: http
      port: 80
```

Deploy and wait:

```yaml
- name: Deploy test services
  run: |
    kubectl apply -f test-services.yaml
    kubectl rollout status deployment/httpbin --timeout=120s
    kubectl rollout status deployment/sleep --timeout=120s
    # Wait for sidecars to be ready
    sleep 10
```

## Test: Traffic Routing

Verify that VirtualService routing works correctly:

```yaml
- name: Test traffic routing
  run: |
    # Apply VirtualService
    cat <<EOF | kubectl apply -f -
    apiVersion: networking.istio.io/v1
    kind: VirtualService
    metadata:
      name: httpbin
    spec:
      hosts:
        - httpbin
      http:
        - match:
            - headers:
                x-test:
                  exact: "route-to-v2"
          fault:
            abort:
              httpStatus: 418
              percentage:
                value: 100
        - route:
            - destination:
                host: httpbin
                port:
                  number: 8000
    EOF

    sleep 5

    # Test normal route
    SLEEP_POD=$(kubectl get pod -l app=sleep -o jsonpath='{.items[0].metadata.name}')

    STATUS=$(kubectl exec "$SLEEP_POD" -c sleep -- \
      curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/get)

    if [ "$STATUS" != "200" ]; then
      echo "FAIL: Expected 200, got $STATUS"
      exit 1
    fi
    echo "PASS: Normal route returns 200"

    # Test header-based route (should return 418 due to fault injection)
    STATUS=$(kubectl exec "$SLEEP_POD" -c sleep -- \
      curl -s -o /dev/null -w "%{http_code}" -H "x-test: route-to-v2" http://httpbin:8000/get)

    if [ "$STATUS" != "418" ]; then
      echo "FAIL: Expected 418, got $STATUS"
      exit 1
    fi
    echo "PASS: Header-based route returns 418 (fault injection)"
```

## Test: mTLS Enforcement

Verify that mTLS is enforced between services:

```yaml
- name: Test mTLS
  run: |
    # Apply strict mTLS
    cat <<EOF | kubectl apply -f -
    apiVersion: security.istio.io/v1
    kind: PeerAuthentication
    metadata:
      name: strict-mtls
      namespace: default
    spec:
      mtls:
        mode: STRICT
    EOF

    sleep 10

    SLEEP_POD=$(kubectl get pod -l app=sleep -o jsonpath='{.items[0].metadata.name}')

    # Verify connection works with sidecar (mTLS is automatic)
    STATUS=$(kubectl exec "$SLEEP_POD" -c sleep -- \
      curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/get)

    if [ "$STATUS" != "200" ]; then
      echo "FAIL: mTLS connection failed"
      exit 1
    fi
    echo "PASS: mTLS connection successful"

    # Verify mTLS is active
    istioctl x describe pod "$SLEEP_POD" | grep -q "STRICT"
    if [ $? -eq 0 ]; then
      echo "PASS: STRICT mTLS is active"
    fi
```

## Test: Authorization Policy

Verify that authorization policies correctly allow and deny traffic:

```yaml
- name: Test authorization policy
  run: |
    # Create a namespace without injection for testing denied access
    kubectl create namespace no-mesh

    kubectl apply -n no-mesh -f - <<EOF
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: sleep-no-mesh
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: sleep-no-mesh
      template:
        metadata:
          labels:
            app: sleep-no-mesh
        spec:
          containers:
            - name: sleep
              image: curlimages/curl
              command: ["/bin/sleep", "infinity"]
    EOF

    kubectl rollout status deployment/sleep-no-mesh -n no-mesh --timeout=60s

    # Apply AuthorizationPolicy
    cat <<EOF | kubectl apply -f -
    apiVersion: security.istio.io/v1
    kind: AuthorizationPolicy
    metadata:
      name: httpbin-allow
      namespace: default
    spec:
      selector:
        matchLabels:
          app: httpbin
      action: ALLOW
      rules:
        - from:
            - source:
                principals:
                  - cluster.local/ns/default/sa/default
    EOF

    sleep 10

    # Test allowed access (from default namespace with sidecar)
    SLEEP_POD=$(kubectl get pod -l app=sleep -o jsonpath='{.items[0].metadata.name}')
    STATUS=$(kubectl exec "$SLEEP_POD" -c sleep -- \
      curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://httpbin:8000/get)

    if [ "$STATUS" != "200" ]; then
      echo "FAIL: Authorized request should return 200, got $STATUS"
      exit 1
    fi
    echo "PASS: Authorized request allowed"
```

## Test: Timeout Configuration

```yaml
- name: Test timeout
  run: |
    cat <<EOF | kubectl apply -f -
    apiVersion: networking.istio.io/v1
    kind: VirtualService
    metadata:
      name: httpbin-timeout
    spec:
      hosts:
        - httpbin
      http:
        - route:
            - destination:
                host: httpbin
                port:
                  number: 8000
          timeout: 2s
    EOF

    sleep 5

    SLEEP_POD=$(kubectl get pod -l app=sleep -o jsonpath='{.items[0].metadata.name}')

    # Request that takes 5 seconds should be timed out by Istio at 2 seconds
    STATUS=$(kubectl exec "$SLEEP_POD" -c sleep -- \
      curl -s -o /dev/null -w "%{http_code}" "http://httpbin:8000/delay/5")

    if [ "$STATUS" != "504" ]; then
      echo "FAIL: Expected 504 (timeout), got $STATUS"
      exit 1
    fi
    echo "PASS: Timeout correctly applied"
```

## Running Tests with a Test Framework

For more structured testing, use a test framework. Here is an example with Bats (Bash Automated Testing System):

```bash
# tests/istio-routing.bats

setup() {
  SLEEP_POD=$(kubectl get pod -l app=sleep -o jsonpath='{.items[0].metadata.name}')
}

@test "normal requests return 200" {
  result=$(kubectl exec "$SLEEP_POD" -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/get)
  [ "$result" = "200" ]
}

@test "fault injection returns configured status" {
  kubectl apply -f test-fixtures/fault-injection-vs.yaml
  sleep 5
  result=$(kubectl exec "$SLEEP_POD" -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" -H "x-fault: true" http://httpbin:8000/get)
  [ "$result" = "503" ]
}

@test "retry policy handles transient failures" {
  kubectl apply -f test-fixtures/retry-vs.yaml
  sleep 5
  result=$(kubectl exec "$SLEEP_POD" -c sleep -- \
    curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/503)
  # With retries, we should eventually get the response
  [ "$result" = "503" ]
}
```

Run in CI:

```yaml
- name: Install bats
  run: |
    git clone https://github.com/bats-core/bats-core.git
    cd bats-core && sudo ./install.sh /usr/local

- name: Run Istio integration tests
  run: bats tests/istio-*.bats
```

## Cleanup

Always clean up the test cluster, even if tests fail:

```yaml
- name: Cleanup
  if: always()
  run: |
    kind delete cluster --name istio-test
```

## Speeding Up Tests

Istio installation takes a few minutes, which adds up in CI. Some optimization strategies:

1. Pre-build a kind node image with Istio pre-loaded
2. Use the `minimal` Istio profile (no gateways)
3. Run tests in parallel across multiple jobs
4. Cache the Istio download between runs

```yaml
- name: Cache Istio
  uses: actions/cache@v3
  with:
    path: istio-1.22.0
    key: istio-1.22.0-${{ runner.os }}
```

Integration tests with Istio in CI give you confidence that your mesh configuration works as expected. Start with basic routing and mTLS tests, then add tests for every Istio feature you depend on. The ephemeral cluster approach means tests are always clean and reproducible.
