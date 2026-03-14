# How to Choose the Calico REST API for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, REST API, CNI, Production

Description: A decision framework for determining when to use Calico's REST API versus calicoctl or kubectl for production automation, with guidance on authentication and RBAC.

---

## Introduction

Choosing to use the Calico REST API directly in production should be a deliberate decision, not a default. Most automation scenarios are better served by wrapping `kubectl` or `calicoctl` commands rather than calling the REST API directly. However, for specific use cases - custom controllers, API gateways, complex conditional logic - the REST API is the right tool.

## Prerequisites

- Decision on Calico edition (API server required)
- Understanding of your automation tooling stack
- Kubernetes RBAC expertise for service account configuration

## When to Use the REST API in Production

Use the REST API when:
- **No kubectl/calicoctl available**: Your CI/CD runner doesn't have the binaries installed and you can't add them
- **Custom controller**: You are building a Kubernetes controller in Go, Python, or another language using a Kubernetes client library
- **Complex conditional logic**: You need to read a resource, make a decision, then conditionally update another resource atomically
- **Performance requirements**: You need to watch many resources simultaneously with a single connection (watch stream)

Do NOT use the REST API when:
- `kubectl apply -f` meets your needs (use it instead - it's simpler and more robust)
- You are writing shell scripts (use `kubectl` or `calicoctl` commands instead)
- You need BGP status or IPAM inspection (these require `calicoctl` - no REST API equivalent)

## Production Authentication Strategy

For production automation, use short-lived service account tokens:

```bash
# Create a dedicated service account per automation system
kubectl create serviceaccount calico-automation -n automation-system

# Grant minimal RBAC - only what is needed
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-policy-manager
rules:
- apiGroups: ["projectcalico.org"]
  resources: ["networkpolicies"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  resourceNames: []
EOF

kubectl create rolebinding calico-policy-automation \
  --clusterrole=calico-policy-manager \
  --serviceaccount=automation-system:calico-automation \
  -n production
```

Generate tokens per automation run (not long-lived):
```bash
# In CI/CD pipeline - short-lived token
TOKEN=$(kubectl create token calico-automation -n automation-system --duration=30m)
```

## Using Kubernetes Client Libraries

For production custom controllers, use a Kubernetes client library instead of raw `curl`:

**Python (kubernetes client)**:
```python
from kubernetes import client, config

config.load_incluster_config()  # In-cluster auth
custom_api = client.CustomObjectsApi()

policies = custom_api.list_cluster_custom_object(
    group="projectcalico.org",
    version="v3",
    plural="globalnetworkpolicies"
)
```

**Go (controller-runtime)**:
```go
import (
    calicov3 "github.com/projectcalico/api/pkg/apis/projectcalico.org/v3"
)
// Use controller-runtime's client with Calico scheme
```

Using client libraries instead of raw HTTP provides type safety, automatic retries, and watch/informer support.

## Production Rate Limiting Considerations

The Calico API server is subject to Kubernetes API server rate limiting. For high-frequency automation:

- Batch operations: Read all resources once, make decisions, update as needed (avoid tight loops)
- Use informers/watches instead of polling: `?watch=true` streams events instead of requiring repeated GET calls
- Implement exponential backoff for 429 (rate limited) and 503 (unavailable) responses

## Error Handling in Production

Production REST API clients must handle these error codes:

| HTTP Code | Meaning | Action |
|---|---|---|
| 200/201 | Success | Continue |
| 409 Conflict | Resource already exists | Read and update instead of create |
| 422 Unprocessable | Validation failed | Fix input, do not retry |
| 429 Too Many Requests | Rate limited | Exponential backoff + retry |
| 503 Service Unavailable | API server overloaded | Retry with backoff |

## Best Practices

- Use Kubernetes client libraries (kubernetes-client, controller-runtime) instead of raw HTTP in production
- Never use long-lived tokens - generate short-lived tokens per automation run
- Implement circuit breakers and retries for 429 and 503 responses
- Log all API calls with the resource name and action for audit purposes

## Conclusion

The Calico REST API is the right choice for production custom controllers, API integrations, and complex conditional automation. For simpler workflows, `kubectl apply` or `calicoctl` commands are more appropriate. In production, always use Kubernetes client libraries instead of raw HTTP, generate short-lived service account tokens per run, and implement proper error handling for rate limiting and transient failures.
