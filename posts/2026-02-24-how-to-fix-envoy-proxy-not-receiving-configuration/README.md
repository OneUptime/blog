# How to Fix Envoy Proxy Not Receiving Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, xDS, Configuration, Troubleshooting

Description: How to diagnose and resolve issues where the Envoy sidecar proxy is not receiving configuration updates from Istiod.

---

When the Envoy sidecar proxy stops receiving configuration from the Istio control plane, your service mesh essentially stops working for that pod. New routes don't apply, traffic policies don't take effect, and you might see stale routing behavior. Here's how to figure out what's going on and fix it.

## How Envoy Gets Its Configuration

Envoy doesn't read config files. Instead, it connects to Istiod via the xDS (discovery service) protocol and receives configuration dynamically. When you create a VirtualService, DestinationRule, or any Istio resource, Istiod processes it and pushes the relevant config to the connected Envoy proxies.

If this connection breaks, the proxy keeps running with its last known good configuration but won't receive updates.

## Check xDS Sync Status

The first thing to check is whether the proxy is connected and in sync:

```bash
istioctl proxy-status
```

This shows all connected proxies and their sync status. Look for your pod in the output. The columns mean:

- **SYNCED**: The proxy has the latest configuration
- **NOT SENT**: Istiod hasn't sent config to the proxy (usually means no relevant config changes)
- **STALE**: The proxy is connected but hasn't acknowledged the latest config push

If your pod shows STALE or isn't listed at all, there's a connection problem.

## Verify Istiod Is Running

If Istiod is down, no proxy can receive configuration:

```bash
kubectl get pods -n istio-system -l app=istiod
```

Check if it's healthy:

```bash
kubectl logs -l app=istiod -n istio-system --tail=50
```

Look for errors related to certificate provisioning, resource limits, or configuration validation.

## Check the Sidecar Proxy Logs

Look at the istio-proxy container logs for xDS connection errors:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i "xds\|connect\|error\|warn"
```

Common errors you might see:
- `stream error`: The gRPC stream to Istiod broke
- `Connection refused`: Can't reach Istiod at all
- `authentication handshake failed`: Certificate issues
- `resource exhausted`: Istiod is overloaded

## Network Connectivity Between Proxy and Istiod

The sidecar communicates with Istiod on port 15012 (secured with mTLS). If network policies, firewall rules, or service mesh misconfiguration block this, the proxy can't get config.

Test connectivity from the pod:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s -o /dev/null -w "%{http_code}" https://istiod.istio-system.svc:15012/debug/connections
```

If you get no response or a connection refused error, something is blocking the connection.

Check if there are NetworkPolicies that might be blocking egress to the istio-system namespace:

```bash
kubectl get networkpolicy -n my-namespace
```

## Proxy Configuration Is Too Large

If you have thousands of services in your cluster, the Envoy configuration can get massive. Each proxy receives config for every service it might need to talk to. This can cause memory issues and slow config pushes.

Check the config size:

```bash
istioctl proxy-config all <pod-name> -n my-namespace -o json | wc -c
```

If it's enormous (hundreds of megabytes), you need to use the Sidecar resource to limit what each proxy receives:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: my-service-sidecar
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "other-namespace/needed-service.other-namespace.svc.cluster.local"
```

This tells the proxy to only receive configuration for services in the current namespace, the istio-system namespace, and one specific service in another namespace.

## Istiod Resource Limits

If Istiod is hitting its CPU or memory limits, it might not be able to process and push configurations fast enough. Check resource usage:

```bash
kubectl top pod -n istio-system -l app=istiod
```

Compare with the limits:

```bash
kubectl get deployment istiod -n istio-system -o jsonpath='{.spec.template.spec.containers[0].resources}'
```

If Istiod is near its limits, increase them:

```bash
kubectl edit deployment istiod -n istio-system
```

Or scale up the number of Istiod replicas for high-availability:

```bash
kubectl scale deployment istiod -n istio-system --replicas=3
```

## Config Rejected by Envoy

Sometimes Istiod pushes config but Envoy rejects it. This can happen with invalid route configurations, bad regex patterns, or unsupported features.

Check for NACK (negative acknowledgment) in the proxy status:

```bash
istioctl proxy-status <pod-name> -n my-namespace
```

If you see a NACK, check the proxy logs for the rejection reason:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i "nack\|reject"
```

## Sidecar Init Container Issues

The `istio-init` container sets up iptables rules to redirect traffic through the proxy. If it fails, the proxy might be running but not intercepting any traffic.

Check the init container status:

```bash
kubectl describe pod <pod-name> -n my-namespace | grep -A 5 "istio-init"
```

If istio-init failed, the pod's iptables rules aren't set up correctly. This usually happens because of security contexts or missing capabilities:

```yaml
spec:
  template:
    spec:
      initContainers:
      - name: istio-init
        securityContext:
          capabilities:
            add:
            - NET_ADMIN
            - NET_RAW
```

## Pilot-Agent Not Running

The pilot-agent process manages the Envoy proxy lifecycle and handles certificate rotation. If it crashes, the proxy can't reconnect to Istiod.

Check if pilot-agent is running inside the sidecar:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- ps aux | grep pilot-agent
```

If it's not running, check the container logs for crash reasons.

## Config Dump for Debugging

When all else fails, you can dump the entire Envoy configuration to see exactly what the proxy knows:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/config_dump > envoy_config.json
```

This gives you the raw Envoy configuration. You can search through it to verify that your VirtualServices, DestinationRules, and other Istio resources have been translated into Envoy config.

You can also check specific sections:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/config_dump?resource=dynamic_route_configs
```

## Summary

When Envoy isn't receiving configuration, start with `istioctl proxy-status` to see if the proxy is connected and in sync. Check Istiod health, network connectivity between the proxy and Istiod, and look at both proxy and Istiod logs for errors. For large clusters, use the Sidecar resource to limit configuration scope. Most issues come down to either network connectivity problems or Istiod being overwhelmed.
