# How to Use the Calico KubeControllersConfiguration Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, KubeControllerConfiguration, Kubernetes, Networking, Production, Controller, DevOps

Description: Production patterns for configuring the Calico KubeControllersConfiguration resource in real Kubernetes clusters of varying sizes and complexity.

---

## Introduction

The KubeControllersConfiguration resource directly affects how quickly your Calico deployment responds to Kubernetes changes, how much API server load it generates, and whether host-level security policies are enforced. In production clusters, the default configuration often needs tuning based on cluster size, workload churn rate, and security requirements.

Small development clusters may work fine with aggressive reconciliation periods, but a 500-node production cluster with thousands of pods requires careful tuning to avoid overwhelming the Kubernetes API server. Similarly, clusters with strict security requirements need automatic host endpoints enabled, while simpler deployments can leave them disabled.

This guide presents production-tested configurations for different cluster profiles and explains the reasoning behind each setting.

## Prerequisites

- A production Kubernetes cluster with Calico CNI
- `kubectl` and `calicoctl` with cluster admin access
- Monitoring in place for API server latency and calico-kube-controllers health
- An existing KubeControllersConfiguration resource

## Small Cluster Configuration (Under 50 Nodes)

For small clusters, use aggressive reconciliation for fast convergence:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 2m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Disabled
      leakGracePeriod: 10m
    policy:
      reconcilerPeriod: 2m
    workloadEndpoint:
      reconcilerPeriod: 2m
    namespace:
      reconcilerPeriod: 2m
    serviceAccount:
      reconcilerPeriod: 2m
```

All controllers are enabled with short reconciliation periods since the API server can handle the load.

## Large Cluster Configuration (200+ Nodes)

For large clusters, increase reconciler periods to reduce API server pressure:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 15m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Disabled
      leakGracePeriod: 30m
    policy:
      reconcilerPeriod: 10m
    workloadEndpoint:
      reconcilerPeriod: 15m
    namespace:
      reconcilerPeriod: 15m
    serviceAccount:
      reconcilerPeriod: 15m
```

The log severity is set to Warning to reduce log volume. Longer grace periods prevent premature garbage collection of resources during slow API responses.

## Security-Focused Configuration

For clusters that enforce host-level network policies:

```yaml
apiVersion: projectcalico.org/v3
kind: KubeControllersConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  healthChecks: Enabled
  controllers:
    node:
      reconcilerPeriod: 5m
      syncLabels: Enabled
      hostEndpoint:
        autoCreate: Enabled
    policy:
      reconcilerPeriod: 3m
    workloadEndpoint:
      reconcilerPeriod: 5m
    namespace:
      reconcilerPeriod: 5m
    serviceAccount:
      reconcilerPeriod: 5m
```

With `autoCreate: Enabled`, every node automatically gets HostEndpoint resources. This is required for GlobalNetworkPolicy rules that target host traffic. Ensure you have appropriate policies before enabling this:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-node-essential
spec:
  selector: has(projectcalico.org/created-by)
  order: 0
  ingress:
    - action: Allow
      protocol: TCP
      destination:
        ports: [22, 179, 443, 2379, 2380, 6443, 10250]
    - action: Allow
      protocol: UDP
      destination:
        ports: [4789, 8472]
  egress:
    - action: Allow
```

This policy allows essential traffic before automatic host endpoints enforce deny-by-default behavior.

## Monitoring Controller Health

Set up monitoring for the calico-kube-controllers pod:

```bash
# Check health endpoint
kubectl exec -n calico-system deployment/calico-kube-controllers -- wget -qO- http://localhost:9094/readiness

# View controller metrics
kubectl port-forward -n calico-system deployment/calico-kube-controllers 9094:9094 &
curl -s http://localhost:9094/metrics | grep controller
```

## Resource Limits for Controllers

Ensure the controller pod has appropriate resource limits in the deployment:

```bash
# Check current resource configuration
kubectl get deployment calico-kube-controllers -n calico-system -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Recommended resources for large clusters
kubectl patch deployment calico-kube-controllers -n calico-system -p \
  '{"spec": {"template": {"spec": {"containers": [{"name": "calico-kube-controllers", "resources": {"requests": {"cpu": "200m", "memory": "256Mi"}, "limits": {"cpu": "500m", "memory": "512Mi"}}}]}}}}'
```

## Handling Controller Failover

The calico-kube-controllers deployment should run as a single replica with leader election. Verify this is configured:

```bash
kubectl get deployment calico-kube-controllers -n calico-system -o jsonpath='{.spec.replicas}'
```

If your cluster requires high availability, the controller supports leader election natively. The standby pod remains idle until the active pod fails.

## Verification

Validate your production configuration is working:

```bash
# Verify the configuration
calicoctl get kubecontrollersconfiguration default -o yaml

# Check controller pod status and uptime
kubectl get pods -n calico-system -l k8s-app=calico-kube-controllers -o wide

# Look for reconciliation activity in logs
kubectl logs -n calico-system -l k8s-app=calico-kube-controllers --tail=20

# If host endpoints are enabled, verify they exist for all nodes
NODE_COUNT=$(kubectl get nodes --no-headers | wc -l)
HEP_COUNT=$(calicoctl get hostendpoints --no-headers 2>/dev/null | wc -l)
echo "Nodes: $NODE_COUNT, Host Endpoints: $HEP_COUNT"

# Verify sync status by checking node labels
calicoctl get nodes -o wide
```

## Troubleshooting

- If API server latency increases after a configuration change, increase reconciler periods or reduce the number of enabled controllers
- For controller pod OOM kills, increase the memory limit and check whether Debug logging was accidentally left enabled
- If host endpoints are missing for some nodes, check that those nodes have calico-node running and reporting status
- When namespace or serviceAccount controller labels are not appearing in Calico resources, verify the controller is enabled and check RBAC permissions
- For clusters with more than 1000 namespaces, the namespace controller may need additional memory to cache all namespace objects

## Conclusion

The KubeControllersConfiguration resource should be tuned based on your cluster profile. Small clusters benefit from aggressive reconciliation, while large clusters need longer periods to avoid API server pressure. Security-focused deployments should enable automatic host endpoints with appropriate safety policies in place. Monitor controller health and resource usage as your cluster grows, and adjust the configuration accordingly.
