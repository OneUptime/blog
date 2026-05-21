# How to Fix 503 Upstream Connection Error in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, 503 Error, Troubleshooting, Envoy, Upstream Connection

Description: Diagnose and resolve the common 503 Upstream Connect Error or No Healthy Upstream in Istio service mesh with practical debugging steps.

---

The 503 "upstream connect error or disconnect/reset before headers" is probably the most common error you will encounter in an Istio mesh. It can mean a dozen different things, and the error message itself does not tell you much. Your downstream service gets a 503, and the only clue is a vague message about upstream connectivity.

This guide breaks down every common cause of 503 errors in Istio and shows you how to identify and fix each one.

## Understanding the 503 Error

When Envoy returns a 503, it means the sidecar proxy could not successfully connect to the upstream (destination) service. The full error usually looks something like:

```text
upstream connect error or disconnect/reset before headers. reset reason: connection failure
```

Or:

```text
no healthy upstream
```

These come from the Envoy proxy, not from your application. In many cases the request never made it to your backend service; in reset cases, Envoy may have connected to the upstream but did not receive response headers.

## Step 1: Check if the Upstream Service is Healthy

The most basic cause is that the destination service is down:

```bash
# Check if the target pods are running

kubectl get pods -n production -l app=orders-service

# Check if the service has EndpointSlices
kubectl get endpointslice -n production -l kubernetes.io/service-name=orders-service

# Check if the pods are ready
kubectl get pods -n production -l app=orders-service -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}'
```

If there are no ready endpoints, the service has no healthy pods backing it. Fix the pod health issues first.

## Step 2: Check Envoy Endpoints

Even if Kubernetes shows healthy endpoints, Envoy might have a different view:

```bash
# Check what endpoints Envoy knows about
istioctl proxy-config endpoints <client-pod> -n production \
  --cluster "outbound|8080||orders-service.production.svc.cluster.local"
```

Look at the health status of each endpoint. If they all show as `UNHEALTHY`, Envoy does not consider any endpoint usable.

## Step 3: Check for Port Mismatches

A very common cause of 503s is a mismatch between the port your service listens on and the port configured in the Kubernetes Service:

```bash
# Check what port the service exposes
kubectl get svc orders-service -n production -o jsonpath='{.spec.ports[*]}'

# Check what port the container is listening on
kubectl exec <pod-name> -n production -c orders-service -- ss -tlnp
```

Also check the protocol naming. Istio uses the service port name, or the Kubernetes `appProtocol` field, to determine the protocol:

```yaml
# Correct: port name indicates protocol
apiVersion: v1
kind: Service
metadata:
  name: orders-service
spec:
  ports:
    - name: http
      port: 8080
      targetPort: 8080
    - name: grpc
      port: 9090
      targetPort: 9090
```

If the protocol is not specified and Istio cannot automatically detect it, Istio treats the traffic as opaque TCP. That can break HTTP-specific routing or gateway behavior.

## Step 4: Check DestinationRule Conflicts

A DestinationRule with TLS settings can cause 503s if it does not match the actual service configuration:

```bash
# Check for DestinationRules affecting the service
kubectl get destinationrule -n production -o yaml | grep -A 20 "host: orders-service"
```

A common mistake is forcing mTLS in a DestinationRule when the destination is not part of the mesh or is not expecting mTLS:

```yaml
# This can cause 503s if the destination does not expect mTLS
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: orders-service
spec:
  host: orders-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

If the destination pod does not have a sidecar, the mTLS connection will fail. Remove the TLS setting or add a sidecar to the destination:

```yaml
# Use DISABLE if the destination does not have a sidecar
trafficPolicy:
  tls:
    mode: DISABLE
```

## Step 5: Check Connection Pool Settings

Overly restrictive connection pool settings in a DestinationRule can cause 503s under load:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: orders-service
spec:
  host: orders-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 10  # Too low for high traffic
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 1  # Forces new connection per request
```

If `maxConnections` is too low, excess requests will get 503 responses. Check if this is happening:

```bash
# Check for overflow (rejected connections)
istioctl proxy-config clusters <client-pod> -n production -o json | \
  jq '.[] | select(.name | contains("orders-service")) | .circuitBreakers'
```

Increase the limits:

```yaml
trafficPolicy:
  connectionPool:
    tcp:
      maxConnections: 1000
    http:
      h2UpgradePolicy: DEFAULT
      maxRequestsPerConnection: 0  # Unlimited
```

## Step 6: Check Circuit Breaker Settings

Outlier detection (circuit breaking) can eject endpoints that it considers unhealthy:

```bash
# Check outlier detection configuration
kubectl get destinationrule orders-service -n production -o yaml | grep -A 10 outlierDetection
```

If outlier detection is too aggressive, it might eject all endpoints:

```yaml
# This is very aggressive and might eject healthy endpoints
outlierDetection:
  consecutive5xxErrors: 1
  interval: 5s
  baseEjectionTime: 30s
```

Relax the settings:

```yaml
outlierDetection:
  consecutive5xxErrors: 5
  interval: 30s
  baseEjectionTime: 30s
  maxEjectionPercent: 50  # Never eject more than 50% of endpoints
```

## Step 7: Check Access Logs

Enable access logs and look at the response flags:

```bash
kubectl logs <client-pod> -c istio-proxy -n production | grep "orders-service"
```

The response flags tell you what happened:

- `UF`: Upstream connection failure
- `UO`: Upstream overflow (circuit breaker)
- `NR`: No route configured
- `URX`: Upstream retry limit exceeded
- `UC`: Upstream connection termination
- `DC`: Downstream connection termination

```bash
# Filter for 503 responses
kubectl logs <client-pod> -c istio-proxy -n production | grep " 503 "
```

## Step 8: Check for Sidecar Configuration

A Sidecar resource might be restricting which services are visible:

```bash
# Check for Sidecar resources
kubectl get sidecar -n production -o yaml
```

If a Sidecar resource limits egress to specific hosts, and the target service is not included, you will get 503s:

```yaml
# This restricts which services the sidecar can reach
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
      # orders-service in another namespace would not be reachable
```

Add the missing namespace or host:

```yaml
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "other-namespace/*"
```

## Step 9: Test Direct Connectivity

Compare a non-mesh client with an injected client to confirm whether the service is reachable outside of Envoy:

```bash
# Test from a temporary pod without sidecar injection
kubectl run tmp-curl -n production --rm -it --restart=Never --image=curlimages/curl \
  --overrides='{"metadata":{"annotations":{"sidecar.istio.io/inject":"false"}}}' -- \
  curl -v http://target-service:8080/health

# Test from an injected application container (this goes through Envoy)
kubectl exec <client-pod> -c <app-container> -n production -- \
  curl -v http://target-service:8080/health
```

If the non-mesh client works but the injected client fails, the issue is likely in the Envoy or Istio configuration.

## Quick Diagnostic Summary

When you see a 503 in Istio, run through this checklist:

```bash
# 1. Target pods healthy?
kubectl get pods -n production -l app=orders-service

# 2. EndpointSlices registered?
kubectl get endpointslice -n production -l kubernetes.io/service-name=orders-service

# 3. Envoy knows about endpoints?
istioctl proxy-config endpoints <client-pod> -n production | grep orders-service

# 4. Port naming correct?
kubectl get svc orders-service -n production -o yaml

# 5. DestinationRule causing issues?
kubectl get destinationrule -n production

# 6. Sidecar restricting access?
kubectl get sidecar -n production

# 7. Access logs showing what?
kubectl logs <client-pod> -c istio-proxy -n production --tail=20
```

Most 503 errors come down to missing endpoints, port mismatches, or DestinationRule conflicts. Work through the checklist systematically and you will find the cause.
