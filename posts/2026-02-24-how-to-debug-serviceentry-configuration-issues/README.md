# How to Debug ServiceEntry Configuration Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Debugging, Troubleshooting, Kubernetes, Envoy

Description: Systematic guide to debugging Istio ServiceEntry configuration issues including DNS resolution failures, protocol mismatches, and namespace visibility problems.

---

ServiceEntry is one of the most commonly misconfigured Istio resources. You create what looks like a correct ServiceEntry, apply it, and your pods still cannot reach the external service. The error messages are often unhelpful - you get generic connection refused errors, 503 responses, or just timeouts with no clear indication of what went wrong.

This guide walks through a systematic debugging process that covers the most common ServiceEntry issues and how to identify and fix them quickly.

## Step 1: Verify the ServiceEntry Exists

Start with the basics. Confirm the ServiceEntry was created successfully:

```bash
kubectl get serviceentry -n default
```

Check the details:

```bash
kubectl describe serviceentry my-external-api -n default
```

Look for:
- The correct hosts
- The right ports and protocols
- The expected resolution type
- Any events or warnings

If the ServiceEntry is missing, check if it was created in the wrong namespace:

```bash
kubectl get serviceentry --all-namespaces
```

## Step 2: Check if Envoy Received the Configuration

The ServiceEntry is just a Kubernetes resource. What matters is whether istiod processed it and pushed the configuration to Envoy. Use istioctl to inspect the proxy:

```bash
# Check for the cluster (Envoy term for a backend service)
istioctl proxy-config cluster deploy/my-app | grep external-api

# Check for routes
istioctl proxy-config routes deploy/my-app | grep external-api

# Check for endpoints
istioctl proxy-config endpoints deploy/my-app | grep external-api
```

If the cluster does not appear in the output, the ServiceEntry configuration did not make it to Envoy. Common reasons:

- **Namespace mismatch.** The ServiceEntry is in a different namespace and not exported to the workload's namespace.
- **ExportTo restriction.** The ServiceEntry has `exportTo: ["."]` which limits it to its own namespace.
- **Sidecar resource filtering.** A Sidecar resource in the workload's namespace might be filtering out the ServiceEntry.

## Step 3: Test Basic Connectivity

Test from inside the pod to see what error you get:

```bash
# For HTTP/HTTPS services
kubectl exec deploy/my-app -c my-app -- \
  curl -v https://api.example.com/health

# For TCP services
kubectl exec deploy/my-app -c my-app -- \
  nc -zv database.example.com 5432

# For DNS resolution
kubectl exec deploy/my-app -c istio-proxy -- \
  nslookup api.example.com
```

The `-v` flag on curl gives you detailed output including connection attempts, TLS handshake details, and response headers.

## Step 4: Check Envoy Access Logs

Envoy access logs show what happened at the proxy level:

```bash
kubectl logs deploy/my-app -c istio-proxy --tail=100 | grep "api.example.com"
```

Look for the response flags in the access log. These tell you exactly what went wrong:

| Flag | Meaning |
|------|---------|
| `UF` | Upstream connection failure |
| `UH` | No healthy upstream (all endpoints ejected or none found) |
| `NR` | No route configured |
| `URX` | Upstream retry limit exceeded |
| `DC` | Downstream connection termination |
| `UC` | Upstream connection termination |
| `RL` | Rate limited |
| `-` | No flags (successful request) |

**UH (No Healthy Upstream)** is the most common flag for ServiceEntry issues. It means Envoy could not find any endpoints for the destination.

**NR (No Route)** means Envoy does not have a route for this host and port combination. Usually a missing or misconfigured ServiceEntry.

## Step 5: Diagnose Specific Issues

### Issue: 503 with UH Flag

This means Envoy knows about the host but cannot find healthy endpoints.

```bash
# Check endpoint health
istioctl proxy-config endpoints deploy/my-app \
  --cluster "outbound|443||api.example.com"
```

If endpoints show as `UNHEALTHY`:
- DNS resolution might be failing
- Outlier detection might have ejected all endpoints
- The IP addresses in STATIC resolution might be wrong

If no endpoints appear:
- For DNS resolution: Envoy could not resolve the hostname
- For STATIC resolution: you forgot the `endpoints` block

### Issue: Connection Timeout

```bash
# Check if the destination is reachable from the node
kubectl exec deploy/my-app -c istio-proxy -- \
  curl -m 5 -v https://api.example.com
```

If the connection times out even from the proxy container, the issue is network-level (firewall, security group, network policy) and not an Istio configuration problem.

### Issue: Protocol Mismatch

One of the sneakiest bugs. If you set `protocol: HTTP` but the service uses HTTPS, Envoy tries to send HTTP traffic to an HTTPS endpoint and gets garbage back.

Check your port protocol:

```bash
istioctl proxy-config cluster deploy/my-app \
  --fqdn "outbound|443||api.example.com" -o json | grep -A5 "protocol"
```

Common protocol mistakes:
- Using `HTTP` for HTTPS endpoints
- Using `HTTPS` for plain HTTP endpoints
- Using `TCP` when `TLS` is needed (for TLS-encrypted non-HTTP traffic)
- Using `HTTP` for gRPC endpoints (should be `GRPC` or `HTTPS`)

### Issue: Namespace Visibility

ServiceEntries are namespace-scoped by default. Check the exportTo setting:

```bash
kubectl get serviceentry my-api -n production -o jsonpath='{.spec.exportTo}'
```

If it returns `["."]`, the ServiceEntry is only visible in the `production` namespace. Workloads in other namespaces cannot see it.

Fix by setting exportTo to all namespaces:

```yaml
spec:
  exportTo:
    - "*"
```

Or create the ServiceEntry in the same namespace as the workload.

### Issue: Sidecar Resource Filtering

If you have a Sidecar resource in the workload's namespace, it might be filtering out the ServiceEntry's host:

```bash
kubectl get sidecar -n my-namespace -o yaml
```

Check the `egress` section. If it only allows specific hosts, your ServiceEntry's host needs to be in the list:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/api.example.com"  # Must include external hosts
```

## Step 6: Use istioctl analyze

istioctl has a built-in analyzer that catches common configuration issues:

```bash
istioctl analyze -n default
```

This reports problems like:
- ServiceEntries with conflicting hosts
- Missing DestinationRules referenced by VirtualServices
- Protocol mismatches

## Step 7: Check istiod Logs

If the configuration is not reaching Envoy, check istiod:

```bash
kubectl logs deploy/istiod -n istio-system --tail=100 | grep "serviceentry"
```

Look for errors related to:
- Configuration validation failures
- Push errors to specific proxies
- Resource conflicts

## Common Fixes Cheat Sheet

**Problem: Connection refused to external service**
Fix: Create a ServiceEntry with the correct host, port, and protocol.

**Problem: 503 errors**
Fix: Check DNS resolution. Switch from STATIC to DNS if you do not have the right IPs. Check if outlier detection ejected all endpoints.

**Problem: TLS handshake failure**
Fix: Set protocol to HTTPS or TLS for encrypted connections. Check SNI settings in DestinationRule.

**Problem: Works from one pod but not another**
Fix: Check namespace of ServiceEntry and exportTo settings. Check if a Sidecar resource is filtering the host.

**Problem: Intermittent failures**
Fix: Check DNS TTL and refresh rate. The external service might be changing IPs and Envoy has stale DNS cache.

**Problem: Works without Istio sidecar but fails with it**
Fix: Check the outbound traffic policy. In REGISTRY_ONLY mode, you need a ServiceEntry. In ALLOW_ANY mode, the ServiceEntry might have wrong protocol settings that confuse Envoy.

```bash
# Check outbound traffic policy
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

## Automated Debugging Script

Here is a quick script that runs through the most common checks:

```bash
#!/bin/bash
HOST=$1
DEPLOY=$2
NAMESPACE=${3:-default}

echo "=== ServiceEntry Check ==="
kubectl get serviceentry -n $NAMESPACE | grep -i $(echo $HOST | cut -d. -f1)

echo "=== Cluster Check ==="
istioctl proxy-config cluster deploy/$DEPLOY -n $NAMESPACE | grep $HOST

echo "=== Endpoint Check ==="
istioctl proxy-config endpoints deploy/$DEPLOY -n $NAMESPACE | grep $HOST

echo "=== Route Check ==="
istioctl proxy-config routes deploy/$DEPLOY -n $NAMESPACE | grep $HOST

echo "=== Recent Logs ==="
kubectl logs deploy/$DEPLOY -n $NAMESPACE -c istio-proxy --tail=20 | grep $HOST
```

Run it with:

```bash
chmod +x debug-se.sh
./debug-se.sh api.example.com my-app default
```

Debugging ServiceEntry issues is methodical. Start from the Kubernetes resource, verify it reached Envoy, test connectivity, read the access logs, and check for protocol and namespace issues. Nine times out of ten, the problem is one of the common issues covered here.
