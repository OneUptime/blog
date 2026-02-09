# How to Use kubectl get --raw to Query Raw API Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, kubectl

Description: Master the kubectl get --raw command to directly query Kubernetes API endpoints, access metrics, inspect discovery information, and debug API server behavior without additional tools.

---

Most of the time, kubectl commands like `get`, `describe`, and `delete` handle your Kubernetes interactions. But sometimes you need direct access to the raw API endpoints to troubleshoot issues, access metrics, or work with API groups that kubectl does not fully support. That is where `kubectl get --raw` becomes invaluable.

## Understanding the Raw API Access

The `kubectl get --raw` command sends HTTP GET requests directly to the Kubernetes API server and returns the raw response. Unlike regular kubectl commands that format output, this gives you unfiltered access to what the API server actually returns.

Basic syntax:

```bash
kubectl get --raw /path/to/endpoint
```

The command automatically handles authentication using your kubeconfig credentials.

## Querying API Discovery Information

One of the most useful applications is exploring API groups and resources:

```bash
# List all API versions
kubectl get --raw /api

# List API groups
kubectl get --raw /apis

# Get details about a specific API group
kubectl get --raw /apis/apps

# List resources in a specific API version
kubectl get --raw /apis/apps/v1
```

The output is JSON. Pipe it through `jq` for better readability:

```bash
kubectl get --raw /apis/apps/v1 | jq
```

You will see detailed information about resources, verbs, and whether they are namespaced:

```json
{
  "kind": "APIResourceList",
  "apiVersion": "v1",
  "groupVersion": "apps/v1",
  "resources": [
    {
      "name": "deployments",
      "singularName": "deployment",
      "namespaced": true,
      "kind": "Deployment",
      "verbs": ["create", "delete", "get", "list", "patch", "update", "watch"]
    }
  ]
}
```

## Accessing Cluster Metrics

Kubernetes exposes various metrics through the API server. You can query them with `--raw`:

```bash
# Get API server metrics
kubectl get --raw /metrics

# Filter for specific metrics
kubectl get --raw /metrics | grep apiserver_request_total

# Get API server health status
kubectl get --raw /healthz

# Get readiness status
kubectl get --raw /readyz

# Get liveness status
kubectl get --raw /livez
```

For node metrics (requires metrics-server):

```bash
# Get metrics for all nodes
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes

# Get metrics for a specific node
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes/node-name | jq
```

Pod metrics:

```bash
# Get metrics for all pods in a namespace
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/default/pods

# Get metrics for a specific pod
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/default/pods/nginx-xxx | jq '.usage'
```

## Querying Resources Directly

You can retrieve resources using the raw API endpoints:

```bash
# List all pods in the default namespace
kubectl get --raw /api/v1/namespaces/default/pods | jq

# Get a specific pod
kubectl get --raw /api/v1/namespaces/default/pods/nginx-pod | jq

# List all deployments
kubectl get --raw /apis/apps/v1/namespaces/default/deployments | jq

# Get custom resources
kubectl get --raw /apis/custom.example.com/v1/namespaces/default/customresources | jq
```

Add query parameters for filtering and pagination:

```bash
# Limit results
kubectl get --raw "/api/v1/namespaces/default/pods?limit=10" | jq

# Filter by label selector
kubectl get --raw "/api/v1/namespaces/default/pods?labelSelector=app=nginx" | jq

# Filter by field selector
kubectl get --raw "/api/v1/namespaces/default/pods?fieldSelector=status.phase=Running" | jq
```

## Accessing Subresources

Many resources have subresources like status, scale, or logs. Access them using `--raw`:

```bash
# Get deployment status subresource
kubectl get --raw /apis/apps/v1/namespaces/default/deployments/nginx/status | jq

# Get pod logs (this is what kubectl logs does under the hood)
kubectl get --raw "/api/v1/namespaces/default/pods/nginx-pod/log"

# Get previous container logs
kubectl get --raw "/api/v1/namespaces/default/pods/nginx-pod/log?previous=true"

# Get pod exec (though you cannot actually exec via --raw)
# This just shows the endpoint exists
kubectl get --raw /api/v1/namespaces/default/pods/nginx-pod/exec
```

## Debugging API Priority and Fairness

Check API Priority and Fairness configurations:

```bash
# List priority level configurations
kubectl get --raw /apis/flowcontrol.apiserver.k8s.io/v1beta3/prioritylevelconfigurations | jq

# Get details on a specific priority level
kubectl get --raw /apis/flowcontrol.apiserver.k8s.io/v1beta3/prioritylevelconfigurations/system | jq

# List flow schemas
kubectl get --raw /apis/flowcontrol.apiserver.k8s.io/v1beta3/flowschemas | jq
```

## Working with OpenAPI Specifications

Kubernetes exposes its API schema via OpenAPI:

```bash
# Get OpenAPI v2 spec
kubectl get --raw /openapi/v2 > openapi-v2.json

# Get OpenAPI v3 spec (newer, more detailed)
kubectl get --raw /openapi/v3 > openapi-v3.json

# Get OpenAPI spec for a specific API group
kubectl get --raw /openapi/v3/apis/apps/v1 | jq
```

This is useful for generating client libraries or understanding exact field schemas.

## Accessing Admission Control Information

Check webhook configurations:

```bash
# List validating webhooks
kubectl get --raw /apis/admissionregistration.k8s.io/v1/validatingwebhookconfigurations | jq

# List mutating webhooks
kubectl get --raw /apis/admissionregistration.k8s.io/v1/mutatingwebhookconfigurations | jq

# Get CEL admission policies
kubectl get --raw /apis/admissionregistration.k8s.io/v1/validatingadmissionpolicies | jq
```

## Practical Debugging Scenarios

**Scenario 1: Check if a CRD is properly registered**

```bash
# List all CRDs
kubectl get --raw /apis/apiextensions.k8s.io/v1/customresourcedefinitions | jq '.items[].metadata.name'

# Get details on a specific CRD
kubectl get --raw /apis/apiextensions.k8s.io/v1/customresourcedefinitions/databases.example.com | jq
```

**Scenario 2: Verify API server can reach a specific resource**

```bash
# Try to list resources in a custom API group
kubectl get --raw /apis/myapp.example.com/v1/namespaces/default/myresources

# If it works, you get JSON back
# If it fails, you see an error message
```

**Scenario 3: Check cluster version and feature gates**

```bash
# Get server version
kubectl get --raw /version | jq

# Check API server flags (requires access to static pods)
kubectl get --raw /api/v1/namespaces/kube-system/pods/kube-apiserver-xxx | jq '.spec.containers[0].command'
```

**Scenario 4: Monitor API request rates**

```bash
# Watch metrics in real-time (combine with watch command)
watch -n 1 'kubectl get --raw /metrics | grep apiserver_request_total | grep "verb=\"list\""'
```

## Using with Scripts and Automation

The `--raw` flag is particularly useful in scripts:

```bash
#!/bin/bash

# Check if metrics-server is available
if kubectl get --raw /apis/metrics.k8s.io/v1beta1 > /dev/null 2>&1; then
    echo "Metrics server is available"

    # Get CPU usage for all nodes
    kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes | \
        jq -r '.items[] | "\(.metadata.name): \(.usage.cpu)"'
else
    echo "Metrics server is not available"
fi
```

Or check API health in monitoring:

```bash
#!/bin/bash

# Check all health endpoints
for endpoint in /healthz /readyz /livez; do
    status=$(kubectl get --raw $endpoint 2>&1)
    if [ "$status" = "ok" ]; then
        echo "$endpoint: OK"
    else
        echo "$endpoint: FAILED"
        exit 1
    fi
done
```

## Comparing with curl

You can achieve similar results with curl, but `kubectl get --raw` is simpler because it handles authentication automatically:

```bash
# Using kubectl get --raw (simple)
kubectl get --raw /api/v1/pods

# Equivalent curl command (complex)
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
TOKEN=$(kubectl create token default)
curl -k -H "Authorization: Bearer $TOKEN" $APISERVER/api/v1/pods
```

## Limitations

`kubectl get --raw` only supports GET requests. For other operations:

- Use `kubectl proxy` to create a local proxy, then use any HTTP client
- Use `kubectl create`, `kubectl apply`, `kubectl delete` for mutating operations
- Use client libraries for complex programmatic access

## Troubleshooting Tips

**Problem: "error: You must be logged in to the server"**

Solution: Check your kubeconfig:

```bash
kubectl config view
kubectl config current-context
```

**Problem: "Error from server (NotFound)"**

Solution: Verify the API path is correct. List available APIs:

```bash
kubectl get --raw /apis | jq
```

**Problem: Unreadable output**

Solution: Always pipe through `jq` for JSON or `grep` for metrics:

```bash
kubectl get --raw /metrics | grep -E "apiserver_request_total|apiserver_request_duration"
```

## Conclusion

The `kubectl get --raw` command is an essential tool for advanced Kubernetes troubleshooting and exploration. It gives you direct access to the API server, enabling you to inspect metrics, verify API availability, debug custom resources, and understand exactly how kubectl interacts with your cluster. Whether you are debugging webhook issues, checking metrics, or exploring new API groups, this command provides the low-level access you need without requiring additional tools or complex authentication setup.
