# How to Debug Connection Reset Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Reset, Debugging, Envoy, TCP

Description: Troubleshoot TCP connection reset issues in Istio service mesh, including idle timeout mismatches, protocol detection failures, and upstream connection problems.

---

Connection resets are one of the most annoying issues to debug because they are intermittent, hard to reproduce, and the error messages are vague. In Istio, a connection reset means that somewhere in the chain (your app, the sidecar proxy, the network, or the destination), a TCP RST packet was sent, killing the connection abruptly instead of closing it gracefully.

The good news is that Istio gives you enough observability to figure out where and why the reset is happening.

## Understanding Connection Resets in Istio

A connection reset in an Istio mesh can happen at several points:

1. The source app sends a request, and the source Envoy sidecar resets it
2. The source Envoy sends a request, and the destination Envoy resets it
3. The destination Envoy forwards the request, and the destination app resets it
4. An idle connection gets cleaned up by one side but the other side does not know

Each scenario has different causes and different fixes.

## Step 1: Check Envoy Access Logs

Enable access logging and look for the reset in the proxy logs:

```bash
# Source side
kubectl logs my-app-xxxxx -c istio-proxy --tail=200

# Destination side
kubectl logs my-service-xxxxx -c istio-proxy --tail=200
```

Look for response flags that indicate a reset:

- **`UC`** - Upstream connection termination (the upstream closed the connection)
- **`DC`** - Downstream connection termination (the downstream closed the connection)
- **`UF`** - Upstream connection failure
- **`UR`** - Upstream request timeout (not a reset, but related)
- **`URX`** - Upstream retry limit exceeded

A log line with the `UC` flag looks like:

```
[2026-02-24T10:00:00.000Z] "GET /api/data HTTP/1.1" 503 UC upstream_reset_before_response_started{connection_termination} - "-" 0 91 5 - "-" "curl/7.88.1" "abc-123" "my-service:8080" "10.244.0.20:8080" outbound|8080||my-service.default.svc.cluster.local 10.244.0.15:48372 10.0.10.50:8080 10.244.0.15:48370 - default
```

The `upstream_reset_before_response_started{connection_termination}` tells you the upstream (destination) killed the connection before sending a response.

## Step 2: Check Idle Timeout Mismatches

One of the most common causes of connection resets in Istio is a mismatch between idle timeouts. If the upstream application has a shorter keep-alive timeout than the Envoy proxy, the app might close idle connections that Envoy still considers alive.

For example:
- Envoy's default idle timeout for HTTP connections is 1 hour
- Your app's HTTP server might have a keep-alive timeout of 60 seconds

When the app closes the connection after 60 seconds of idle time, Envoy might try to reuse it and get a reset.

Fix this by configuring the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 10s
        idleTimeout: 30s
      http:
        idleTimeout: 30s
```

Set the Envoy idle timeout lower than your application's keep-alive timeout. If your app closes connections after 60 seconds, set Envoy to 30 seconds.

## Step 3: Check Protocol Detection Issues

Istio tries to detect the protocol of each connection (HTTP, TCP, gRPC, etc.). If it gets the detection wrong, it can cause resets.

If your service uses a non-standard protocol or a protocol that looks like HTTP but is not, Envoy might try to parse it as HTTP and fail:

```bash
kubectl get svc my-service -o yaml
```

Check the port naming. Istio uses port names to determine the protocol:

```yaml
  ports:
    - name: http    # Istio treats as HTTP
      port: 8080
    - name: tcp     # Istio treats as raw TCP
      port: 9090
    - name: grpc    # Istio treats as gRPC
      port: 50051
```

If your port is named `http` but the app speaks a binary protocol, Envoy will try to parse it as HTTP and likely reset the connection. Rename the port:

```yaml
  ports:
    - name: tcp-myprotocol
      port: 8080
```

## Step 4: Check for HTTP/2 Issues

HTTP/2 connections are multiplexed, and issues with HTTP/2 in Istio can cause resets. Common problems:

- The app only supports HTTP/1.1 but Envoy is trying HTTP/2
- HTTP/2 GOAWAY frames are being sent

Check the DestinationRule for h2UpgradePolicy:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
```

If you suspect HTTP/2 issues, try disabling the upgrade.

## Step 5: Check Connection Pool Settings

Connection pool limits can cause resets when exceeded:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep "cx_pool"
```

Check for overflow:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep overflow
```

If you see overflow counts increasing, the connection pool is full and Envoy is rejecting new connections. Increase the limits:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        http1MaxPendingRequests: 1000
        http2MaxRequests: 1000
```

## Step 6: Check Outlier Detection

Outlier detection (circuit breaking) can eject hosts that return errors, leading to resets if all hosts get ejected:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep "outlier_detection"
```

Look for `ejections_active` and `ejections_total`. If hosts are being ejected, either the hosts are actually unhealthy or the outlier detection settings are too aggressive:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Increase `consecutive5xxErrors` or decrease `maxEjectionPercent` to be less aggressive.

## Step 7: Check for mTLS Handshake Failures

If mTLS is misconfigured, the TLS handshake might fail, which looks like a connection reset from the application's perspective:

```bash
kubectl exec my-app-xxxxx -c istio-proxy -- curl -s localhost:15000/stats | grep ssl
```

Look for `ssl.connection_error` and `ssl.handshake` stats. If handshake failures are increasing, check:

```bash
istioctl x describe pod my-app-xxxxx -n default
istioctl x describe pod my-service-xxxxx -n default
```

Make sure both sides agree on the mTLS mode.

## Step 8: Check Application Health

Sometimes the connection reset is genuinely from the application. Check the application logs:

```bash
kubectl logs my-service-xxxxx -c my-service --tail=100
```

Look for errors like:
- Out of memory
- Thread pool exhaustion
- Database connection pool full
- Application crashes

Also check if the readiness probe is failing:

```bash
kubectl describe pod my-service-xxxxx | grep -A 10 "Readiness"
```

## Quick Diagnostic Script

```bash
#!/bin/bash
POD=$1
echo "=== Checking connection stats ==="
kubectl exec $POD -c istio-proxy -- curl -s localhost:15000/stats | grep -E "cx_connect_fail|cx_destroy|upstream_reset|overflow|ejection"

echo ""
echo "=== Recent access logs with errors ==="
kubectl logs $POD -c istio-proxy --tail=50 | grep -E "5[0-9]{2}|UC|DC|UF"

echo ""
echo "=== Cluster health ==="
istioctl proxy-config endpoints $POD | grep -v HEALTHY
```

Connection resets in Istio typically come from idle timeout mismatches, protocol detection failures, or connection pool exhaustion. Check the Envoy access logs first to determine which side is initiating the reset, then dig into the specific cause from there.
