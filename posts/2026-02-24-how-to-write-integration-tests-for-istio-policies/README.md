# How to Write Integration Tests for Istio Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Testing, Integration Tests, Kubernetes, Service Mesh

Description: Learn how to write integration tests that verify your Istio policies work correctly, covering authorization, routing, and traffic management rules.

---

Writing unit tests for application code is second nature for most developers. But when it comes to Istio policies, testing often gets skipped entirely. People apply their AuthorizationPolicies and VirtualServices, eyeball the traffic in Kiali, and call it good. That works until a policy change quietly breaks something and nobody notices for hours.

Integration tests for Istio policies give you confidence that your routing rules, security policies, and traffic management actually behave the way you expect. Here is how to build a solid integration test suite.

## The Testing Approach

The basic idea is simple. Deploy test workloads into a namespace with Istio injection enabled, apply your policies, then send requests and verify the outcomes. You want to check things like:

- Does this AuthorizationPolicy actually block unauthorized traffic?
- Does this VirtualService route to the correct subset?
- Does this rate limit kick in at the right threshold?

## Setting Up Test Workloads

You need at least two workloads: one to send requests from and one to receive them. The Istio `sleep` and `httpbin` samples work perfectly for this.

```bash
kubectl create namespace istio-test
kubectl label namespace istio-test istio-injection=enabled

kubectl apply -n istio-test -f samples/sleep/sleep.yaml
kubectl apply -n istio-test -f samples/httpbin/httpbin.yaml
```

Wait for the pods to be ready with sidecars injected:

```bash
kubectl wait --for=condition=ready pod -l app=sleep -n istio-test --timeout=120s
kubectl wait --for=condition=ready pod -l app=httpbin -n istio-test --timeout=120s
```

## Testing Authorization Policies

Suppose you have an AuthorizationPolicy that only allows requests from the `sleep` service account to reach `httpbin`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: httpbin-policy
  namespace: istio-test
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/istio-test/sa/sleep"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/status/*"]
```

Write a test script that verifies both the allowed and denied cases:

```bash
#!/bin/bash
set -e

NAMESPACE="istio-test"

echo "Test 1: sleep should be able to GET /status/200"
RESPONSE=$(kubectl exec -n $NAMESPACE deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/status/200)
if [ "$RESPONSE" = "200" ]; then
  echo "PASS: Got 200"
else
  echo "FAIL: Expected 200, got $RESPONSE"
  exit 1
fi

echo "Test 2: sleep should be blocked from POST /status/200"
RESPONSE=$(kubectl exec -n $NAMESPACE deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" -X POST http://httpbin:8000/status/200)
if [ "$RESPONSE" = "403" ]; then
  echo "PASS: Got 403 (RBAC denied)"
else
  echo "FAIL: Expected 403, got $RESPONSE"
  exit 1
fi

echo "Test 3: sleep should be blocked from GET /headers"
RESPONSE=$(kubectl exec -n $NAMESPACE deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://httpbin:8000/headers)
if [ "$RESPONSE" = "403" ]; then
  echo "PASS: Got 403 (RBAC denied)"
else
  echo "FAIL: Expected 403, got $RESPONSE"
  exit 1
fi

echo "All authorization policy tests passed"
```

## Writing Tests in Go

For more robust testing, write your integration tests in Go using the standard `testing` package along with `client-go` for Kubernetes interactions:

```go
package istio_test

import (
    "context"
    "fmt"
    "strings"
    "testing"
    "time"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/tools/clientcmd"
    "k8s.io/client-go/kubernetes/scheme"
    "k8s.io/client-go/tools/remotecommand"
)

func execInPod(clientset *kubernetes.Clientset, config *rest.Config,
    namespace, pod, container string, command []string) (string, error) {

    req := clientset.CoreV1().RESTClient().Post().
        Resource("pods").
        Name(pod).
        Namespace(namespace).
        SubResource("exec").
        VersionedParams(&corev1.PodExecOptions{
            Container: container,
            Command:   command,
            Stdout:    true,
            Stderr:    true,
        }, scheme.ParameterCodec)

    exec, err := remotecommand.NewSPDYExecutor(config, "POST", req.URL())
    if err != nil {
        return "", err
    }

    var stdout, stderr strings.Builder
    err = exec.StreamWithContext(context.TODO(), remotecommand.StreamOptions{
        Stdout: &stdout,
        Stderr: &stderr,
    })
    return stdout.String(), err
}

func TestAuthorizationPolicyAllowsGetStatus(t *testing.T) {
    output, err := execInPod(clientset, config, "istio-test",
        "sleep-pod-name", "sleep",
        []string{"curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
            "http://httpbin:8000/status/200"})
    if err != nil {
        t.Fatalf("Failed to exec: %v", err)
    }
    if strings.TrimSpace(output) != "200" {
        t.Errorf("Expected status 200, got %s", output)
    }
}

func TestAuthorizationPolicyDeniesPost(t *testing.T) {
    output, err := execInPod(clientset, config, "istio-test",
        "sleep-pod-name", "sleep",
        []string{"curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
            "-X", "POST", "http://httpbin:8000/status/200"})
    if err != nil {
        t.Fatalf("Failed to exec: %v", err)
    }
    if strings.TrimSpace(output) != "403" {
        t.Errorf("Expected status 403, got %s", output)
    }
}
```

## Testing Traffic Routing

VirtualService routing rules are another area where integration tests pay off. If you split traffic between two versions, verify the split:

```bash
#!/bin/bash
NAMESPACE="istio-test"
V1_COUNT=0
V2_COUNT=0
TOTAL=100

for i in $(seq 1 $TOTAL); do
  RESPONSE=$(kubectl exec -n $NAMESPACE deploy/sleep -c sleep -- \
    curl -s http://reviews:9080/reviews/1)
  if echo "$RESPONSE" | grep -q '"version":"v1"'; then
    V1_COUNT=$((V1_COUNT + 1))
  elif echo "$RESPONSE" | grep -q '"version":"v2"'; then
    V2_COUNT=$((V2_COUNT + 1))
  fi
done

echo "v1: $V1_COUNT, v2: $V2_COUNT out of $TOTAL"

# For a 90/10 split, v1 should be roughly 85-95
if [ $V1_COUNT -ge 75 ] && [ $V1_COUNT -le 100 ]; then
  echo "PASS: Traffic split looks correct"
else
  echo "FAIL: Traffic split is off. Expected ~90 for v1, got $V1_COUNT"
  exit 1
fi
```

## Testing with Retry Logic

Istio policies sometimes take a few seconds to propagate to all proxies. Your tests need to account for this. Add retry logic instead of hardcoded sleeps:

```bash
wait_for_policy() {
  local max_attempts=30
  local attempt=0
  local expected_code=$1
  local url=$2

  while [ $attempt -lt $max_attempts ]; do
    RESPONSE=$(kubectl exec -n istio-test deploy/sleep -c sleep -- \
      curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    if [ "$RESPONSE" = "$expected_code" ]; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  return 1
}
```

## Running Tests in CI

Put your integration tests into a CI pipeline that runs against a test cluster. Here is a simple structure:

```yaml
name: Istio Integration Tests
on:
  push:
    paths:
      - 'istio-policies/**'

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Create kind cluster
      run: kind create cluster --name istio-test

    - name: Install Istio
      run: |
        istioctl install --set profile=demo -y

    - name: Deploy test workloads
      run: |
        kubectl create namespace istio-test
        kubectl label namespace istio-test istio-injection=enabled
        kubectl apply -n istio-test -f test/workloads/

    - name: Apply policies
      run: kubectl apply -f istio-policies/

    - name: Wait for readiness
      run: |
        kubectl wait --for=condition=ready pod --all -n istio-test --timeout=180s
        sleep 10

    - name: Run integration tests
      run: bash test/integration/run-tests.sh

    - name: Cleanup
      if: always()
      run: kind delete cluster --name istio-test
```

## Cleanup Between Test Runs

Always clean up policies between test runs to avoid interference:

```bash
cleanup() {
  kubectl delete authorizationpolicy --all -n istio-test 2>/dev/null || true
  kubectl delete virtualservice --all -n istio-test 2>/dev/null || true
  kubectl delete destinationrule --all -n istio-test 2>/dev/null || true
  sleep 5
}
```

## Wrapping Up

Integration tests for Istio policies are not glamorous work, but they catch real problems. Start with the policies that matter most, probably your AuthorizationPolicies and critical routing rules, and expand from there. Automate the tests in CI so every policy change gets verified before it reaches production. The upfront investment pays for itself the first time it catches a misconfiguration that would have caused an outage.
