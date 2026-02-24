# How to Set Up Istio with Multiple Replicas of Istiod

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Replicas, High Availability, Kubernetes

Description: A step-by-step guide to running multiple Istiod replicas for redundancy and how proxies distribute across control plane instances.

---

Running a single istiod instance is fine for testing, but in production you absolutely need multiple replicas. If that one instance goes down, your proxies lose their connection to the control plane. They will keep running with their last known configuration, but they will not get updates, new certificates, or be able to configure new pods. Setting up multiple replicas is straightforward, but there are some details about how proxies connect to replicas that are worth understanding.

## How Proxy-to-Istiod Connections Work

Each Envoy proxy maintains a persistent gRPC connection to one istiod instance. This connection is used for:

- xDS configuration updates (routes, clusters, listeners, endpoints)
- Certificate signing requests and renewals
- Health reporting

When you have multiple istiod replicas behind a Kubernetes Service, the initial connection is load-balanced across replicas. But because gRPC uses long-lived connections, the distribution is not perfectly even - it depends on when each proxy connected.

If the istiod replica a proxy is connected to goes down, the proxy reconnects to a different replica through the Service. During this reconnection window (usually a few seconds), the proxy continues serving traffic with its last known configuration.

## Setting Up Multiple Replicas

The simplest way is through IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-multi-replica
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

Install:

```bash
istioctl install -f istio-multi-replica.yaml
```

Verify all replicas are running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

You should see 3 pods:

```
NAME                      READY   STATUS    RESTARTS   AGE
istiod-7b69f6b4c8-abc12   1/1     Running   0          2m
istiod-7b69f6b4c8-def34   1/1     Running   0          2m
istiod-7b69f6b4c8-ghi56   1/1     Running   0          2m
```

## Using Helm

If you manage Istio with Helm:

```bash
helm upgrade istiod istio/istiod -n istio-system \
  --set replicaCount=3 \
  --set resources.requests.cpu=500m \
  --set resources.requests.memory=1Gi \
  --set resources.limits.cpu=2000m \
  --set resources.limits.memory=4Gi
```

## Checking Proxy Distribution

After setting up multiple replicas, check how proxies are distributed across them:

```bash
# Check which istiod each proxy is connected to
istioctl proxy-status
```

The output shows which istiod instance each proxy is connected to:

```
NAME                     CLUSTER   CDS   LDS   EDS   RDS   ECDS   ISTIOD
app-1-pod.default        ...       SYNCED SYNCED SYNCED SYNCED ...    istiod-7b69f6b4c8-abc12
app-2-pod.default        ...       SYNCED SYNCED SYNCED SYNCED ...    istiod-7b69f6b4c8-def34
app-3-pod.default        ...       SYNCED SYNCED SYNCED SYNCED ...    istiod-7b69f6b4c8-ghi56
```

For a count of proxies per istiod replica:

```bash
istioctl proxy-status | awk '{print $NF}' | sort | uniq -c | sort -rn
```

## Load Balancing Considerations

Kubernetes Services use round-robin for new connections. Since gRPC connections are long-lived, you might see uneven distribution. This is normal and usually not a problem because:

1. Each istiod replica can handle many proxies
2. When pods restart, they reconnect and naturally rebalance
3. The load per proxy is typically small and similar across proxies

If you see very uneven distribution and it is causing performance issues, you can force rebalancing by restarting some proxies:

```bash
# Restart a deployment to force proxy reconnections
kubectl rollout restart deployment my-service -n default
```

## Ensuring Replicas Are Spread Across Nodes

Add pod anti-affinity to prevent all replicas from landing on the same node:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: istiod
                topologyKey: kubernetes.io/hostname
```

Verify the spread:

```bash
kubectl get pods -n istio-system -l app=istiod -o wide
```

You should see each pod on a different node.

## Adding a Pod Disruption Budget

Prevent Kubernetes from disrupting too many replicas at once:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istiod
```

Or through IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        podDisruptionBudget:
          minAvailable: 2
```

Test that the PDB is working:

```bash
kubectl get pdb -n istio-system
```

## Leader Election Between Replicas

Istiod replicas use leader election for certain tasks. Check the current leader:

```bash
kubectl get lease -n istio-system
```

Typical output:

```
NAME                                           HOLDER                               AGE
istio-leader                                   istiod-7b69f6b4c8-abc12              2h
```

Only the leader handles certain coordination tasks. All replicas handle xDS configuration pushes independently. This means losing the leader temporarily is not critical - a new leader will be elected quickly.

## Configuring Readiness and Liveness Probes

Make sure probes are properly configured so unhealthy replicas are removed from the Service:

```bash
kubectl describe deployment istiod -n istio-system | grep -A15 "Readiness\|Liveness"
```

The default configuration includes:
- Liveness probe on port 15014
- Readiness probe on port 15014

If a replica becomes unhealthy, the readiness probe fails, Kubernetes removes it from the Service, and proxies connected to it reconnect to healthy replicas.

## Scaling Up and Down

You can change the replica count on a running cluster:

```bash
# Scale up
kubectl scale deployment istiod -n istio-system --replicas=5

# Scale down
kubectl scale deployment istiod -n istio-system --replicas=3
```

When scaling down, proxies connected to the terminated replicas automatically reconnect to remaining replicas. This reconnection happens within seconds.

## Monitoring Multiple Replicas

Track per-replica metrics to ensure no single replica is overloaded:

```promql
# CPU usage per replica
rate(container_cpu_usage_seconds_total{
  namespace="istio-system",
  pod=~"istiod.*",
  container="discovery"
}[5m])

# Memory per replica
container_memory_working_set_bytes{
  namespace="istio-system",
  pod=~"istiod.*",
  container="discovery"
}

# Connected proxies per replica
pilot_xds{type="ads"}
```

Set up alerts for uneven load:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istiod-replica-alerts
spec:
  groups:
  - name: istiod-replicas
    rules:
    - alert: IstiodReplicaDown
      expr: |
        count(kube_pod_status_ready{
          namespace="istio-system",
          pod=~"istiod.*",
          condition="true"
        }) < 2
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Fewer than 2 istiod replicas are healthy"
```

## Disaster Recovery

If all istiod replicas go down simultaneously (unlikely but possible):

1. **Existing proxies continue working** with their last known configuration
2. **No new configuration** can be pushed until istiod recovers
3. **Certificate renewals** stop - certificates will eventually expire (default TTL is 24 hours)
4. **New pods** will not get sidecar configuration

Recovery steps:

```bash
# Check why all replicas are down
kubectl describe pods -n istio-system -l app=istiod

# Force restart
kubectl rollout restart deployment istiod -n istio-system

# Verify recovery
istioctl proxy-status
```

## Summary

Running multiple istiod replicas is essential for production stability. Three replicas is a good starting point for most deployments. Use pod anti-affinity to spread them across nodes, pod disruption budgets to prevent simultaneous eviction, and monitoring to track per-replica health. Proxies automatically distribute across replicas and reconnect when replicas fail, making the system resilient to individual instance failures. The key is to have at least 2 healthy replicas at all times so there is always redundancy.
