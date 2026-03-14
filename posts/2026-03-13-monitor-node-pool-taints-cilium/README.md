# Monitor Node Pool Taints with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: Learn how to configure and monitor node pool taints in Cilium-managed Kubernetes clusters, ensuring Cilium correctly handles tainted nodes and that workload scheduling aligns with network policy...

---

## Introduction

Kubernetes node taints control which pods can be scheduled on specific nodes, and Cilium's interaction with tainted nodes requires careful configuration. When node pools have taints - for example, GPU nodes, spot instances, or dedicated system nodes - Cilium must have tolerations to ensure its DaemonSet pods can still run on all tainted nodes, maintaining network policy enforcement and pod connectivity across the entire cluster.

Monitoring node pool taints with Cilium involves verifying that Cilium agents are running on all nodes regardless of their taints, ensuring that network policies correctly target pods on tainted nodes, and validating that Cilium's identity model correctly reflects pods deployed with specific node pool tolerations.

This guide covers configuring Cilium to handle node pool taints, monitoring Cilium agent coverage across all tainted nodes, and validating network policy enforcement on tainted node pools.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+ installed
- `kubectl` with cluster-admin access
- `cilium` CLI v0.15+ installed
- Node pools with existing or planned taints
- Hubble for flow observability

## Step 1: Verify Cilium DaemonSet Tolerations

Confirm that the Cilium DaemonSet has tolerations that allow it to run on all tainted nodes.

Check existing Cilium DaemonSet tolerations:

```bash
# View current Cilium DaemonSet tolerations
kubectl get daemonset cilium -n kube-system -o yaml | \
  grep -A20 "tolerations:"

# Check if Cilium has the required tolerations for your node taints
# Common required tolerations:
# - key: "node-role.kubernetes.io/control-plane" effect: "NoSchedule"
# - key: "node.kubernetes.io/not-ready" effect: "NoExecute"
# - key: "node.kubernetes.io/unreachable" effect: "NoExecute"

# List all node taints in the cluster
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
TAINTS:.spec.taints | grep -v "<none>"
```

## Step 2: Add Cilium Tolerations for Custom Node Pool Taints

Update the Cilium DaemonSet to tolerate custom taints applied to node pools.

Add tolerations for custom node pool taints via Helm values:

```yaml
# cilium-tolerations-values.yaml - Helm values to add custom tolerations
tolerations:
- operator: Exists    # Tolerate ALL taints (recommended for DaemonSets)

# OR for specific taints only:
tolerations:
- key: "dedicated"
  operator: "Equal"
  value: "gpu"
  effect: "NoSchedule"
- key: "spot-instance"
  operator: "Exists"
  effect: "NoSchedule"
- key: "node.kubernetes.io/not-ready"
  operator: "Exists"
  effect: "NoExecute"
```

Apply the updated tolerations via Helm upgrade:

```bash
# Upgrade Cilium with new tolerations
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --values cilium-tolerations-values.yaml

# Verify Cilium pods are now running on tainted nodes
kubectl get pods -n kube-system -l k8s-app=cilium -o wide | \
  grep "<tainted-node-name>"
```

## Step 3: Monitor Cilium Agent Coverage

Ensure Cilium is running on every node including tainted ones.

Create a monitoring check for Cilium agent coverage:

```bash
# Check that cilium pods are running on ALL nodes
TOTAL_NODES=$(kubectl get nodes --no-headers | wc -l)
CILIUM_PODS=$(kubectl get pods -n kube-system -l k8s-app=cilium \
  --no-headers | grep Running | wc -l)

echo "Total nodes: $TOTAL_NODES"
echo "Running Cilium pods: $CILIUM_PODS"

if [ "$TOTAL_NODES" -ne "$CILIUM_PODS" ]; then
  echo "WARNING: Cilium is not running on all nodes"
  
  # Find nodes without Cilium
  ALL_NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')
  CILIUM_NODES=$(kubectl get pods -n kube-system -l k8s-app=cilium \
    -o jsonpath='{.items[*].spec.nodeName}')
  
  for node in $ALL_NODES; do
    if ! echo "$CILIUM_NODES" | grep -q "$node"; then
      echo "Missing Cilium on node: $node"
      kubectl get node $node -o jsonpath='{.spec.taints}' | \
        python3 -c "import sys,json; t=json.load(sys.stdin); print('Taints:', t)"
    fi
  done
fi
```

## Step 4: Validate Network Policies on Tainted Node Pools

Ensure CiliumNetworkPolicy correctly targets pods running on tainted nodes.

Create and test policies for tainted node pool workloads:

```yaml
# tainted-node-pool-policy.yaml - policy for pods on dedicated GPU node pool
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: gpu-workload-policy
  namespace: ml-workloads
spec:
  # Target pods with the GPU node pool toleration (identified by label)
  endpointSelector:
    matchLabels:
      workload-type: gpu-training
  ingress:
  - fromEndpoints:
    - matchLabels:
        workload-type: gpu-coordinator   # Only allow coordinator to access GPU workers
    toPorts:
    - ports:
      - port: "9000"
        protocol: TCP
```

Apply and validate the policy on tainted nodes:

```bash
kubectl apply -f tainted-node-pool-policy.yaml

# Verify Cilium has applied the policy on GPU nodes
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l k8s-app=cilium \
    --field-selector spec.nodeName=<gpu-node> -o name) \
  -- cilium policy get | grep "gpu-workload-policy"
```

## Step 5: Create Taint-Aware Cilium Monitoring Alerts

Set up alerts for Cilium agent failures on tainted nodes.

Configure Prometheus alerting for Cilium coverage on node pools:

```yaml
# cilium-taint-coverage-alerts.yaml - ensure Cilium runs on all tainted nodes
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-node-coverage
  namespace: monitoring
spec:
  groups:
  - name: cilium-daemonset-coverage
    rules:
    - alert: CiliumAgentMissingOnNode
      expr: |
        kube_daemonset_status_desired_number_scheduled{daemonset="cilium"} -
        kube_daemonset_status_number_ready{daemonset="cilium"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Cilium agent is not running on all nodes - check node taints"
        description: "{{ $value }} node(s) are missing a running Cilium agent"
```

Apply the alert:

```bash
kubectl apply -f cilium-taint-coverage-alerts.yaml
```

## Best Practices

- Use `tolerations: [{operator: Exists}]` in the Cilium DaemonSet to tolerate all current and future node taints automatically
- Always verify Cilium agent coverage after adding new node pools with custom taints
- Use Hubble to verify that network policies are enforced correctly on pods running on tainted nodes
- Monitor the `kube_daemonset_status_desired_number_scheduled` vs `status_number_ready` gap for the Cilium DaemonSet
- Configure OneUptime checks for services running on tainted node pools to validate end-to-end connectivity

## Conclusion

Node pool taints can inadvertently prevent Cilium from running on specialized nodes, leaving those nodes without network policy enforcement and potentially without pod connectivity. By configuring appropriate tolerations on the Cilium DaemonSet, monitoring agent coverage, and validating policy enforcement on all node pools, you ensure consistent network security across your entire cluster. Use OneUptime to monitor services on tainted node pools and verify that Cilium's networking and policy enforcement are functioning correctly regardless of node taints.
