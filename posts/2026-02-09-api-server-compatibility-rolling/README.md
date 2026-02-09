# How to Handle API Server Request Compatibility During Rolling Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API-Server, Compatibility

Description: Manage Kubernetes API server request compatibility during rolling upgrades with version skew policies, backward compatibility strategies, and techniques for handling mixed-version control planes safely.

---

During rolling control plane upgrades, you temporarily run multiple API server versions simultaneously. Understanding API compatibility and version skew requirements prevents client failures and ensures smooth upgrades without service interruption.

## Understanding API Version Skew

Kubernetes supports limited version skew between components. The API server can be at version N, while kubelets can be at N-2, and kubectl can be at N+1 or N-1. However, during rolling upgrades, you may have multiple API server versions running behind a load balancer, requiring careful compatibility management.

API servers support multiple API versions simultaneously. Clients specify which version they want using the apiVersion field. During upgrades, ensure older API servers can handle requests from newer clients and vice versa.

## Checking Version Skew

Verify your cluster meets version skew requirements before upgrading.

```bash
#!/bin/bash
# check-version-skew.sh

echo "Checking version skew across cluster components..."

# Get API server versions
API_VERSIONS=$(kubectl get pods -n kube-system -l component=kube-apiserver \
  -o jsonpath='{.items[*].spec.containers[0].image}' | \
  tr ' ' '\n' | sort -u)

echo "API server versions:"
echo "$API_VERSIONS"

# Get kubelet versions
echo "Kubelet versions:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion

# Get controller manager version
echo "Controller manager:"
kubectl get pods -n kube-system -l component=kube-controller-manager \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Check kubectl version
echo "kubectl version:"
kubectl version --client --short

# Validate skew
CURRENT_API=$(kubectl version --short | grep Server | awk '{print $3}' | sed 's/v//')
CURRENT_KUBELET=$(kubectl get nodes -o json | jq -r '.items[0].status.nodeInfo.kubeletVersion' | sed 's/v//')

echo "API version: $CURRENT_API"
echo "Kubelet version: $CURRENT_KUBELET"
```

## Handling Multi-Version API Servers

During rolling upgrades, multiple API server versions serve requests simultaneously.

```bash
#!/bin/bash
# monitor-api-server-versions.sh

echo "Monitoring API server versions during upgrade..."

while true; do
  echo "========== $(date) =========="

  # List all API server pods and versions
  kubectl get pods -n kube-system -l component=kube-apiserver \
    -o custom-columns=\
NAME:.metadata.name,\
NODE:.spec.nodeName,\
VERSION:.spec.containers[0].image,\
STATUS:.status.phase

  # Check which API server is answering requests
  for i in {1..5}; do
    kubectl version --short 2>&1 | grep "Server Version"
    sleep 1
  done

  sleep 30
done
```

## Managing API Request Routing

Ensure API requests route correctly during mixed-version scenarios.

```bash
#!/bin/bash
# test-api-routing.sh

echo "Testing API request routing during upgrade..."

# Test that all API versions are accessible
for version in v1 apps/v1 batch/v1 networking.k8s.io/v1; do
  echo "Testing API version: $version"

  kubectl api-resources --api-group=$(echo $version | cut -d/ -f1) \
    --verbs=list --namespaced -o name | head -1 | \
    xargs kubectl get --all-namespaces -o json | \
    jq -r '.items | length' > /dev/null 2>&1

  if [ $? -eq 0 ]; then
    echo "  $version: OK"
  else
    echo "  $version: FAILED"
  fi
done
```

## Handling Deprecated API Versions

During upgrades, deprecated APIs may become unavailable. Prepare clients for this transition.

```bash
#!/bin/bash
# check-deprecated-api-usage.sh

TARGET_VERSION="1.29"

echo "Checking for deprecated API usage before upgrade to $TARGET_VERSION..."

# Check API server metrics for deprecated API calls
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis

# List resources using deprecated APIs
kubectl api-resources --verbs=list -o name | while read resource; do
  # Try to get resources
  kubectl get $resource -A -o json 2>/dev/null | \
    jq -r --arg targetVersion "$TARGET_VERSION" '
      .items[] |
      select(.apiVersion | contains("v1beta") or contains("v1alpha")) |
      "\(.kind): \(.apiVersion) in \(.metadata.namespace)/\(.metadata.name)"
    '
done | sort -u
```

## Implementing Request Compatibility Checks

Add compatibility checks to prevent breaking changes.

```go
// Example: API server request compatibility check
package main

import (
    "k8s.io/apimachinery/pkg/runtime/schema"
)

// CheckAPICompatibility verifies request uses supported API version
func CheckAPICompatibility(gv schema.GroupVersion, serverVersion string) error {
    supportedVersions := map[string][]string{
        "1.28": {"v1", "apps/v1", "batch/v1", "networking.k8s.io/v1"},
        "1.29": {"v1", "apps/v1", "batch/v1", "networking.k8s.io/v1"},
    }

    supported := supportedVersions[serverVersion]
    requestedAPI := gv.String()

    for _, api := range supported {
        if api == requestedAPI {
            return nil
        }
    }

    return fmt.Errorf("API version %s not supported in server version %s", requestedAPI, serverVersion)
}
```

## Testing Client Compatibility

Validate that clients work correctly with the new API server version.

```bash
#!/bin/bash
# test-client-compatibility.sh

NEW_API_VERSION="1.29.0"

echo "Testing client compatibility with API version $NEW_API_VERSION..."

# Create test cluster
kind create cluster --name api-compat-test --image kindest/node:v$NEW_API_VERSION

# Test kubectl operations
echo "Testing kubectl compatibility..."
kubectl --context kind-api-compat-test get nodes
kubectl --context kind-api-compat-test apply -f ./test-manifests/
kubectl --context kind-api-compat-test delete -f ./test-manifests/

# Test programmatic clients
echo "Testing Go client compatibility..."
go test ./pkg/client/... -tags=integration

# Test Helm compatibility
echo "Testing Helm compatibility..."
helm --kube-context kind-api-compat-test install test-release ./charts/test-chart
helm --kube-context kind-api-compat-test uninstall test-release

# Cleanup
kind delete cluster --name api-compat-test

echo "Client compatibility testing complete"
```

## Monitoring API Server Health

Monitor API server health during rolling upgrades to detect compatibility issues.

```bash
#!/bin/bash
# monitor-api-health.sh

echo "Monitoring API server health..."

while true; do
  # Check API server availability
  if kubectl get --raw /healthz > /dev/null 2>&1; then
    echo "$(date): API server healthy"
  else
    echo "$(date): API server unhealthy"
  fi

  # Check API server latency
  latency=$(kubectl get --raw /metrics 2>/dev/null | \
    grep 'apiserver_request_duration_seconds_bucket' | \
    grep 'le="1"' | head -1 | awk '{print $2}')

  echo "$(date): API latency: ${latency}s"

  # Check for API errors
  errors=$(kubectl get --raw /metrics | \
    grep 'apiserver_request_total' | \
    grep 'code="5' | \
    awk '{sum+=$2} END {print sum}')

  echo "$(date): API 5xx errors: $errors"

  sleep 30
done
```

## Graceful API Version Transitions

Implement graceful transitions when deprecating API versions.

```yaml
# api-version-warning.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: deprecated-api-warning
webhooks:
- name: deprecated-api-check.example.com
  admissionReviewVersions: ["v1"]
  clientConfig:
    service:
      name: api-validator
      namespace: kube-system
      path: "/validate"
  rules:
  - apiGroups: ["extensions"]
    apiVersions: ["v1beta1"]
    operations: ["CREATE", "UPDATE"]
    resources: ["ingresses"]
  failurePolicy: Fail
  sideEffects: None
```

## Handling Version Skew in Controllers

Ensure controllers handle API version skew correctly.

```bash
#!/bin/bash
# test-controller-skew.sh

echo "Testing controller behavior during API version skew..."

# Deploy controller
kubectl apply -f ./controllers/test-controller.yaml

# Create resources using old API version
cat <<EOF | kubectl apply -f -
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: test-ingress
spec:
  rules:
  - host: test.example.com
    http:
      paths:
      - path: /
        backend:
          serviceName: test-service
          servicePort: 80
EOF

# Verify controller reconciles correctly
sleep 10
kubectl get ingress test-ingress -o yaml

# Update using new API version
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
spec:
  rules:
  - host: test.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: test-service
            port:
              number: 80
EOF

# Verify controller still reconciles
sleep 10
kubectl describe ingress test-ingress

kubectl delete ingress test-ingress
```

## Best Practices

Always test API compatibility in staging before production upgrades. Monitor API server metrics during rolling upgrades. Implement gradual rollout for control plane updates. Keep kubectl and client libraries within supported version skew. Document API version requirements for all applications. Use admission webhooks to warn about deprecated API usage.

Understanding and managing API server request compatibility during rolling upgrades is crucial for maintaining cluster stability. By testing version skew scenarios, monitoring API health, implementing compatibility checks, and following version skew policies, you can perform rolling control plane upgrades safely while maintaining full API availability for your workloads.
