# How to Schedule One Pod on Every Eligible Node: DaemonSet vs Anti-Affinity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSet, Scheduling, High Availability

Description: Use DaemonSets for node coverage and anti-affinity for replica separation, then verify eligibility, taints, resource fit, and update behavior.

---

Use a DaemonSet when the desired replica count should follow the number of eligible nodes. A Deployment with required pod anti-affinity can prevent replicas from sharing a host, but it does not create a replica simply because a new node joins.

This matters for node agents. A log collector missing from a newly added node creates an observability gap even if all three replicas of its Deployment are healthy.

## Separate coverage from separation

Suppose a cluster starts with three eligible nodes and a Deployment has three replicas with required hostname anti-affinity. Each node can receive one replica. Add a fourth node and the Deployment still wants three pods. Remove a node and the Deployment still wants three pods, leaving one pending if only two eligible hosts remain.

A DaemonSet tracks eligible nodes instead. Its controller creates pods as those nodes appear and removes pods when they cease to belong to the intended set. The [DaemonSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) describes this controller behavior.

| Desired behavior | Choose |
| --- | --- |
| One node-level agent on each eligible node | DaemonSet |
| A fixed or autoscaled number of application replicas | Deployment |
| Application replicas must use distinct hosts | Deployment with required anti-affinity, with sufficient hosts |
| Balance many replicas over a smaller number of hosts | Deployment with topology spread |

## Define what eligible means

Label only the nodes that should run the example agent. For a real autoscaled pool, set the label through the provider or node provisioning configuration so replacement nodes inherit it.

```bash
kubectl label nodes worker-a worker-b observability.example.com/agent=true
```

This demonstration DaemonSet prints a heartbeat; replace its container with your actual agent configuration when adopting the pattern:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent-demo
spec:
  selector:
    matchLabels:
      app: node-agent-demo
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: node-agent-demo
    spec:
      nodeSelector:
        kubernetes.io/os: linux
        observability.example.com/agent: "true"
      containers:
      - name: heartbeat
        image: busybox:1.37
        command: ["sh", "-c", "while true; do date; sleep 60; done"]
        resources:
          requests:
            cpu: 10m
            memory: 16Mi
          limits:
            memory: 32Mi
```

There is no `replicas` field. Node selection is the coverage policy. Keep the selector in the DaemonSet aligned with its pod labels, and choose an update budget appropriate to the agent's role.

## Tolerations still matter

DaemonSet pods receive several automatic tolerations for node conditions, but arbitrary dedicated-pool and control-plane taints still need deliberate handling. Inspect actual taints before adding tolerations:

```bash
kubectl get nodes -o json | jq '.items[] | {
  node: .metadata.name,
  taints: .spec.taints
}'
```

If the agent must cover a node tainted `dedicated=payments:NoSchedule`, add the corresponding narrow toleration to the template. Avoid copying a keyless `Exists` toleration without considering which additional pools it permits.

Toleration permits placement; node selection defines the intended scope. The [taints and tolerations documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/) explains the matching rules and taint effects.

## Understand why a DaemonSet pod can still be pending

The DaemonSet controller identifies a target node and creates a pod with node affinity for that node. The scheduler still handles placement. Resource shortages, port conflicts, and other hard constraints can prevent it from running.

Therefore, “one per node” describes the controller's desired coverage, not instantaneous guaranteed readiness. Compare desired, current, and ready counts:

```bash
kubectl get daemonset node-agent-demo
kubectl describe daemonset node-agent-demo
kubectl get pods -l app=node-agent-demo -o wide
kubectl get events --field-selector reason=FailedScheduling
```

If desired count is smaller than expected, inspect eligibility and taints. If pods exist but are pending, inspect their scheduling events. If assigned pods are not ready, investigate startup and health checks separately.

Reserve space for the agent when sizing nodes. An agent requesting 100Mi on every node adds 10,000Mi, or about 9.8Gi, of requests across 100 nodes before application workloads are considered. Its resource consumption scales with node count, even when application replica count does not.

## Test node additions and updates

Add a labeled node in a staging pool and verify a new agent appears without changing any replica setting. Remove the eligibility label from a test node and verify coverage changes as intended. Then perform an agent version rollout and measure the longest gap in node coverage.

DaemonSet rolling updates may temporarily leave a node without its agent; configurations permitting surge can temporarily create more than one pod on a node. Account for host ports, host paths, and agents that cannot safely run twice.

Required anti-affinity, described in the [node assignment guide](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/), remains useful for application separation. Use it for that purpose. For node coverage, let a DaemonSet reconcile the desired set and monitor ready coverage against eligible nodes.
