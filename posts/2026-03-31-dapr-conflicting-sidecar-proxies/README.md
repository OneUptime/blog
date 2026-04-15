# How to Handle Conflicting Sidecar Proxies with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Mesh, Sidecar, Kubernetes, Troubleshooting

Description: Learn how to resolve conflicts between Dapr sidecars and service mesh proxy sidecars including port conflicts and startup ordering issues.

---

When Dapr and a service mesh both inject sidecar proxies into the same pod, conflicts can arise around port allocation, initialization ordering, and network traffic interception. This guide covers the most common conflict scenarios and how to resolve them.

## Common Conflict Types

1. **Port conflicts**: Dapr and mesh proxies may try to bind the same ports.
2. **Startup ordering**: If the mesh proxy starts before Dapr, the app's network may not be ready.
3. **Traffic interception**: The mesh proxy may intercept Dapr's internal health check calls.
4. **iptables rules**: Both sidecars may configure iptables, causing routing loops.

## Identify Port Conflicts

List all ports used by both sidecars:

```bash
kubectl exec <pod> -- ss -tlnp
```

Dapr default ports:
- 3500: HTTP API
- 50001: gRPC API
- 9090: Metrics
- 7777: Profiling

Istio Envoy default ports:
- 15000: Admin
- 15001: Outbound
- 15006: Inbound
- 15090: Prometheus

If any overlap with your app port, change the app port:

```yaml
annotations:
  dapr.io/app-port: "8080"
```

## Configure Istio to Skip Dapr Ports

Tell Istio's Envoy to exclude Dapr's ports from traffic interception:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "3500,50001"
  traffic.sidecar.istio.io/excludeOutboundPorts: "3500,50001"
```

This prevents Envoy from intercepting Dapr-to-Dapr internal traffic while still routing app-to-app traffic through the mesh.

## Fix Startup Ordering Issues

Configure Istio to hold application containers until the proxy is ready:

```yaml
annotations:
  proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

This ensures Envoy is fully initialized before your application and Dapr sidecar start receiving traffic.

Alternatively, use a `postStart` lifecycle hook on the application container to wait for the mesh proxy:

```yaml
spec:
  containers:
  - name: app
    lifecycle:
      postStart:
        exec:
          command: ['sh', '-c', 'until nc -z localhost 15001; do sleep 1; done']
```

## Resolve iptables Conflicts

If both proxies modify iptables rules, check for rule conflicts:

```bash
kubectl exec <pod> -c istio-proxy -- iptables -t nat -L
```

For targeted control, use port exclusion annotations to prevent iptables conflicts on Dapr's ports:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "3500,50001"
  traffic.sidecar.istio.io/excludeOutboundPorts: "3500,50001"
```

This ensures Istio's iptables rules do not intercept traffic on Dapr's API ports, avoiding routing conflicts between the two sidecars.

## Handle Health Check Conflicts

Service mesh probes and Dapr health checks can conflict. Configure separate health check ports:

```yaml
annotations:
  dapr.io/app-health-check-path: "/health"
  dapr.io/app-health-probe-interval: "30"
  dapr.io/app-health-probe-timeout: "500"
```

And tell Istio to exclude the health check port from interception:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "8081"
```

## Verify No Conflicts After Configuration

```bash
# Check all containers started successfully
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].ready}'

# Verify Dapr sidecar health
kubectl exec <pod> -- curl -s http://localhost:3500/v1.0/healthz

# Verify mesh proxy health
kubectl exec <pod> -c istio-proxy -- pilot-agent request GET healthz/ready
```

## Summary

Conflicts between Dapr and service mesh sidecars are manageable through careful port exclusion configuration and startup ordering. Use Istio's port exclusion annotations to prevent Envoy from intercepting Dapr's internal API ports, fix startup ordering with init containers, and verify both sidecars report healthy status after applying changes. Clear separation of responsibilities between Dapr's API layer and the mesh's network layer minimizes ongoing conflicts.
