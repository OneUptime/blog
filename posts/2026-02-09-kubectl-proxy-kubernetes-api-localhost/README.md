# How to Use kubectl proxy to Access the Kubernetes API Securely from Localhost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, API Access

Description: Learn how to use kubectl proxy to create a secure local tunnel to the Kubernetes API server, enabling browser-based API exploration and custom tool integration without managing certificates.

---

Direct Kubernetes API access requires certificate authentication and HTTPS handling. kubectl proxy simplifies this by creating a local HTTP server that forwards requests to the API server with proper authentication. This enables browser access, curl commands, and custom tooling without certificate management.

## What kubectl proxy Does

kubectl proxy runs a local HTTP server that authenticates to the Kubernetes API server using your kubeconfig credentials, then proxies requests:

```bash
# Start the proxy
kubectl proxy

# Output:
# Starting to serve on 127.0.0.1:8001

# The API is now accessible at http://localhost:8001
```

Requests to localhost:8001 get forwarded to the API server with authentication headers automatically added.

## Basic Proxy Usage

Start the proxy and access the API through your browser or curl:

```bash
# Start proxy in foreground
kubectl proxy

# In another terminal, access the API
curl http://localhost:8001/api/v1/namespaces/default/pods

# Or open in browser
# http://localhost:8001/api/v1/namespaces
```

The proxy runs until you stop it with Ctrl+C.

## Custom Port Configuration

Change the default port if 8001 conflicts:

```bash
# Use custom port
kubectl proxy --port=8080

# Access API on custom port
curl http://localhost:8080/api/v1/nodes

# Use random available port
kubectl proxy --port=0
# Output shows assigned port
```

This avoids port conflicts with other local services.

## Running in Background

Run the proxy as a background process:

```bash
# Start in background
kubectl proxy &
# Returns PID: [1] 12345

# Or use nohup for persistence
nohup kubectl proxy --port=8001 > /tmp/kubectl-proxy.log 2>&1 &

# Stop background proxy
kill <PID>

# Or find and kill
pkill -f "kubectl proxy"
```

Background mode enables long-running API access without tying up a terminal.

## Accessing Different Clusters

The proxy uses your current kubeconfig context:

```bash
# Check current context
kubectl config current-context

# Start proxy for current context
kubectl proxy

# Switch context and restart proxy
kubectl config use-context production
kubectl proxy --port=8002
```

Run multiple proxies on different ports to access multiple clusters simultaneously.

## Exploring the API with a Browser

The proxy enables browser-based API exploration:

```bash
# Start proxy
kubectl proxy

# Open in browser:
# http://localhost:8001/api/v1
# http://localhost:8001/apis
# http://localhost:8001/api/v1/namespaces/default/pods
# http://localhost:8001/api/v1/nodes
```

Browsers format JSON responses for easy reading and clicking through API paths.

## Accessing Cluster Services

Access services running in the cluster through the proxy:

```bash
# Start proxy
kubectl proxy

# Access service through proxy
# Format: /api/v1/namespaces/<namespace>/services/<service-name>/proxy/
curl http://localhost:8001/api/v1/namespaces/default/services/webapp:80/proxy/

# Access specific service paths
curl http://localhost:8001/api/v1/namespaces/default/services/webapp:80/proxy/health

# Access with service port name
curl http://localhost:8001/api/v1/namespaces/default/services/webapp:http/proxy/
```

This tunnels through the API server to reach cluster services without port-forward or ingress.

## Dashboard Access

Access Kubernetes Dashboard through the proxy:

```bash
# Start proxy
kubectl proxy

# Access dashboard (if installed)
# http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

# Alternative dashboard URL format
# http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/kubernetes-dashboard/proxy/
```

This provides secure dashboard access without exposing it externally.

## API Discovery

Use the proxy to explore available API groups and resources:

```bash
# Start proxy
kubectl proxy

# List API groups
curl http://localhost:8001/apis

# List core API resources
curl http://localhost:8001/api/v1

# List apps API resources
curl http://localhost:8001/apis/apps/v1

# Get OpenAPI schema
curl http://localhost:8001/openapi/v2
```

This reveals API structure without external tools.

## Making API Requests

Perform CRUD operations through the proxy:

```bash
# Start proxy
kubectl proxy

# GET requests
curl http://localhost:8001/api/v1/namespaces/default/pods/webapp

# POST requests (create resource)
curl -X POST \
  -H "Content-Type: application/json" \
  -d @pod.json \
  http://localhost:8001/api/v1/namespaces/default/pods

# DELETE requests
curl -X DELETE \
  http://localhost:8001/api/v1/namespaces/default/pods/webapp

# PATCH requests
curl -X PATCH \
  -H "Content-Type: application/strategic-merge-patch+json" \
  -d '{"spec":{"replicas":3}}' \
  http://localhost:8001/apis/apps/v1/namespaces/default/deployments/webapp
```

The proxy handles authentication, so you only need HTTP requests.

## Watch API Events

Stream resource changes through the proxy:

```bash
# Start proxy
kubectl proxy

# Watch pod events
curl http://localhost:8001/api/v1/namespaces/default/pods?watch=true

# Watch all events
curl http://localhost:8001/api/v1/events?watch=true

# Filter with label selectors
curl "http://localhost:8001/api/v1/namespaces/default/pods?watch=true&labelSelector=app=nginx"
```

This streams JSON events as resources change in real-time.

## Accessing Metrics

Query metrics API through the proxy:

```bash
# Start proxy
kubectl proxy

# Get node metrics
curl http://localhost:8001/apis/metrics.k8s.io/v1beta1/nodes

# Get pod metrics
curl http://localhost:8001/apis/metrics.k8s.io/v1beta1/namespaces/default/pods

# Get specific pod metrics
curl http://localhost:8001/apis/metrics.k8s.io/v1beta1/namespaces/default/pods/webapp
```

This requires metrics-server to be installed in the cluster.

## Custom Headers and Filters

Add headers and query parameters to requests:

```bash
# Start proxy
kubectl proxy

# Add custom headers
curl -H "Accept: application/json" \
  http://localhost:8001/api/v1/pods

# Use field selectors
curl "http://localhost:8001/api/v1/pods?fieldSelector=status.phase=Running"

# Use label selectors
curl "http://localhost:8001/api/v1/pods?labelSelector=app=nginx"

# Limit results
curl "http://localhost:8001/api/v1/pods?limit=10"
```

Query parameters filter and customize API responses.

## Integration with Development Tools

Use the proxy with custom scripts and tools:

```bash
#!/bin/bash
# monitor-pods.sh - Monitor pod status through proxy

# Ensure proxy is running
if ! pgrep -f "kubectl proxy" > /dev/null; then
    kubectl proxy &
    sleep 2
fi

# Poll pod status
while true; do
    curl -s http://localhost:8001/api/v1/namespaces/default/pods | \
        jq -r '.items[] | "\(.metadata.name): \(.status.phase)"'
    sleep 5
done
```

This enables custom monitoring and automation tools.

## Security Considerations

The proxy binds to localhost by default, preventing external access:

```bash
# Default - only localhost
kubectl proxy
# Accessible only from: 127.0.0.1:8001

# WARNING: Accept from all interfaces (dangerous)
kubectl proxy --address='0.0.0.0' --accept-hosts='.*'
# Accessible from any IP - use with extreme caution

# Accept from specific hosts
kubectl proxy --address='0.0.0.0' --accept-hosts='^localhost$,^127\.0\.0\.1$'
```

Never expose the proxy externally in production without additional authentication.

## Filtering API Paths

Restrict which API paths the proxy serves:

```bash
# Only serve specific paths
kubectl proxy --reject-paths="^/api/v1/secrets"

# Reject multiple paths
kubectl proxy --reject-paths="^/api/v1/secrets,^/api/v1/configmaps"

# Accept only specific paths
kubectl proxy --accept-paths="^/api/v1/pods"
```

Path filtering adds basic access control to the proxy.

## Debugging API Calls

Use the proxy to debug how kubectl interacts with the API:

```bash
# Start proxy
kubectl proxy -v=8

# In another terminal, run kubectl commands
kubectl get pods

# Watch proxy terminal to see API calls kubectl makes
# Shows full HTTP requests and responses
```

Verbose mode reveals exact API requests kubectl generates.

## Testing API Changes

Test manifest changes against the API:

```bash
# Start proxy
kubectl proxy

# Dry-run apply via API
curl -X POST \
  -H "Content-Type: application/json" \
  -d @deployment.json \
  "http://localhost:8001/apis/apps/v1/namespaces/default/deployments?dryRun=All"

# Check server-side validation
curl -X POST \
  -H "Content-Type: application/json" \
  -d @invalid-pod.json \
  "http://localhost:8001/api/v1/namespaces/default/pods"
```

This validates resources without actually creating them.

## CI/CD Integration

Use the proxy in CI/CD pipelines for API access:

```bash
#!/bin/bash
# ci-api-test.sh

# Start proxy in background
kubectl proxy --port=8001 &
PROXY_PID=$!

# Wait for proxy to start
sleep 2

# Run API tests
curl -s http://localhost:8001/api/v1/namespaces/default/pods > /dev/null
if [ $? -eq 0 ]; then
    echo "API accessible"
else
    echo "API access failed"
    kill $PROXY_PID
    exit 1
fi

# Cleanup
kill $PROXY_PID
```

This enables API-level testing without exposing the cluster externally.

## Accessing CRDs

Query custom resources through the proxy:

```bash
# Start proxy
kubectl proxy

# List CRDs
curl http://localhost:8001/apis/apiextensions.k8s.io/v1/customresourcedefinitions

# Access custom resources
curl http://localhost:8001/apis/argoproj.io/v1alpha1/namespaces/default/applications

# Query specific custom resource
curl http://localhost:8001/apis/cert-manager.io/v1/namespaces/default/certificates/webapp-tls
```

This works with any CRD registered in the cluster.

## Monitoring Proxy Performance

Check proxy resource usage:

```bash
# Start proxy
kubectl proxy

# Monitor process
ps aux | grep "kubectl proxy"

# Check listening sockets
netstat -an | grep 8001

# Test latency
time curl http://localhost:8001/api/v1/namespaces
```

The proxy adds minimal overhead for most operations.

## Alternative to kubectl proxy

For production use, consider direct API access with proper credentials:

```bash
# Get API server URL
kubectl cluster-info | grep "Kubernetes control plane"

# Extract token
TOKEN=$(kubectl create token default)

# Direct API access with curl
curl -H "Authorization: Bearer $TOKEN" \
  --cacert /path/to/ca.crt \
  https://kubernetes-api-server:6443/api/v1/pods
```

Direct access avoids proxy overhead but requires certificate and token management.

kubectl proxy transforms the Kubernetes API from a certificate-protected endpoint into a simple localhost HTTP interface. Use it for development, debugging, and exploring the API without managing authentication credentials. For production automation, consider direct API access or client libraries. Learn more about API exploration at https://oneuptime.com/blog/post/2026-02-09-kubectl-api-resources-versions-discover/view.
