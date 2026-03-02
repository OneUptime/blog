# How to Debug 503 Errors Using Istio Access Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, 503 Error, Debugging, Access Logs, Envoy, Troubleshooting

Description: A systematic approach to debugging 503 Service Unavailable errors in Istio using access logs, response flags, and proxy configuration tools.

---

503 errors in Istio are one of the most common issues teams deal with, and they are also one of the trickiest because a 503 can come from so many different places. The upstream application might return a 503. Envoy might generate a 503 because it could not connect to the upstream. The circuit breaker might trigger a 503. Even a missing route can result in a 503.

The good news is that Istio access logs contain all the information you need to pinpoint the exact cause. This guide walks through a systematic debugging process.

## Step 1: Get the Access Logs

First, find the 503 errors in the access logs of the affected service:

```bash
# Get recent 503 errors from the destination service
kubectl logs deploy/my-service -c istio-proxy --tail=200 | grep '" 503 '
```

You should see lines like:

```
[2026-02-24T14:00:00.123Z] "GET /api/data HTTP/1.1" 503 UF via_upstream - "-" 0 91 3005 - "-" "Go-http-client/2.0" "abc-123" "my-service.default.svc.cluster.local" "10.244.2.15:8080" outbound|8080||my-service.default.svc.cluster.local 10.244.1.12:44556 10.96.123.45:8080 10.244.1.12:33444 - default
```

Also check the source service's outbound logs:

```bash
kubectl logs deploy/calling-service -c istio-proxy --tail=200 | grep '" 503 '
```

## Step 2: Read the Response Flags

The response flag is the fourth field - the key to diagnosing the 503. Here is what each flag means for 503s:

### 503 + UF (Upstream Connection Failure)

The most common combination. Envoy tried to connect to the upstream pod and the connection was refused or timed out.

**Investigation steps:**

```bash
# Check if destination pods are running
kubectl get pods -l app=my-service -o wide

# Check for recent restarts
kubectl get pods -l app=my-service -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[*].restartCount,READY:.status.containerStatuses[*].ready

# Check if the application container is listening on the expected port
kubectl exec deploy/my-service -c my-service -- ss -tlnp

# Check Envoy endpoints
istioctl proxy-config endpoint deploy/calling-service --cluster "outbound|8080||my-service.default.svc.cluster.local"
```

**Common fixes:**
- Application is not listening on the port specified in the Kubernetes Service
- The application is still starting up (readiness probe is passing but the app is not ready)
- Resource limits are too low, causing OOM kills

### 503 + UH (No Healthy Upstream)

All upstream endpoints are marked as unhealthy. Envoy has nowhere to send the request.

**Investigation steps:**

```bash
# Check endpoint health status
istioctl proxy-config endpoint deploy/calling-service | grep my-service

# Look for UNHEALTHY endpoints
istioctl proxy-config endpoint deploy/calling-service --cluster "outbound|8080||my-service.default.svc.cluster.local" -o json | jq '.[].hostStatuses[] | {address: .address.socketAddress, healthStatus: .healthStatus}'

# Check if outlier detection ejected all endpoints
istioctl proxy-config cluster deploy/calling-service --fqdn my-service.default.svc.cluster.local -o json | jq '.[].outlierDetection'
```

**Common fixes:**
- Health checks are too aggressive (tight intervals, low thresholds)
- Outlier detection ejected all pods (reduce the ejection percentage or increase the base ejection time)
- All pods are genuinely unhealthy (check application health)

### 503 + UC (Upstream Connection Termination)

The connection was established but the upstream reset it before or during the response.

**Investigation steps:**

```bash
# Check application logs for crashes during request processing
kubectl logs deploy/my-service --tail=50

# Check for OOM kills
kubectl get events --field-selector involvedObject.name=my-service-pod-name

# Check connection limits in DestinationRule
kubectl get destinationrule -o yaml | grep -A20 connectionPool
```

**Common fixes:**
- Application is crashing during request processing
- Maximum connection limits are being hit
- Keep-alive settings mismatch between client and server
- Application-level timeouts are causing premature connection closes

### 503 + UT (Upstream Request Timeout)

The upstream did not respond within the configured timeout.

**Investigation steps:**

```bash
# Check the VirtualService timeout
kubectl get virtualservice -o yaml | grep -B5 -A5 timeout

# Check the route timeout in Envoy config
istioctl proxy-config route deploy/calling-service -o json | jq '.[].virtualHosts[].routes[].route.timeout'

# Check how long the request actually took (from the Duration field in the log)
# A duration of exactly 15000ms suggests a 15s timeout
```

**Common fixes:**
- Increase the timeout in the VirtualService
- Fix the underlying slow processing on the upstream
- Set per-route timeouts for endpoints known to be slow:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - match:
        - uri:
            prefix: /api/slow-endpoint
      route:
        - destination:
            host: my-service
      timeout: 60s
    - route:
        - destination:
            host: my-service
      timeout: 15s
```

### 503 + UO (Upstream Overflow / Circuit Breaker)

The circuit breaker is rejecting requests because limits have been exceeded.

**Investigation steps:**

```bash
# Check the DestinationRule
kubectl get destinationrule -o yaml

# Check circuit breaker stats
istioctl proxy-config cluster deploy/calling-service --fqdn my-service.default.svc.cluster.local -o json | jq '.[].circuitBreakers'
```

**Common fixes:**
- Increase circuit breaker limits in the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 200
        http2MaxRequests: 200
        maxRequestsPerConnection: 100
```

- Scale up the destination service
- Reduce the request rate from callers

### 503 + NR (No Route)

Envoy does not have a route for this request. This is technically more of a 404-type issue, but Envoy returns 503 in some cases.

**Investigation steps:**

```bash
# Check routes
istioctl proxy-config route deploy/calling-service | grep my-service

# Check listeners
istioctl proxy-config listener deploy/calling-service

# Check if the service exists
kubectl get service my-service
```

**Common fixes:**
- Create the missing VirtualService
- Check that the service name and port match
- Verify the namespace is included in the mesh

### 503 + "-" (No Response Flag)

The upstream application itself returned the 503. Envoy is just passing it through.

**Investigation steps:**

```bash
# Check application logs
kubectl logs deploy/my-service --tail=100

# The response_code_details field should say "via_upstream"
# This confirms the upstream generated the response
```

This is an application-level issue, not an Istio issue.

## Step 3: Check Both Sides

Always check logs from both the source and destination:

```bash
# Source side (outbound)
kubectl logs deploy/calling-service -c istio-proxy | grep "my-service" | grep '" 503 '

# Destination side (inbound)
kubectl logs deploy/my-service -c istio-proxy | grep '" 503 '
```

If the source shows a 503 but the destination has no corresponding log entry, the request never reached the destination. This points to:
- Connection failure (UF)
- No healthy upstream (UH)
- Route not found (NR)

If both sides have log entries, compare the timing:
- Source duration: 15000ms, Destination duration: 14995ms - The upstream was slow
- Source duration: 15000ms, no destination entry - Connection failed

## Step 4: Use the Request ID

Trace a specific failed request across the entire call chain:

```bash
# Find a 503 and get its request ID
REQUEST_ID=$(kubectl logs deploy/calling-service -c istio-proxy --tail=100 | grep '" 503 ' | head -1 | grep -oP '"[a-f0-9-]+"' | head -4 | tail -1 | tr -d '"')

# Search for this request ID in all services
for pod in $(kubectl get pods -o name); do
  result=$(kubectl logs $pod -c istio-proxy 2>/dev/null | grep "$REQUEST_ID")
  if [ -n "$result" ]; then
    echo "=== $pod ==="
    echo "$result"
  fi
done
```

## Step 5: Check for Patterns

Once you have identified the response flag, look for patterns:

```bash
# Are 503s coming from a specific upstream host?
kubectl logs deploy/calling-service -c istio-proxy | grep '" 503 ' | awk '{for(i=1;i<=NF;i++) if($i ~ /^"10\./) print $i}' | sort | uniq -c | sort -rn

# Are 503s happening at specific times?
kubectl logs deploy/calling-service -c istio-proxy | grep '" 503 ' | awk -F'[\\[\\]]' '{print $2}' | awk -FT '{print $2}' | awk -F: '{print $1":"$2}' | sort | uniq -c

# Are 503s happening on specific paths?
kubectl logs deploy/calling-service -c istio-proxy | grep '" 503 ' | awk -F'"' '{print $2}' | sort | uniq -c | sort -rn
```

These patterns help distinguish between a single unhealthy pod (one upstream host has all the errors), a deployment issue (errors started at a specific time), or a specific endpoint problem (one path has all the errors).

503 errors feel overwhelming at first, but with a systematic approach based on response flags, they become diagnosable. The response flag is your starting point - it tells you exactly where to look next.
