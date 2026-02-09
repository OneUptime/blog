# How to Build Integration Tests That Spin Up Kind Clusters in CI for Kubernetes Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kind, Integration Testing, CI/CD, Controllers

Description: Learn how to create integration tests that automatically provision Kind clusters in CI pipelines for testing Kubernetes controllers against real API servers.

---

Integration testing Kubernetes controllers requires real API server behavior that mocks cannot provide. Kind (Kubernetes in Docker) enables CI pipelines to create disposable clusters for each test run, providing authentic Kubernetes environments for controller integration tests.

In this guide, we'll build integration test suites that provision Kind clusters automatically, test controllers against real Kubernetes APIs, and clean up resources after tests complete. This approach catches integration bugs before code reaches production.

## Understanding Kind for CI Integration

Kind runs Kubernetes clusters in Docker containers, making cluster creation fast enough for CI workflows. Each test run gets a fresh cluster, eliminating state pollution between tests. Clusters start in seconds and require minimal resources, enabling parallel test execution.

The Kind CLI provides programmatic cluster management through configuration files. Tests can create clusters with custom configurations, install controllers, deploy test workloads, and verify behavior before destroying the cluster. This workflow ensures tests run in clean, reproducible environments.

Integration tests using Kind catch issues that unit tests miss including API server interactions, webhook registration, RBAC configuration, and admission controller behavior. These tests validate that controllers work correctly in real Kubernetes environments.

## Installing Kind Locally

Install Kind for local development:

```bash
# Install on Linux
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Install on macOS
brew install kind

# Verify installation
kind version
```

## Creating Basic Integration Test Script

Build a shell script that manages Kind clusters for tests:

```bash
#!/bin/bash
# test-integration.sh

set -e

CLUSTER_NAME="controller-test-$$"
TEST_NAMESPACE="test-system"

cleanup() {
  echo "Cleaning up..."
  kind delete cluster --name "$CLUSTER_NAME" || true
}

trap cleanup EXIT

echo "Creating Kind cluster..."
kind create cluster --name "$CLUSTER_NAME" --wait 5m

echo "Installing controller..."
kubectl apply -f config/crd/
kubectl apply -f config/rbac/
kubectl apply -f config/deployment/

echo "Waiting for controller to be ready..."
kubectl wait --for=condition=available --timeout=60s \
  deployment/controller-manager -n "$TEST_NAMESPACE"

echo "Running integration tests..."
go test ./test/integration/... -v

echo "Tests passed!"
```

Make it executable:

```bash
chmod +x test-integration.sh
./test-integration.sh
```

## Creating Go-Based Integration Tests

Write integration tests in Go that manage Kind clusters:

```go
// integration_test.go
package integration

import (
    "context"
    "testing"
    "time"

    "sigs.k8s.io/kind/pkg/cluster"
    "sigs.k8s.io/kind/pkg/cmd"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

func TestControllerIntegration(t *testing.T) {
    ctx := context.Background()

    // Create Kind provider
    provider := cluster.NewProvider()

    // Create cluster
    clusterName := "test-cluster"
    if err := provider.Create(
        clusterName,
        cluster.CreateWithWaitForReady(5*time.Minute),
    ); err != nil {
        t.Fatalf("Failed to create cluster: %v", err)
    }

    // Cleanup cluster after test
    defer func() {
        if err := provider.Delete(clusterName, ""); err != nil {
            t.Logf("Failed to delete cluster: %v", err)
        }
    }()

    // Get kubeconfig
    kubeconfig, err := provider.KubeConfig(clusterName, false)
    if err != nil {
        t.Fatalf("Failed to get kubeconfig: %v", err)
    }

    // Create Kubernetes client
    config, err := clientcmd.RESTConfigFromKubeConfig([]byte(kubeconfig))
    if err != nil {
        t.Fatalf("Failed to create config: %v", err)
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        t.Fatalf("Failed to create client: %v", err)
    }

    // Run test scenarios
    t.Run("DeployController", func(t *testing.T) {
        // Deploy controller to Kind cluster
        // kubectl.Apply(controllerManifests)

        // Verify controller is running
        pods, err := clientset.CoreV1().Pods("kube-system").List(ctx, metav1.ListOptions{
            LabelSelector: "app=controller",
        })
        if err != nil {
            t.Fatalf("Failed to list pods: %v", err)
        }

        if len(pods.Items) == 0 {
            t.Fatal("Controller pod not found")
        }
    })

    t.Run("TestControllerBehavior", func(t *testing.T) {
        // Create custom resources
        // Verify controller reconciliation
        // Check expected behavior
    })
}
```

## Configuring Kind Clusters for Testing

Create Kind configuration for test clusters:

```yaml
# kind-test-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    # Mount local directory for testing
    extraMounts:
      - hostPath: ./testdata
        containerPath: /testdata
    # Configure API server for testing
    kubeadmConfigPatches:
      - |
        kind: ClusterConfiguration
        apiServer:
          extraArgs:
            enable-admission-plugins: NodeRestriction,MutatingAdmissionWebhook,ValidatingAdmissionWebhook
  - role: worker
  - role: worker

# Configure networking for webhook testing
networking:
  apiServerAddress: "0.0.0.0"
  apiServerPort: 6443
```

Use configuration in tests:

```bash
#!/bin/bash
# test-with-config.sh

kind create cluster \
  --name test-cluster \
  --config kind-test-config.yaml \
  --wait 5m
```

## Testing Webhooks in Kind

Webhooks require TLS certificates. Generate certificates for testing:

```bash
#!/bin/bash
# setup-webhook-certs.sh

# Generate CA
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -days 100 -out ca.crt -subj "/CN=admission-webhook-ca"

# Generate webhook cert
openssl genrsa -out webhook.key 2048
openssl req -new -key webhook.key -out webhook.csr -subj "/CN=webhook.default.svc"

# Sign webhook cert
openssl x509 -req -in webhook.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out webhook.crt -days 100

# Create Kubernetes secret
kubectl create secret tls webhook-certs \
  --cert=webhook.crt \
  --key=webhook.key \
  --namespace=default
```

Deploy webhook in Kind cluster:

```yaml
# webhook-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admission-webhook
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webhook
  template:
    metadata:
      labels:
        app: webhook
    spec:
      containers:
      - name: webhook
        image: localhost/webhook:test
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
      volumes:
      - name: certs
        secret:
          secretName: webhook-certs
```

Load local image into Kind:

```bash
# Build webhook image
docker build -t webhook:test .

# Load into Kind cluster
kind load docker-image webhook:test --name test-cluster

# Deploy webhook
kubectl apply -f webhook-deployment.yaml
```

## Parallel Test Execution

Run multiple test suites in parallel with isolated clusters:

```go
// parallel_test.go
package integration

import (
    "fmt"
    "testing"

    "sigs.k8s.io/kind/pkg/cluster"
)

func TestParallel(t *testing.T) {
    tests := []struct {
        name     string
        testFunc func(*testing.T, string)
    }{
        {"TestScenario1", testScenario1},
        {"TestScenario2", testScenario2},
        {"TestScenario3", testScenario3},
    }

    for _, tt := range tests {
        tt := tt // Capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()

            // Create unique cluster for this test
            clusterName := fmt.Sprintf("test-%s-%d", tt.name, time.Now().Unix())
            provider := cluster.NewProvider()

            if err := provider.Create(clusterName); err != nil {
                t.Fatalf("Failed to create cluster: %v", err)
            }
            defer provider.Delete(clusterName, "")

            // Run test with isolated cluster
            tt.testFunc(t, clusterName)
        })
    }
}

func testScenario1(t *testing.T, clusterName string) {
    // Test implementation
}

func testScenario2(t *testing.T, clusterName string) {
    // Test implementation
}

func testScenario3(t *testing.T, clusterName string) {
    // Test implementation
}
```

## GitHub Actions Integration

Create workflow that uses Kind:

```yaml
# .github/workflows/integration-test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Setup Go
      uses: actions/setup-go@v2
      with:
        go-version: 1.21

    - name: Create Kind cluster
      uses: helm/kind-action@v1.8.0
      with:
        cluster_name: test-cluster
        config: kind-test-config.yaml

    - name: Install controller
      run: |
        kubectl apply -f config/crd/
        kubectl apply -f config/deployment/

    - name: Wait for controller
      run: |
        kubectl wait --for=condition=available --timeout=120s \
          deployment/controller-manager -n system

    - name: Run integration tests
      run: |
        go test ./test/integration/... -v -timeout 15m

    - name: Collect logs on failure
      if: failure()
      run: |
        kubectl logs -n system -l app=controller --tail=100
        kubectl get pods -A
```

## GitLab CI Integration

Configure GitLab runner with Kind:

```yaml
# .gitlab-ci.yml
integration-test:
  stage: test
  image: golang:1.21
  services:
    - docker:dind
  before_script:
    # Install Kind
    - curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
    - chmod +x ./kind
    - mv ./kind /usr/local/bin/kind

    # Install kubectl
    - curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    - chmod +x kubectl
    - mv kubectl /usr/local/bin/

  script:
    - kind create cluster --wait 5m
    - export KUBECONFIG="$(kind get kubeconfig --name kind)"
    - kubectl apply -f config/
    - go test ./test/integration/... -v

  after_script:
    - kind delete cluster
```

## Testing Operators with Kind

Test operator behavior:

```bash
#!/bin/bash
# test-operator.sh

set -e

echo "Creating Kind cluster..."
kind create cluster --name operator-test

echo "Installing operator..."
kubectl apply -f operator-crd.yaml
kubectl apply -f operator-deployment.yaml

echo "Waiting for operator..."
kubectl wait --for=condition=available deployment/operator --timeout=60s

echo "Creating custom resource..."
kubectl apply -f testdata/sample-cr.yaml

echo "Waiting for resource to be ready..."
timeout 60s bash -c 'until kubectl get deployment sample-app 2>/dev/null; do sleep 2; done'

echo "Verifying operator created deployment..."
if ! kubectl get deployment sample-app; then
  echo "Operator did not create expected deployment"
  exit 1
fi

echo "Test passed!"
kind delete cluster --name operator-test
```

## Debugging Failed Tests

Collect debugging information when tests fail:

```bash
#!/bin/bash
# debug-failed-test.sh

# Export cluster state
kubectl cluster-info dump > cluster-dump.txt

# Get all pod logs
for pod in $(kubectl get pods -A -o name); do
  echo "=== Logs for $pod ===" >> pod-logs.txt
  kubectl logs $pod -A --all-containers >> pod-logs.txt 2>&1
done

# Export events
kubectl get events -A --sort-by=.metadata.creationTimestamp > events.txt

# Export cluster configuration
kubectl get all -A -o yaml > cluster-state.yaml
```

## Conclusion

Integration testing with Kind in CI pipelines provides authentic Kubernetes environments for controller testing without the overhead of persistent clusters. Disposable clusters created for each test run ensure clean state while real API servers catch integration issues that mocks miss.

This testing approach builds confidence in controller behavior before production deployment, catches RBAC and webhook configuration errors early, and validates that controllers handle real Kubernetes API semantics correctly.

For robust controller development, combine Kind integration tests with unit tests and envtest, run integration tests on every pull request, and collect comprehensive debugging information when tests fail to speed up issue resolution.
