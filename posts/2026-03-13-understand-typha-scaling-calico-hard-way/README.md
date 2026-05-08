# Understanding Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Scaling, Hard Way

Description: Build a deep understanding of how Typha scales Felix connections in large Kubernetes clusters - covering the fan-out model, connection lifecycle, scaling thresholds, and the tradeoffs between...

---

## Introduction

The phrase "Typha scales Calico" is often repeated but rarely explained in detail. What exactly is being scaled? What happens to a Felix agent when the Typha pod it is connected to crashes? How does Kubernetes DNS load-balance Felix connections across multiple Typha replicas? Understanding these mechanics is the foundation for making good decisions about replica counts, connection limits, and failure handling.

This post explains the Typha scaling model in depth, without relying on operator abstractions.

---

## Prerequisites

- Basic familiarity with the Calico architecture (Felix, Typha, API server)
- A running Kubernetes cluster with Calico installed in manifest mode
- `calicoctl` v3.x configured
- The explain post in this series (for context on the basic architecture)

---

## Step 1: What "Scaling" Means in the Context of Typha

Typha solves a specific scaling problem: API server connection fan-out. Without Typha, every Felix agent maintains its own watch connections to the Kubernetes API server - one per watched resource type (NetworkPolicy, IPPool, HostEndpoint, nodes, etc.). At 500 nodes, this creates thousands of concurrent watch streams, consuming significant API server goroutines and memory.

Typha collapses this to a constant number of watch connections regardless of cluster size: one watch stream per resource type, held by each Typha pod. Felix agents connect to Typha, not the API server.

The "scaling" in "Typha scaling" refers to adding more Typha replicas as the cluster grows, to spread the Felix connection load horizontally across multiple Typha pods.

---

## Step 2: The Connection Lifecycle

Understanding when Felix connects, disconnects, and reconnects to Typha explains how scaling events affect the cluster:

```plaintext
Startup:
1. Felix starts on a new node
2. Felix discovers ready Typha endpoints from the calico-typha Service
3. Felix chooses one ready Typha endpoint from a shuffled endpoint list
4. Felix opens a TCP connection to that Typha pod on port 5473
5. Felix receives a full state snapshot from Typha (all current resources)
6. Felix begins receiving incremental updates as resources change

Steady state:
- Felix receives updates from Typha within milliseconds of API server changes
- Felix sends keepalives; Typha sends keepalives
- No reconnection unless a timeout or error occurs

Typha pod restart:
1. Typha pod is deleted or crashes
2. Felix detects connection drop (TCP disconnect or timeout)
3. Felix refreshes the ready Typha endpoint list
4. Felix connects to a different Typha pod endpoint
5. Felix receives a new full state snapshot
6. Policy enforcement briefly uses stale state during reconnect window
```

---

## Step 3: How the Scaling Formula Works

The recommended formula for Typha replica count is:

```plaintext
replicas = max(2, ceil(node_count / 200))
```

This formula is based on two constraints:

1. **Memory**: Each Typha pod holds a complete cache of all watched resources plus per-client send buffers. At 200 connected Felix clients, this typically consumes 200–512 MB depending on policy count.

2. **CPU**: Serializing and sending updates to 200 concurrent Felix clients with reasonable latency requires approximately 0.5–1 CPU cores per Typha pod at steady state, with bursts during rolling restarts.

Verify these assumptions against your actual resource usage:

```bash
# Check Typha memory and CPU usage across all pods.

kubectl top pods -n kube-system -l k8s-app=calico-typha

# Compare to the number of Felix clients connected per pod.
# This assumes Typha Prometheus metrics are enabled on port 9093.
for pod in $(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name); do
  connections=$(kubectl exec -n kube-system $pod -- \
    wget -qO- http://localhost:9093/metrics 2>/dev/null \
    | grep "^typha_connections_active " | awk '{print $2}')
  echo "$pod: $connections connections"
done
```

---

## Step 4: Understanding Connection Distribution

Felix discovers Typha endpoints at startup and connects to one ready pod. It does not move an established connection just because you add a Typha replica. This means:

- New nodes connecting after a scale-up event can spread across all ready Typha pods because Felix shuffles the endpoint list
- Old nodes continue using their existing connections even if one pod has more connections than others
- After a Typha pod restart, all Felix agents that were connected to it must reconnect, causing a burst of simultaneous reconnections to the remaining pods

This is why setting `TYPHA_CONNECTIONREBALANCINGMODE=kubernetes` and appropriate connection limits on each Typha pod matters: Typha calculates a per-pod connection target from the number of nodes and Typha endpoints. If a pod is above that target, it drops existing connections gradually so Felix reconnects to another ready endpoint. `TYPHA_MAXCONNECTIONSLOWERLIMIT` is the floor for that calculated target, not a hard "reject new clients at this number" cap.

```yaml
# typha-connection-cap.yaml
# Typha environment variables that enable Kubernetes-aware connection rebalancing
# Place this in the Typha Deployment's container env section
env:
  - name: TYPHA_CONNECTIONREBALANCINGMODE
    value: "kubernetes"
  - name: TYPHA_MAXCONNECTIONSLOWERLIMIT
    value: "100"
    # Typha will not calculate a rebalance target below 100 active connections.
    # Pods above the calculated target gradually drop connections so Felix reconnects.
```

---

## Step 5: The Reconnection Storm Problem

When a Typha pod restarts, all Felix agents connected to it reconnect simultaneously. If 200 Felix agents reconnect to the same new pod in the same second, that pod's connection setup CPU spikes and its cache-send latency increases. During this window, Felix agents receive stale policy state.

Mitigations:

```bash
# Check the rate of new connections using Typha metrics
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl port-forward -n kube-system $TYPHA_POD 9093:9093 &
sleep 2

# Rate of connections accepted (high rate indicates a reconnection storm)
curl -s http://localhost:9093/metrics | grep '^typha_connections_accepted '

# Rate of snapshots generated (binary snapshots may be reused across reconnecting clients)
curl -s http://localhost:9093/metrics | grep '^typha_snapshots_generated'

kill %1
```

---

## Best Practices

- Enable `TYPHA_CONNECTIONREBALANCINGMODE=kubernetes` and set sensible lower and upper connection limits; without rebalancing, Felix agents keep their existing Typha connections and distribution can remain uneven after scale events.
- Size memory limits generously - the per-client send buffer is allocated when Felix connects, and a sudden influx of reconnecting clients can spike memory usage well above the steady-state value.
- Use the rolling restart strategy (`kubectl rollout restart`) instead of deleting pods directly; it staggers restarts to limit the simultaneous reconnection load.
- Monitor `typha_connections_accepted`, `typha_snapshots_generated`, and `typha_snapshots_reused` rates as indicators of reconnect activity; a spike above the baseline indicates a pod restart or Felix agent restart event.
- When planning Typha scaling, factor in the reconnection storm: a pod that serves 200 Felix clients will generate 200 simultaneous reconnects when it restarts. Size your remaining pods to handle this burst.

---

## Conclusion

Typha scaling is fundamentally about managing Felix connection fan-out to the API server. The scaling formula, connection lifecycle, and reconnection storm dynamics all follow logically from this core purpose. Understanding these mechanics makes every Typha configuration decision - replica count, connection limits, memory sizing - an informed choice rather than a guess.

---

*Monitor Typha connection dynamics and reconnection events in real time with [OneUptime](https://oneuptime.com).*
