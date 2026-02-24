# How to Handle Stale Service Discovery Entries in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Stale Entries, Troubleshooting, Kubernetes

Description: Identify and resolve stale service discovery entries in Istio that cause routing failures, connection errors, and degraded performance.

---

Stale service discovery entries are one of the more frustrating problems in a service mesh. A stale entry means Istio thinks a service endpoint exists when it doesn't, or it thinks an endpoint is at an IP address that's been reassigned to something else. The result is failed connections, timeouts, and mysterious intermittent errors that are hard to reproduce.

## How Stale Entries Happen

There are several ways stale entries creep into Istio's service registry:

**Pod termination without graceful shutdown**: When a pod is killed (OOMKilled, node failure, force-deleted), it might be removed from the Kubernetes endpoints list before the Envoy proxy stops sending traffic to it. During this window, requests fail.

**DNS caching**: ServiceEntry resources with `resolution: DNS` can have stale IP addresses if the DNS record changes but the cached TTL hasn't expired.

**Slow endpoint propagation**: When a pod is terminated, the Kubernetes endpoints controller removes it, istiod picks up the change, and pushes it to all proxies. This takes time, and during that window, some proxies still have the old endpoint.

**Orphaned WorkloadEntry resources**: For VM workloads, if the VM is shut down but the WorkloadEntry isn't removed, Istio keeps routing traffic to a dead address.

**Multi-cluster lag**: In multi-cluster setups, changes in one cluster take time to propagate to the other cluster's service registry.

## Detecting Stale Entries

The first sign of stale entries is usually connection errors in your application logs or a spike in 503 responses:

```
sum(rate(istio_requests_total{response_code="503",reporter="source"}[5m])) by (destination_workload)
```

A 503 with the response flag `UH` (Upstream Host unhealthy) or `UF` (Upstream connection failure) often indicates stale endpoints.

Check the Envoy access logs for more detail:

```bash
kubectl logs deploy/caller-service -c istio-proxy -n frontend | grep "503"
```

Look for the response flags:
- `UH`: No healthy upstream
- `UF`: Upstream connection failure
- `URX`: Upstream retry limit exceeded
- `DC`: Downstream connection termination

## Checking for Stale Endpoints

Compare what Istio thinks the endpoints are with what Kubernetes reports:

```bash
# What Kubernetes says
kubectl get endpoints my-service -n backend -o jsonpath='{.subsets[*].addresses[*].ip}'

# What Istio's proxy sees
istioctl proxy-config endpoint deploy/caller-service -n frontend | grep my-service
```

If the proxy shows IP addresses that aren't in the Kubernetes endpoints, those are stale. The proxy hasn't received the update yet.

Check istiod's view:

```bash
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/debug/endpointz | python3 -m json.tool | grep -B 2 -A 5 "my-service"
```

## Fixing Stale DNS Entries

For ServiceEntry resources that use DNS resolution, stale entries come from expired DNS caches. Force a re-resolution by restarting the affected proxy:

```bash
kubectl rollout restart deploy/caller-service -n frontend
```

For a less disruptive approach, use Istio's DNS proxy with shorter effective TTL by controlling the upstream DNS cache:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf
        cache 10
        loop
        reload
        loadbalance
    }
```

Reducing the DNS cache from 30 seconds to 10 seconds means stale DNS entries clear faster.

## Handling Stale Entries During Deployments

Rolling deployments are the most common source of transient stale entries. When a pod is terminated, there's a race between:

1. The pod receiving the SIGTERM signal
2. The endpoints controller removing the pod from the endpoints list
3. Istiod propagating the change to all proxies
4. All proxies draining connections to the old pod

You can minimize this with proper graceful shutdown configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: my-service
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The `preStop` hook adds a 5-second delay before the container receives SIGTERM. This gives time for the endpoint removal to propagate through the mesh before the pod actually starts shutting down.

Additionally, configure the Envoy proxy to drain connections gracefully:

```yaml
apiVersion: networking.istio.io/v1
kind: ProxyConfig
metadata:
  name: default
  namespace: istio-system
spec:
  drainDuration: 45s
  terminationDrainDuration: 5s
```

## Using Outlier Detection to Handle Stale Endpoints

Even if stale entries exist, you can prevent them from causing failures with outlier detection. This automatically removes endpoints that return errors:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: backend
spec:
  host: my-service.backend.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutiveGatewayErrors: 1
      interval: 5s
      baseEjectionTime: 30s
      maxEjectionPercent: 100
```

`consecutiveGatewayErrors: 1` means a single connection failure ejects the endpoint. The `interval: 5s` checks frequently. `maxEjectionPercent: 100` allows all endpoints to be ejected (be careful with this; it means the service becomes unavailable if all endpoints are failing).

A more conservative setting:

```yaml
outlierDetection:
  consecutive5xxErrors: 3
  consecutiveGatewayErrors: 2
  interval: 10s
  baseEjectionTime: 30s
  maxEjectionPercent: 50
```

## Cleaning Up Orphaned WorkloadEntry Resources

For VM workloads, check for WorkloadEntry resources that point to VMs that no longer exist:

```bash
kubectl get workloadentry -A
```

For each entry, verify the VM is still reachable:

```bash
kubectl get workloadentry legacy-api-vm1 -n backend -o jsonpath='{.spec.address}'
# Then check if that IP is still active
```

Remove orphaned entries:

```bash
kubectl delete workloadentry legacy-api-vm1 -n backend
```

If you're using auto-registration, Istio should clean up entries when the VM's agent disconnects. But if the VM crashes without disconnecting cleanly, the entry can linger. Set up health checks in the WorkloadGroup to handle this:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: legacy-api
  namespace: backend
spec:
  probe:
    httpGet:
      path: /health
      port: 8080
    periodSeconds: 10
    failureThreshold: 3
```

## Preventing Stale Entries in Multi-Cluster Setups

Multi-cluster service discovery introduces additional propagation delay. Changes in cluster A need to flow through:

1. Cluster A's Kubernetes API
2. Cluster B's istiod (which watches Cluster A's API via remote secret)
3. Cluster B's proxy configuration

This can take several seconds. To minimize impact:

Configure shorter health check intervals in DestinationRules for cross-cluster services:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cross-cluster-service
  namespace: backend
spec:
  host: my-service.backend.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutiveGatewayErrors: 1
      interval: 5s
      baseEjectionTime: 15s
```

Monitor remote cluster connectivity:

```bash
kubectl logs deploy/istiod -n istio-system | grep "remote cluster"
```

If the connection to the remote cluster drops, all remote endpoints become stale until the connection is restored.

## Automated Stale Entry Detection

Set up a monitoring job that regularly compares proxy endpoints with Kubernetes endpoints:

```bash
#!/bin/bash
for svc in $(kubectl get svc -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  NS=$(echo $svc | cut -d'/' -f1)
  NAME=$(echo $svc | cut -d'/' -f2)
  K8S_EPS=$(kubectl get endpoints $NAME -n $NS -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | tr ' ' '\n' | sort)
  if [ -z "$K8S_EPS" ]; then
    continue
  fi
  # Compare with a sample proxy's endpoint list
  PROXY_EPS=$(istioctl proxy-config endpoint deploy/sample-client -n default 2>/dev/null | grep "$NAME.$NS" | awk '{print $1}' | cut -d':' -f1 | sort)
  STALE=$(comm -23 <(echo "$PROXY_EPS") <(echo "$K8S_EPS"))
  if [ ! -z "$STALE" ]; then
    echo "STALE endpoints for $svc: $STALE"
  fi
done
```

Run this periodically and alert on any findings.

Stale service discovery entries are an inherent challenge in distributed systems. You can't eliminate them entirely, but you can minimize their impact with proper graceful shutdown, outlier detection, and monitoring. The goal is to detect and recover from stale entries before they cause noticeable user impact.
