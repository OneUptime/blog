# How to Fix XDS Connection Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, XDS, Envoy, Control Plane, Troubleshooting

Description: Guide to diagnosing and resolving xDS discovery service connection issues between Envoy sidecars and the Istio control plane.

---

xDS is the protocol that Envoy uses to receive configuration from the Istio control plane (Istiod). When xDS connections fail, your sidecars can't get route updates, certificate refreshes, or endpoint changes. The mesh keeps working with stale config for a while, but eventually things start breaking.

## What Is xDS?

xDS is actually a family of discovery service APIs:

- **LDS** (Listener Discovery Service): What ports to listen on
- **RDS** (Route Discovery Service): How to route requests
- **CDS** (Cluster Discovery Service): Backend service definitions
- **EDS** (Endpoint Discovery Service): Individual pod IP addresses
- **SDS** (Secret Discovery Service): TLS certificates

Istiod serves all of these over a single gRPC connection on port 15012.

## Check Connection Status

The fastest way to see xDS connection health is:

```bash
istioctl proxy-status
```

This shows every connected proxy and its sync state. The columns CDS, LDS, EDS, RDS show the sync status for each xDS type:

- **SYNCED**: Config is up to date
- **NOT SENT**: No config needs to be sent
- **STALE**: Config was sent but not acknowledged

If a proxy isn't in the list at all, it hasn't connected to Istiod.

## gRPC Connection Failures

The xDS connection is a gRPC stream. Common failure symptoms include:

```text
xds stream error: connection refused
```

or:

```text
xds stream disconnected: rpc error: code = Unavailable
```

Check that Istiod is running and the service resolves:

```bash
kubectl get pods -n istio-system -l app=istiod
kubectl get svc istiod -n istio-system
```

From inside the problematic pod, test connectivity:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -sk https://istiod.istio-system.svc:15012/debug/connections
```

If this fails, there's a network issue between the pod and Istiod.

## DNS Resolution Problems

If the proxy can't resolve `istiod.istio-system.svc`, the xDS connection can't be established:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- nslookup istiod.istio-system.svc
```

If DNS fails, check the CoreDNS pods:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

Also check that the istio-system namespace and istiod service exist:

```bash
kubectl get svc istiod -n istio-system
```

## TLS Handshake Failures

The xDS connection is secured with mTLS. If the proxy's certificate is invalid or expired, the TLS handshake fails.

Check certificates on the proxy:

```bash
istioctl proxy-config secret <pod-name> -n my-namespace
```

Look at the expiration dates. If the `default` certificate is expired, pilot-agent failed to rotate it. Check pilot-agent logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i "cert\|sds\|secret"
```

If the root CA doesn't match between the proxy and Istiod, the TLS handshake will also fail. This can happen after a CA migration or if you have multiple Istio installations.

## Istiod Overloaded

When Istiod is handling too many proxies or processing too many configuration changes, it can become slow or unresponsive. This causes xDS pushes to time out or connections to drop.

Check Istiod's resource usage:

```bash
kubectl top pod -n istio-system -l app=istiod
```

Check for push errors in Istiod logs:

```bash
kubectl logs -l app=istiod -n istio-system | grep -i "push\|error\|timeout"
```

You can also check Istiod's debug endpoint for push metrics:

```bash
kubectl exec -n istio-system -l app=istiod -- curl -s localhost:15014/debug/pushStatusJSON
```

If pushes are slow, consider:
- Increasing Istiod resources
- Running multiple Istiod replicas
- Using Sidecar resources to reduce config scope

## Configuration Push Failures

Sometimes Istiod pushes config but specific proxies reject it. This shows as NACK in the sync status.

Get detailed status for a specific proxy:

```bash
istioctl proxy-status <pod-name>.my-namespace
```

Check for config rejection:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i "nack\|rejected\|invalid"
```

Common rejection reasons:
- Invalid regex in VirtualService match rules
- Duplicate listener bindings
- Unsupported Envoy filter configuration

## Stale Endpoints

If EDS (Endpoint Discovery Service) is stale, the proxy uses old pod IPs. This leads to connection errors when pods have been rescheduled.

Check the endpoints the proxy knows about:

```bash
istioctl proxy-config endpoints <pod-name> -n my-namespace --cluster "outbound|8080||my-service.my-namespace.svc.cluster.local"
```

Compare with the actual Kubernetes endpoints:

```bash
kubectl get endpoints my-service -n my-namespace
```

If they don't match, the xDS endpoint push is behind. Check Istiod logs for EDS push errors.

## Connection Throttling

If many pods restart at the same time (like during a deployment), they all try to connect to Istiod simultaneously. This can overwhelm Istiod and cause connection failures.

Check for connection errors around deployment times:

```bash
kubectl logs -l app=istiod -n istio-system | grep -i "connection\|throttle\|limit"
```

Mitigate this by:
1. Using rolling deployments with appropriate surge settings
2. Running multiple Istiod replicas
3. Increasing Istiod's resource limits

## Network Policies Blocking xDS

If you have strict NetworkPolicies, they might block the sidecar from reaching Istiod:

```bash
kubectl get networkpolicy -n my-namespace -o yaml
```

You need to allow egress from any pod with a sidecar to Istiod's port 15012:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istiod
  namespace: my-namespace
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: istio-system
    ports:
    - protocol: TCP
      port: 15012
```

## Proxy Config Log Level

For deeper debugging, increase the xDS-related log level:

```bash
istioctl proxy-config log <pod-name> -n my-namespace --level ads:debug,config:debug
```

Then trigger the issue and check the logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace --tail=100
```

Look for the ADS (Aggregated Discovery Service) messages that show the xDS stream lifecycle.

## Recovery

If a proxy is stuck with stale config and won't reconnect:

1. First try to trigger a reconnect by restarting just the sidecar:
```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- kill 1
```

2. If that doesn't work, restart the entire pod:
```bash
kubectl delete pod <pod-name> -n my-namespace
```

3. After the pod restarts, verify the connection:
```bash
istioctl proxy-status | grep <pod-name>
```

## Summary

xDS connection issues prevent Envoy sidecars from receiving configuration updates. Start debugging with `istioctl proxy-status` to see the overall health of xDS connections. Check network connectivity to Istiod, verify certificates, and look for overload symptoms on the control plane. For large-scale deployments, use Sidecar resources to reduce the config pushed to each proxy and scale Istiod appropriately.
