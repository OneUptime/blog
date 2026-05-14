# How to Optimize Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Performance, Optimization, Hard Way

Description: A guide to optimizing Typha HA for fast failover, even connection distribution, and minimal performance impact during replica failures in a manually installed Calico cluster.

---

## Introduction

A Typha HA deployment that is correctly configured but not optimized may still exhibit slow failover (Felix takes 30+ seconds to reconnect), uneven connection distribution (one replica handles 80% of connections), or connection storms after a replica failure (all Felix agents reconnect simultaneously). Optimizing Typha HA addresses each of these problems through tuning of reconnect timeouts, connection rebalancing, and startup sequencing.

## Step 1: Minimize Felix Reconnect Latency

Felix detects a lost Typha connection when the read timeout expires (Typha sends regular pings, so traffic is always expected on a healthy connection). The default timeout is 30 seconds. For faster failover, reduce the read timeout.

`TyphaReadTimeout` is a local-only Felix configuration option, so it must be set via the `FELIX_TYPHAREADTIMEOUT` environment variable on the calico-node DaemonSet rather than via a `FelixConfiguration` patch.

```bash
kubectl set env daemonset/calico-node -n calico-system \
  FELIX_TYPHAREADTIMEOUT=15
```

The value is a floating-point number of seconds (the default is 30). With 15 seconds, Felix will detect and reconnect to a healthy Typha replica within 15 seconds of a replica failure.

## Step 2: Bound Per-Replica Connection Counts to Avoid Hotspots

When Typha replicas are unbalanced, individual replicas can accept large numbers of connections before any rebalancing kicks in. Bound the per-replica connection floor so the rebalancer can shed load down to a sensible target.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_MAXCONNECTIONSLOWERLIMIT=200 \
  TYPHA_CONNECTIONREBALANCINGMODE=kubernetes
```

`TYPHA_MAXCONNECTIONSLOWERLIMIT` (default 400) is the minimum value the dynamic per-replica connection cap will be lowered to during rebalancing - picking a value below the default lets the rebalancer drive each replica's cap closer to an even share when there are many Typha replicas relative to Felix clients.

## Step 3: Optimize Connection Rebalancing After Failure

After a Typha replica fails and recovers, connections are concentrated on the surviving replicas. Rebalancing gradually moves connections to the recovered replica.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_CONNECTIONREBALANCINGMODE=kubernetes
```

In `kubernetes` mode, Typha polls the Kubernetes API for the number of Typha replicas and nodes and periodically recomputes a per-replica connection cap. When a replica is over its cap, it drops the excess connections (throttled by `ShutdownConnectionDropIntervalMaxSecs`), causing those Felix clients to reconnect and land on a less-loaded replica. The only other valid value is `none` (the default), which disables rebalancing.

## Step 4: Optimize Snapshot Caching

When Felix reconnects to a new Typha replica, the replica sends a full snapshot of current state. Typha caches this snapshot. Monitor snapshot size and send time.

```bash
kubectl port-forward -n calico-system deployment/calico-typha 9093:9093 &
curl -s http://localhost:9093/metrics | grep typha_client_snapshot_send_secs
```

If snapshot send time is high (>5 seconds), consider:
- Reducing the number of GlobalNetworkPolicy objects
- Ensuring Typha has sufficient memory to cache the snapshot

## Step 5: Prioritize Typha Over Application Workloads

Use PriorityClass to ensure Typha is never evicted when node resources are constrained.

```bash
kubectl apply -f - <<EOF
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: calico-networking-critical
value: 1000000000  # Maximum allowed for a user-defined PriorityClass; below system-cluster-critical (2,000,000,000)
globalDefault: false
description: "Critical Calico networking components"
EOF

kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "priorityClassName": "calico-networking-critical"
      }
    }
  }
}'
```

## Step 6: Tune Connection Distribution

For large clusters, ensure Typha replicas handle approximately equal connection counts.

```bash
# Check distribution

for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-typha -o name); do
  COUNT=$(kubectl exec -n calico-system $pod -- \
    wget -qO- http://localhost:9093/metrics 2>/dev/null | \
    grep typha_connections_active | awk '{print $2}')
  echo "$pod: $COUNT"
done
```

If distribution is uneven after rebalancing, verify the Kubernetes Service is using `ClusterIP` (which load balances across endpoints).

```bash
kubectl get service calico-typha -n calico-system -o jsonpath='{.spec.type}'
```

## Step 7: Set Typha Termination Grace Period for Graceful Failover

When a Typha pod is terminated (rolling update or eviction), give it time to gracefully shed connections before hard termination.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {
    "template": {
      "spec": {
        "terminationGracePeriodSeconds": 30
      }
    }
  }
}'
```

During the 30-second grace period, Typha sends disconnect signals to connected Felix agents, triggering them to reconnect to other replicas before the pod terminates. This converts a hard failure into a graceful connection migration.

## Conclusion

Optimizing Typha HA focuses on reducing failover latency (shorter Felix read timeout), bounding per-replica connection counts, balancing connections after recovery (Kubernetes-mode rebalancing), prioritizing Typha scheduling above application workloads (PriorityClass), and enabling graceful failover during planned operations (termination grace period). Together these optimizations ensure that Typha HA delivers fast, clean failover rather than just theoretical redundancy.
