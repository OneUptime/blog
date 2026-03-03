# How to Use Istiod Introspection (ControlZ) for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, ControlZ, Debugging, Kubernetes, Service Mesh

Description: Learn how to use Istiod's built-in ControlZ introspection interface to debug control plane issues, adjust logging, and inspect internal state.

---

Istiod has a built-in web interface called ControlZ that most people don't know about. It lets you inspect internal state, change log levels on the fly, view environment variables, and examine memory usage - all without restarting the control plane. When you're troubleshooting control plane issues and need real-time visibility into what Istiod is doing, ControlZ is incredibly useful.

## Accessing ControlZ

ControlZ runs on port 9876 inside the Istiod pod. The easiest way to access it is through istioctl:

```bash
istioctl dashboard controlz deployment/istiod -n istio-system
```

This sets up a port-forward and opens your browser to the ControlZ interface. If you prefer to set up port-forwarding manually:

```bash
kubectl port-forward -n istio-system deployment/istiod 9876:9876
```

Then open `http://localhost:9876` in your browser.

## The ControlZ Interface

When you open ControlZ, you'll see several tabs across the top. Each one gives you access to different aspects of Istiod's internal state.

### Logging Scopes

This is probably the most useful feature. Istiod has dozens of logging scopes, each controlling the verbosity for a different subsystem. From the ControlZ UI, you can change any scope's log level without restarting Istiod.

The scopes include:

- **ads** - Aggregated Discovery Service (xDS push/pull)
- **authorization** - Authorization policy processing
- **default** - General logging
- **grpcAdapter** - gRPC adapter communication
- **model** - Service model (services, endpoints)
- **networking** - Networking configuration (VirtualService, DestinationRule)
- **security** - Certificate management and mTLS
- **serviceentry** - ServiceEntry processing
- **validation** - Config validation

Each scope can be set to one of these levels: none, error, warn, info, debug.

For example, if you're debugging why a VirtualService isn't being applied correctly, set the `networking` scope to `debug`. If you're investigating certificate issues, set `security` to `debug`.

### Changing Log Levels via API

You don't need the browser UI. You can change log levels through the ControlZ REST API:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s -X PUT "localhost:9876/scopej/networking" \
  -d '{"name":"networking","outputLevel":"debug"}'
```

Or through port-forwarding:

```bash
kubectl port-forward -n istio-system deployment/istiod 9876:9876 &
curl -X PUT "localhost:9876/scopej/networking" \
  -d '{"name":"networking","outputLevel":"debug"}'
```

To check the current level:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s "localhost:9876/scopej/networking"
```

Response:

```json
{
  "name": "networking",
  "description": "networking scope",
  "outputLevel": "debug",
  "stackTraceLevel": "none",
  "logCallers": false
}
```

### Environment Variables

The Environment tab shows all environment variables set in the Istiod process. This is useful for verifying that your IstioOperator or Helm configuration actually set the environment variables you expected.

Common variables to check:

```text
PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_OUTBOUND=true
PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_INBOUND=true
PILOT_TRACE_SAMPLING=100.0
INJECT_ENABLED=true
CLUSTER_ID=Kubernetes
```

### Memory Stats

The Memory tab shows Go runtime memory statistics, including heap usage, GC statistics, and goroutine counts. This is helpful when you suspect Istiod is under memory pressure.

Key metrics:

- **HeapAlloc** - Current heap memory in use
- **HeapSys** - Total heap memory obtained from the OS
- **NumGC** - Number of garbage collection cycles
- **NumGoroutine** - Active goroutines

If HeapAlloc is close to HeapSys and both are near your memory limit, Istiod needs more memory. If NumGoroutine is unusually high (tens of thousands), there might be a goroutine leak.

### Version Info

Shows the exact Istiod build information:

```text
Version: 1.20.0
GitRevision: abc123def
GolangVersion: go1.21.5
BuildStatus: Clean
```

This confirms which version is actually running, which matters during upgrades when you might have multiple Istiod instances.

## Debug Endpoints Beyond ControlZ

Istiod also exposes debug endpoints on port 15014. These aren't part of ControlZ but complement it well:

```bash
# List all debug endpoints
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug

# Configuration distribution to proxies
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/config_distribution

# All service endpoints
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/endpointz

# Config as known by Istiod
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/configz

# Registered proxy instances
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/registryz

# Push status to proxies
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/push_status

# Sync status for all proxies
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/syncz

# Authentication debug info
kubectl exec -n istio-system deployment/istiod -- curl -s localhost:15014/debug/authenticationz
```

These return JSON that you can pipe through jq for readability:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s localhost:15014/debug/endpointz | python3 -m json.tool
```

## Practical Debugging Workflows

### Debugging Config Push Failures

If proxies are showing STALE in `istioctl proxy-status`, enable debug logging on the ads scope:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s -X PUT "localhost:9876/scopej/ads" \
  -d '{"name":"ads","outputLevel":"debug"}'
```

Then watch the logs:

```bash
kubectl logs -n istio-system deployment/istiod -f --tail=100
```

You'll see detailed messages about config pushes, including which proxies received updates and any errors during the push process. Once you're done debugging, set it back to info:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s -X PUT "localhost:9876/scopej/ads" \
  -d '{"name":"ads","outputLevel":"info"}'
```

### Debugging Certificate Issues

mTLS certificate problems are common during initial mesh setup. Enable security debug logging:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s -X PUT "localhost:9876/scopej/security" \
  -d '{"name":"security","outputLevel":"debug"}'
```

The logs will show certificate signing requests, CA operations, and certificate distribution to workloads. Look for errors related to CSR processing, certificate expiry, or CA bundle mismatches.

### Debugging Service Discovery

If Istiod isn't picking up new services or endpoints, turn up the model logging:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s -X PUT "localhost:9876/scopej/model" \
  -d '{"name":"model","outputLevel":"debug"}'
```

Check the registryz endpoint to see what services Istiod knows about:

```bash
kubectl exec -n istio-system deployment/istiod -- \
  curl -s localhost:15014/debug/registryz | jq '.[].hostname'
```

If your service isn't in the list, there's a problem with Kubernetes service discovery. Check that the Service resource exists and has valid selectors.

## Security Considerations

ControlZ and the debug endpoints expose sensitive information about your mesh configuration. They should not be accessible from outside the cluster. By default, they're only available through port-forwarding or from within the Istiod pod, which is safe.

If you've set up any Ingress or LoadBalancer that might expose Istiod ports, make sure ports 9876 and 15014 are blocked from external access. Applying NetworkPolicies is a good practice:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: istiod-restrict-debug
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: istiod
  ingress:
  - from:
    - namespaceSelector: {}
    ports:
    - port: 15012
    - port: 15017
  - from:
    - podSelector: {}
    ports:
    - port: 9876
    - port: 15014
```

## Summary

ControlZ gives you a live window into Istiod's brain. The ability to change log levels on the fly, without restarting the control plane, is a huge productivity boost during debugging sessions. Combined with the debug endpoints on port 15014, you have complete visibility into what the control plane is doing. Keep these tools in your back pocket for the next time something goes wrong with your mesh.
