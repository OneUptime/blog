# How to Debug Why Istio Gateway Returns No Healthy Upstream

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway, Debugging, Envoy, Kubernetes

Description: How to troubleshoot the no healthy upstream error from Istio ingress gateway when routing to backend services.

---

The "no healthy upstream" error is one of the most common and frustrating issues with the Istio ingress gateway. You see a 503 status code and a message like `no healthy upstream` or the Envoy response flag `UH`. This means the gateway received the request, matched a route, but couldn't find any healthy backend to send it to. There are several possible causes, and this guide covers all of them.

## What "No Healthy Upstream" Means

When Envoy (the proxy behind the Istio gateway) tries to forward a request to a backend service, it picks from a pool of endpoints. If all endpoints are either:

- Not discovered
- Marked as unhealthy
- In a draining state
- Non-existent

Then Envoy returns 503 with `no healthy upstream`. The response flags in the access log will show `UH` (Upstream Unhealthy).

## Step 1: Check the Gateway Access Log

Get the raw access log from the ingress gateway:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=30
```

Look for the response flags field. Common flags:

- `UH` - No healthy upstream
- `UF` - Upstream connection failure
- `NR` - No route configured
- `URX` - Upstream retry limit exceeded

If you see `NR`, the problem isn't "no healthy upstream" but "no route." That's a different issue (VirtualService misconfiguration).

## Step 2: Verify the Backend Service Exists

Make sure the service your VirtualService points to actually exists:

```bash
# Check the service exists
kubectl get svc my-service -n production

# Check it has endpoints
kubectl get endpoints my-service -n production
```

If there are no endpoints, the service selector doesn't match any running pods:

```bash
# Check the service selector
kubectl get svc my-service -n production -o jsonpath='{.spec.selector}'

# Check for matching pods
kubectl get pods -n production -l app=my-service
```

## Step 3: Check That Pods Are Ready

Endpoints only include pods that pass their readiness check. If all pods are failing readiness:

```bash
kubectl get pods -n production -l app=my-service
```

If pods show `0/2 Running` or have frequent restarts, check the pod events:

```bash
kubectl describe pod -n production -l app=my-service
```

The readiness probe might be failing:

```bash
kubectl get pods -n production -l app=my-service -o jsonpath='{.items[0].status.containerStatuses[*].ready}'
```

Both containers (the app and istio-proxy) need to be ready. If the app container is ready but istio-proxy isn't, check the proxy logs:

```bash
kubectl logs -n production -l app=my-service -c istio-proxy --tail=20
```

## Step 4: Verify Port Configuration

A very common cause of "no healthy upstream" is a port mismatch. The VirtualService destination port must match the Kubernetes Service port:

```yaml
# Kubernetes Service
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - port: 8080        # Service port
      targetPort: 3000   # Container port
      name: http

# VirtualService - must use the Service port (8080), not the container port (3000)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
spec:
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
            port:
              number: 8080  # Match the Service port
```

Also, Istio uses the port name to determine the protocol. The Service port name should start with the protocol:

```yaml
ports:
  - port: 8080
    name: http-web    # The "http" prefix tells Istio to use HTTP
  - port: 9090
    name: grpc-api    # The "grpc" prefix tells Istio to use gRPC
```

If the port name doesn't have a protocol prefix, Istio treats it as TCP, which can cause problems with HTTP routing.

## Step 5: Check the Gateway's Endpoint List

See what endpoints the gateway proxy knows about:

```bash
istioctl proxy-config endpoints deploy/istio-ingressgateway -n istio-system | grep my-service
```

You should see the pod IPs listed with `HEALTHY` status. If you see:

- No entries: The gateway doesn't know about the service (check the VirtualService host)
- `UNHEALTHY` entries: Outlier detection has ejected them
- Wrong IPs: Something is wrong with service discovery

For detailed endpoint info:

```bash
istioctl proxy-config endpoints deploy/istio-ingressgateway -n istio-system \
  --cluster "outbound|8080||my-service.production.svc.cluster.local" -o json
```

## Step 6: Check for Outlier Detection Ejections

If outlier detection is configured, endpoints might be ejected:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  pilot-agent request GET stats | grep "outlier_detection.*ejections"
```

Look at `ejections_active`. If it's non-zero, some endpoints are currently ejected. They'll come back after the ejection time expires.

If all endpoints are ejected, check if your service is actually unhealthy or if the outlier detection settings are too aggressive.

## Step 7: Check Subset Configuration

If your VirtualService routes to a subset, that subset must have matching pods:

```yaml
# VirtualService references subset "v2"
route:
  - destination:
      host: my-service.production.svc.cluster.local
      subset: v2

# DestinationRule defines subset "v2"
subsets:
  - name: v2
    labels:
      version: v2  # Pods need this label
```

Check if any pods match:

```bash
kubectl get pods -n production -l "app=my-service,version=v2"
```

If no pods have the `version: v2` label, the subset has no endpoints and you get "no healthy upstream."

## Step 8: Check mTLS Compatibility

The gateway might be trying to use mTLS to connect to a service that doesn't support it (or vice versa):

```bash
istioctl proxy-config clusters deploy/istio-ingressgateway -n istio-system \
  --fqdn my-service.production.svc.cluster.local -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data:
  ts = c.get('transportSocket', {})
  print(f\"Transport: {ts.get('name', 'plaintext')}\")
"
```

If the gateway is using mTLS but the destination doesn't have a sidecar, the connection will fail. Either:

- Add a sidecar to the destination
- Set the DestinationRule to disable mTLS for that host

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: no-mtls
  namespace: istio-system
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

## Step 9: Check for DNS Resolution Issues

If you're using Istio's DNS proxy, make sure it's resolving the service correctly:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -c istio-proxy -- \
  pilot-agent request GET /dns?hostname=my-service.production.svc.cluster.local
```

## Step 10: Comprehensive Diagnosis Script

Run through all the checks at once:

```bash
#!/bin/bash
SERVICE="my-service"
NAMESPACE="production"
PORT="8080"

echo "=== Service Check ==="
kubectl get svc ${SERVICE} -n ${NAMESPACE}

echo ""
echo "=== Endpoints Check ==="
kubectl get endpoints ${SERVICE} -n ${NAMESPACE}

echo ""
echo "=== Pod Status ==="
kubectl get pods -n ${NAMESPACE} -l app=${SERVICE}

echo ""
echo "=== Gateway Endpoints ==="
istioctl proxy-config endpoints deploy/istio-ingressgateway -n istio-system | grep ${SERVICE}

echo ""
echo "=== Gateway Routes ==="
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system | grep ${SERVICE}

echo ""
echo "=== Gateway Clusters ==="
istioctl proxy-config clusters deploy/istio-ingressgateway -n istio-system | grep ${SERVICE}

echo ""
echo "=== VirtualService ==="
kubectl get virtualservice -n ${NAMESPACE} -o yaml | grep -A 5 ${SERVICE}

echo ""
echo "=== DestinationRule ==="
kubectl get destinationrule -n ${NAMESPACE} -o yaml | grep -A 5 ${SERVICE}
```

## Common Causes Summary

| Cause | How to Identify | Fix |
|-------|----------------|-----|
| No pods running | `kubectl get pods` shows 0 | Scale up deployment |
| Pods not ready | Readiness probe failing | Fix readiness probe |
| Port mismatch | Wrong port in VirtualService | Match Service port |
| Missing subset pods | No pods with subset labels | Add labels or fix subset |
| Missing port name | Service port unnamed | Name it with protocol prefix |
| Outlier ejection | All endpoints UNHEALTHY | Relax outlier detection |
| mTLS mismatch | Gateway uses mTLS, backend doesn't | Align TLS settings |

"No healthy upstream" always means the proxy found a route but couldn't reach a backend. Walk through the chain from the VirtualService destination to the actual pods, checking service existence, endpoint health, port matching, and TLS settings at each step.
