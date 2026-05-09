# How to Troubleshoot Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Troubleshooting, Hard Way

Description: A guide to diagnosing and resolving Typha HA issues including uneven connection distribution, replica scheduling failures, and failover problems in a manually installed Calico cluster.

---

## Introduction

Typha HA issues are subtler than single-replica failures. The most common problems are connection imbalance (Felix agents all connecting to one replica), replicas co-located on the same node despite anti-affinity rules, and PDB blocking maintenance operations. Each requires a different diagnostic approach. The commands below use the `kube-system` namespace from Calico the hard way; adjust the namespace if your Typha deployment is elsewhere.

## Issue 1: All Felix Connections on One Typha Replica

**Symptom:** One Typha replica has all connections, others have zero.

The command below assumes Typha Prometheus metrics are enabled and uses the default metrics port, `9091`.

```bash
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name); do
  echo "=== $pod ===" && kubectl exec -n kube-system $pod -- \
    wget -qO- http://localhost:9091/metrics 2>/dev/null | grep typha_connections_active
done
```

**Cause 1:** Felix connected to one replica at startup and never rebalanced.

**Resolution:** Enable Kubernetes-based rebalancing.

```bash
kubectl set env deployment/calico-typha -n kube-system \
  TYPHA_CONNECTIONREBALANCINGMODE=kubernetes
```

**Cause 2:** Felix is pinned to one Typha address instead of discovering Typha through the Kubernetes Service endpoints.

```bash
kubectl get daemonset calico-node -n kube-system -o yaml | grep -E "FELIX_TYPHAADDR|FELIX_TYPHAK8SSERVICENAME"
```

Resolution: Remove `FELIX_TYPHAADDR` and set `FELIX_TYPHAK8SSERVICENAME=calico-typha`.

## Issue 2: Typha Replicas Scheduled on the Same Node

**Symptom:** Two or more Typha pods on the same node.

```bash
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide | awk '{print $7}' | sort | uniq -d
```

**Cause:** Anti-affinity is configured incorrectly or uses `preferred` when the cluster has fewer nodes than replicas.

```bash
kubectl get deployment calico-typha -n kube-system -o yaml | grep -A20 "affinity:"
```

**Resolution:** Check if there are enough eligible nodes for the anti-affinity rule. If nodes are fewer than replicas, switch to `preferredDuringScheduling`.

```bash
kubectl patch deployment calico-typha -n kube-system --patch '{
  "spec": {"template": {"spec": {"affinity": {
    "podAntiAffinity": {
      "preferredDuringSchedulingIgnoredDuringExecution": [{
        "weight": 100,
        "podAffinityTerm": {
          "labelSelector": {"matchLabels": {"k8s-app": "calico-typha"}},
          "topologyKey": "kubernetes.io/hostname"
        }
      }]
    }
  }}}}
}'
```

## Issue 3: PDB Blocking Node Drain

**Symptom:** `kubectl drain` hangs or reports Typha PDB violation.

```bash
kubectl get pdb calico-typha-pdb -n kube-system
kubectl describe pdb calico-typha-pdb -n kube-system | grep -A5 "Status:"
```

**Resolution:** Scale up Typha temporarily before draining.

```bash
kubectl scale deployment calico-typha -n kube-system --replicas=$(($(kubectl get deployment calico-typha -n kube-system -o jsonpath='{.spec.replicas}') + 1))
kubectl wait --for=condition=Available deployment/calico-typha -n kube-system --timeout=60s
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
kubectl scale deployment calico-typha -n kube-system --replicas=<original>
```

## Issue 4: Typha Replica Fails to Restart After Node Failure

**Symptom:** A Typha pod is in `Pending` state after the node it was on failed.

```bash
kubectl describe pod -n kube-system <pending-typha-pod> | grep -A10 "Events:"
```

**Common causes:**

- Anti-affinity prevents scheduling on the remaining nodes (all have a Typha pod)
- Insufficient resources on remaining nodes

**Resolution:** Check available nodes.

```bash
kubectl get pods -n kube-system -l k8s-app=calico-typha -o wide
kubectl describe node <candidate-node> | grep -A10 "Conditions:\|Taints:"
```

If all nodes have Typha pods due to anti-affinity, remove the `required` anti-affinity temporarily.

## Issue 5: Slow Failover - Felix Takes Too Long to Reconnect

**Symptom:** After a Typha pod failure, Felix agents take >60 seconds to reconnect.

```bash
# Check Felix reconnect timeout

kubectl get daemonset calico-node -n kube-system -o yaml | grep FELIX_TYPHAREADTIMEOUT
```

**Resolution:** Reduce the timeout.

```bash
kubectl set env daemonset/calico-node -n kube-system FELIX_TYPHAREADTIMEOUT=15
```

## Issue 6: Rolling Update Causes Mass Reconnect

**Symptom:** During a Typha rolling update, connection count drops significantly.

```bash
kubectl rollout status deployment/calico-typha -n kube-system
```

**Resolution:** Increase `terminationGracePeriodSeconds` and match Typha's shutdown timeout so Typha can shed connections gracefully.

```bash
kubectl set env deployment/calico-typha -n kube-system TYPHA_SHUTDOWNTIMEOUTSECS=60
kubectl patch deployment calico-typha -n kube-system --patch '{
  "spec": {"template": {"spec": {"terminationGracePeriodSeconds": 60}}}
}'
```

## Conclusion

Typha HA troubleshooting covers connection imbalance (rebalancing mode and Typha discovery configuration), co-location issues (anti-affinity configuration and node count), PDB-blocked drains (temporary scale-up approach), post-failure restart failures (anti-affinity conflicts), slow Felix reconnection (Typha read timeout tuning), and rolling update connection storms (graceful shutdown settings). Addressing each issue requires checking the relevant configuration parameter and understanding the interaction between Typha's connection model and Kubernetes scheduling.
