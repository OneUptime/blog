# How to Run Integration Tests Against Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Integration Testing, Kubernetes, Test Automation, Quality Assurance

Description: Learn practical approaches for running integration tests against Talos Linux Kubernetes clusters, including test frameworks, patterns, and strategies for reliable results.

---

Unit tests tell you if a function works. Integration tests tell you if your application works in a real environment. When your application runs on Kubernetes, that means testing against a real cluster with real networking, real storage, and real scheduling. Talos Linux makes this practical by providing clean, reproducible clusters that you can create and destroy for each test run.

This guide covers the practical side of running integration tests against Talos Linux clusters, including test setup, frameworks, patterns, and strategies for handling the inherent challenges of testing distributed systems.

## Setting Up the Test Infrastructure

Before writing tests, establish a reliable way to create and manage test clusters:

```bash
#!/bin/bash
# test-infrastructure.sh
set -euo pipefail

export CLUSTER_NAME="test-$(date +%s)"
export KUBECONFIG="/tmp/${CLUSTER_NAME}.kubeconfig"

setup() {
  echo "Setting up test cluster: ${CLUSTER_NAME}"

  talosctl cluster create \
    --provisioner docker \
    --name "$CLUSTER_NAME" \
    --controlplanes 1 \
    --workers 2 \
    --wait-timeout 5m

  talosctl kubeconfig --force "$KUBECONFIG" --merge=false

  # Wait for all nodes
  kubectl wait --for=condition=Ready nodes --all --timeout=300s

  # Deploy the application under test
  kubectl apply -f manifests/
  kubectl rollout status deployment/myapp --timeout=120s
}

teardown() {
  echo "Tearing down test cluster: ${CLUSTER_NAME}"
  talosctl cluster destroy --name "$CLUSTER_NAME" || true
  rm -f "$KUBECONFIG"
}

trap teardown EXIT
setup
```

## Test Framework Integration

### Go Tests

Go's testing package works naturally with Kubernetes client-go:

```go
// integration_test.go
package integration

import (
    "context"
    "testing"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
)

var clientset *kubernetes.Clientset

func TestMain(m *testing.M) {
    // Load kubeconfig from environment
    kubeconfig := os.Getenv("KUBECONFIG")
    config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
    if err != nil {
        log.Fatalf("Failed to load kubeconfig: %v", err)
    }

    clientset, err = kubernetes.NewForConfig(config)
    if err != nil {
        log.Fatalf("Failed to create client: %v", err)
    }

    os.Exit(m.Run())
}

func TestDeploymentIsRunning(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    deploy, err := clientset.AppsV1().Deployments("default").Get(
        ctx, "myapp", metav1.GetOptions{},
    )
    if err != nil {
        t.Fatalf("Failed to get deployment: %v", err)
    }

    if deploy.Status.ReadyReplicas != *deploy.Spec.Replicas {
        t.Errorf("Expected %d ready replicas, got %d",
            *deploy.Spec.Replicas, deploy.Status.ReadyReplicas)
    }
}

func TestServiceIsReachable(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    svc, err := clientset.CoreV1().Services("default").Get(
        ctx, "myapp", metav1.GetOptions{},
    )
    if err != nil {
        t.Fatalf("Failed to get service: %v", err)
    }

    if svc.Spec.ClusterIP == "" {
        t.Error("Service has no ClusterIP")
    }
}

func TestPodResourceLimits(t *testing.T) {
    ctx := context.Background()

    pods, err := clientset.CoreV1().Pods("default").List(ctx, metav1.ListOptions{
        LabelSelector: "app=myapp",
    })
    if err != nil {
        t.Fatalf("Failed to list pods: %v", err)
    }

    for _, pod := range pods.Items {
        for _, container := range pod.Spec.Containers {
            if container.Resources.Limits.Cpu().IsZero() {
                t.Errorf("Pod %s container %s has no CPU limit",
                    pod.Name, container.Name)
            }
            if container.Resources.Limits.Memory().IsZero() {
                t.Errorf("Pod %s container %s has no memory limit",
                    pod.Name, container.Name)
            }
        }
    }
}
```

Run the tests:

```bash
# After setting up the cluster and deploying the app
go test ./integration/... -v -timeout 10m
```

### Python Tests with pytest

```python
# test_integration.py
import pytest
import os
from kubernetes import client, config

@pytest.fixture(scope="session")
def k8s_client():
    """Create a Kubernetes client from KUBECONFIG."""
    kubeconfig = os.environ.get("KUBECONFIG", "~/.kube/config")
    config.load_kube_config(config_file=kubeconfig)
    return client.CoreV1Api()

@pytest.fixture(scope="session")
def apps_client():
    kubeconfig = os.environ.get("KUBECONFIG", "~/.kube/config")
    config.load_kube_config(config_file=kubeconfig)
    return client.AppsV1Api()

def test_all_nodes_ready(k8s_client):
    """Verify all cluster nodes are in Ready state."""
    nodes = k8s_client.list_node()
    for node in nodes.items:
        conditions = {c.type: c.status for c in node.status.conditions}
        assert conditions.get("Ready") == "True", \
            f"Node {node.metadata.name} is not Ready"

def test_deployment_healthy(apps_client):
    """Verify the application deployment is healthy."""
    deploy = apps_client.read_namespaced_deployment("myapp", "default")
    assert deploy.status.ready_replicas == deploy.spec.replicas, \
        f"Expected {deploy.spec.replicas} replicas, got {deploy.status.ready_replicas}"

def test_pod_logs_no_errors(k8s_client):
    """Check that application pods have no error logs."""
    pods = k8s_client.list_namespaced_pod(
        "default", label_selector="app=myapp"
    )
    for pod in pods.items:
        logs = k8s_client.read_namespaced_pod_log(
            pod.metadata.name, "default", tail_lines=100
        )
        assert "ERROR" not in logs, \
            f"Pod {pod.metadata.name} has errors in logs"

def test_service_endpoints(k8s_client):
    """Verify service has active endpoints."""
    endpoints = k8s_client.read_namespaced_endpoints("myapp", "default")
    assert endpoints.subsets is not None, "Service has no endpoints"
    total_addresses = sum(
        len(subset.addresses or []) for subset in endpoints.subsets
    )
    assert total_addresses > 0, "Service has no ready addresses"
```

```bash
# Run Python integration tests
pip install kubernetes pytest
pytest test_integration.py -v
```

## Test Patterns for Kubernetes

### Health Check Tests

Verify that your application responds correctly:

```bash
# Create a test pod that checks the service
kubectl run health-check \
  --image=busybox \
  --rm -it \
  --restart=Never \
  -- wget -qO- --timeout=10 http://myapp-service/health

# Check the response
echo $?  # 0 means success
```

### Network Policy Tests

Verify that network policies are enforced:

```go
func TestNetworkPolicyBlocking(t *testing.T) {
    // Deploy a pod that should be blocked
    blockedPod := createPod("blocked-client", "default", map[string]string{
        "role": "blocked",
    })
    defer deletePod(blockedPod)

    // Try to connect - should fail
    output, err := execInPod(blockedPod, "wget", "-qO-", "--timeout=5",
        "http://myapp-service/health")

    if err == nil {
        t.Error("Expected network policy to block connection, but it succeeded")
    }
}
```

### Rolling Update Tests

Verify that updates happen without downtime:

```bash
#!/bin/bash
# test-rolling-update.sh

# Start a continuous health check in the background
while true; do
  response=$(kubectl exec health-checker -- wget -qO- --timeout=2 http://myapp-service/health 2>&1)
  if [ $? -ne 0 ]; then
    echo "$(date): FAILURE - $response"
    FAILURES=$((FAILURES + 1))
  fi
  sleep 0.5
done &
HEALTH_PID=$!

# Trigger the update
kubectl set image deployment/myapp myapp=myapp:v2
kubectl rollout status deployment/myapp --timeout=120s

# Stop health checks
kill $HEALTH_PID

# Report
if [ "${FAILURES:-0}" -gt 0 ]; then
  echo "Rolling update had $FAILURES failures"
  exit 1
fi
echo "Rolling update completed with zero downtime"
```

### Resource Limit Tests

Verify that pods respect their resource limits:

```go
func TestPodOOMBehavior(t *testing.T) {
    // Deploy a pod with a memory limit
    pod := deployMemoryHog("test-oom", "64Mi")
    defer deletePod(pod)

    // Wait for OOM kill
    time.Sleep(30 * time.Second)

    // Check pod status
    p, _ := clientset.CoreV1().Pods("default").Get(
        context.Background(), "test-oom", metav1.GetOptions{},
    )

    for _, status := range p.Status.ContainerStatuses {
        if status.LastTerminationReason == "OOMKilled" {
            // Expected behavior
            return
        }
    }
    t.Error("Pod was not OOM killed as expected")
}
```

## Collecting Test Artifacts

When tests fail, collect diagnostic information:

```bash
#!/bin/bash
# collect-artifacts.sh

ARTIFACT_DIR="${1:-/tmp/test-artifacts}"
mkdir -p "$ARTIFACT_DIR"

# Collect cluster state
kubectl get all --all-namespaces > "$ARTIFACT_DIR/all-resources.txt"
kubectl get events --sort-by='.lastTimestamp' --all-namespaces > "$ARTIFACT_DIR/events.txt"
kubectl describe nodes > "$ARTIFACT_DIR/node-details.txt"

# Collect pod logs
for pod in $(kubectl get pods -o name --all-namespaces); do
  ns=$(echo "$pod" | cut -d/ -f1)
  name=$(echo "$pod" | cut -d/ -f2)
  kubectl logs "$name" -n "$ns" --all-containers > "$ARTIFACT_DIR/${ns}-${name}.log" 2>&1 || true
done

# Collect Talos diagnostics
talosctl -n 10.5.0.2 dmesg > "$ARTIFACT_DIR/talos-dmesg.txt" 2>&1 || true
talosctl -n 10.5.0.2 health > "$ARTIFACT_DIR/talos-health.txt" 2>&1 || true

echo "Artifacts collected in: $ARTIFACT_DIR"
```

## Handling Test Flakiness

Integration tests against Kubernetes clusters can be flaky due to timing issues. Here are strategies to reduce flakiness:

```go
// Use retry logic for assertions that depend on eventual consistency
func waitForCondition(t *testing.T, check func() bool, timeout time.Duration, msg string) {
    t.Helper()
    deadline := time.Now().Add(timeout)
    for time.Now().Before(deadline) {
        if check() {
            return
        }
        time.Sleep(time.Second)
    }
    t.Fatalf("Timed out waiting for: %s", msg)
}

func TestEventuallyHealthy(t *testing.T) {
    waitForCondition(t, func() bool {
        resp, err := httpGet("http://myapp-service/health")
        return err == nil && resp.StatusCode == 200
    }, 60*time.Second, "service to become healthy")
}
```

## Wrapping Up

Integration testing against Talos Linux clusters gives you confidence that your application works correctly in a real Kubernetes environment. The combination of clean cluster state, fast provisioning, and deterministic configuration means your tests produce consistent results. Whether you use Go, Python, or shell scripts, the patterns remain the same: create a cluster, deploy your application, run your assertions, collect artifacts on failure, and tear everything down. The investment in building a solid integration test suite pays off every time it catches a bug that unit tests missed.
