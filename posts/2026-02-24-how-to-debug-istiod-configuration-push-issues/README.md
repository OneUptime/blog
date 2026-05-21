# How to Debug Istiod Configuration Push Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, XDS, Debugging, Configuration

Description: How to identify and resolve issues where istiod fails to push configuration updates to Envoy proxies, causing stale routes, missing endpoints, or broken traffic rules.

---

When you apply a VirtualService or DestinationRule and nothing happens, the problem is usually in the configuration push pipeline. Istiod receives the change from Kubernetes but fails to push the updated xDS configuration to the affected Envoy proxies. The result is stale routing rules, missing services, or security policies that do not take effect.

Debugging push issues requires understanding the push pipeline and knowing where to look at each stage.

## Symptoms of Push Problems

Before debugging, confirm you actually have a push issue:

- You applied a VirtualService but traffic is not being routed according to the new rules
- `istioctl proxy-status` shows proxies as `STALE` instead of `SYNCED`
- New services are not reachable from within the mesh
- Authorization policies are not being enforced

## Step 1: Check Proxy Sync Status

The first command to run is always:

```bash
istioctl proxy-status
```

Example output:

```text
NAME                                 CLUSTER        CDS     LDS     EDS     RDS     ECDS
productpage-v1-abc123.default        Kubernetes     SYNCED  SYNCED  SYNCED  SYNCED  NOT SENT
reviews-v1-def456.default            Kubernetes     SYNCED  STALE   SYNCED  STALE   NOT SENT
ratings-v1-ghi789.default            Kubernetes     SYNCED  SYNCED  SYNCED  SYNCED  NOT SENT
```

In this example, `reviews-v1` has stale LDS and RDS configurations, meaning istiod generated new listener and route config but the proxy has not received or acknowledged it.

Possible reasons for STALE status:
- The push is still in progress (give it a few seconds)
- The gRPC connection between the proxy and istiod is broken
- Istiod is overloaded and push is throttled
- The proxy rejected the configuration (ACK/NACK)

## Step 2: Check istiod Push Metrics

Istiod exposes metrics about the push process:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep -E "pilot_xds|pilot_total_xds"
```

Key metrics:

```text
# Total pushes

pilot_xds_pushes{type="cds"} 1523
pilot_xds_pushes{type="eds"} 8234
pilot_xds_pushes{type="lds"} 1523
pilot_xds_pushes{type="rds"} 1523

# Push send errors and proxy rejections
pilot_xds_pushes{type="cds_senderr"} 0
pilot_xds_pushes{type="lds_senderr"} 3
pilot_total_xds_rejects 3

# Push time
pilot_xds_push_time_bucket{type="rds",le="0.01"} 1400
pilot_xds_push_time_bucket{type="rds",le="0.1"} 1520
pilot_xds_push_time_bucket{type="rds",le="1"} 1523

# Connected proxies
pilot_xds{version="1.30.0"} 150
```

If the `_senderr` series on `pilot_xds_pushes` or `pilot_total_xds_rejects` is increasing, pushes are failing or proxies are rejecting configuration. If `pilot_xds_push_time` shows high latency (above 1 second), istiod is struggling.

## Step 3: Check istiod Logs

Enable debug logging for push-related issues:

```bash
istioctl admin log --level ads:debug,model:debug
```

Then check the logs:

```bash
kubectl logs -n istio-system deploy/istiod --tail=200 | grep -i "push\|error\|nack"
```

Common log messages and what they mean:

**"Push debounce stable"**: Istiod collected changes and is starting a push cycle. Normal.

**"Pushing ... for ..."**: The push is being sent to a specific proxy. Normal.

**"ADS: NACK"**: The proxy rejected the configuration. This usually means istiod generated invalid Envoy config. Check what resource was NACKed.

**"Failed to push"**: The gRPC connection to the proxy failed. The proxy might have disconnected.

**"Push took Xs"**: If X is large (>5 seconds), istiod is overloaded.

## Step 4: Compare Intended vs. Actual Config

Check the diff between the configuration Envoy has loaded and the configuration Istiod would send:

```bash
istioctl proxy-status productpage-v1-abc123.default
```

Then inspect the route configuration the proxy actually has:

```bash
istioctl proxy-config routes productpage-v1-abc123.default -o json
```

You can also compare this with the raw Envoy admin config dump:

```bash
kubectl exec productpage-v1-abc123 -c istio-proxy -- curl -s localhost:15000/config_dump | jq '.configs[] | select(."@type" | contains("RoutesConfigDump"))'
```

If these differ, the push has not arrived or was rejected.

## Step 5: Check gRPC Connection Health

Each proxy maintains a gRPC connection to istiod for xDS updates. If this connection is broken, pushes cannot be delivered.

Check connections from istiod's perspective:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/connections | jq '.totalClients'
```

Check connection status from the proxy side:

```bash
kubectl exec productpage-v1-abc123 -c istio-proxy -- curl -s localhost:15000/clusters | grep xds-grpc
```

If the proxy cannot reach istiod, you will see connection errors. Common causes:
- istiod service endpoint has changed
- Network policy blocking traffic to istio-system
- istiod pod was rescheduled to a different node

If a proxy is stuck and needs a clean reconnect, restart the workload pod so the sidecar establishes a new xDS stream:

```bash
kubectl delete pod productpage-v1-abc123
```

This is disruptive for that workload pod, so use it only after confirming the xDS connection is unhealthy.

## Step 6: Check for Configuration Errors

Invalid Istio resources can cause push failures. Use the analyzer:

```bash
istioctl analyze --all-namespaces
```

Common configuration errors:
- VirtualService referencing a non-existent Gateway
- DestinationRule with a host that does not match any service
- Conflicting VirtualServices for the same host

Check the specific resource:

```bash
istioctl validate -f my-virtualservice.yaml
```

## Step 7: Check Push Debouncing

Istiod debounces configuration changes to avoid pushing on every single event. The debounce period is 100ms by default, with a max of 10 seconds. If many changes happen in quick succession (like during a deployment rollout), pushes are batched.

Check debounce behavior:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep pilot_debounce
```

```text
pilot_debounce_time_bucket{le="0.1"} 480
pilot_debounce_time_bucket{le="1"} 520
pilot_debounce_time_bucket{le="10"} 523
```

If `pilot_debounce_time` is consistently near 10 seconds, changes are coming in so fast that istiod is staying close to the maximum debounce window. This is normal during deployments but should not be permanent.

## Step 8: Check Resource Pressure

If istiod is running out of CPU or memory, push latency increases and eventually pushes fail:

```bash
kubectl top pod -n istio-system -l app=istiod
```

```text
NAME                      CPU(cores)   MEMORY(bytes)
istiod-abc123-xyz789      950m         1800Mi
```

If CPU is near the limit, istiod cannot process pushes fast enough. If memory is near the limit, istiod might be OOM-killed during a push.

Increase resources:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
```

## Step 9: Force a Push

If you need to force istiod to re-push all configuration (nuclear option):

```bash
kubectl rollout restart deployment istiod -n istio-system
```

This restarts istiod, which causes all proxies to reconnect and receive a full configuration push. Use this as a last resort, as it temporarily disrupts the control plane.

A less disruptive option is to trigger a push by making a no-op change to an Istio resource:

```bash
kubectl annotate virtualservice my-vs -n my-namespace debug-push=$(date +%s) --overwrite
```

## Quick Debugging Checklist

1. `istioctl proxy-status` - Any STALE proxies?
2. `pilot_xds_pushes{type="*_senderr"}` or `pilot_total_xds_rejects` metrics - Any push errors or NACKs?
3. `kubectl logs istiod` - Any NACK messages?
4. `istioctl analyze` - Any configuration errors?
5. `kubectl top pod istiod` - Resource pressure?
6. `istioctl proxy-config` vs actual config dump - Config mismatch?

Most push issues come down to either invalid configuration, resource pressure on istiod, or broken gRPC connections. Work through these steps in order and you will find the root cause.
