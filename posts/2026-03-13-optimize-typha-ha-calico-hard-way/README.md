# How to Optimize Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Performance, Optimization, Hard Way

Description: A guide to optimizing Typha HA for fast failover, even connection distribution, and minimal performance impact during replica failures in a manually installed Calico cluster.

---

## Introduction

A Typha HA deployment that is correctly configured but not optimized may still exhibit slow failover (Felix takes 30+ seconds to reconnect), uneven connection distribution (one replica handles 80% of connections), or connection storms after a replica failure (all Felix agents reconnect simultaneously). Optimizing Typha HA addresses each of these problems through tuning of reconnect timeouts, connection rebalancing, and startup sequencing.

## Step 1: Minimize Felix Reconnect Latency

Felix detects a lost Typha connection when the TCP keepalive fails. The default timeout is 30 seconds. For faster failover, reduce the read timeout.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"typhaReadTimeout": "15s"}}'
```

With 15 seconds, Felix will detect and reconnect to a healthy Typha replica within 15 seconds of a replica failure.

## Step 2: Stagger Typha Startup to Avoid Connection Storms

When Typha restarts (or scales up), multiple Felix agents reconnect simultaneously. Stagger this by using Typha's connection throttle feature.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_MAXCONNECTIONSLOWERLIMIT=10 \
  TYPHA_CONNECTIONREBALANCINGMODE=auto
```

The lower limit slows the initial connection rate, preventing Typha from being overwhelmed by simultaneous snapshot requests.

## Step 3: Optimize Connection Rebalancing After Failure

After a Typha replica fails and recovers, connections are concentrated on the surviving replicas. Rebalancing gradually moves connections to the recovered replica.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_CONNECTIONREBALANCINGMODE=auto
```

In `auto` mode, Typha gradually sheds connections (by sending a disconnect message to Felix) to trigger reconnection to a less-loaded replica.

## Step 4: Optimize Snapshot Caching

When Felix reconnects to a new Typha replica, the replica sends a full snapshot of current state. Typha caches this snapshot. Monitor snapshot size and send time.

```bash
kubectl port-forward -n calico-system deployment/calico-typha 9093:9093 &
curl -s http://localhost:9093/metrics | grep typha_snapshot
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
value: 2000000000  # Just below system-cluster-critical
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
for pod in $(kubectl get pods -n calico-system -l app=calico-typha -o name); do
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

Optimizing Typha HA focuses on reducing failover latency (shorter Felix read timeout), preventing connection storms during restart (connection throttle), balancing connections after recovery (auto rebalancing), prioritizing Typha scheduling above application workloads (PriorityClass), and enabling graceful failover during planned operations (termination grace period). Together these optimizations ensure that Typha HA delivers fast, clean failover rather than just theoretical redundancy.
