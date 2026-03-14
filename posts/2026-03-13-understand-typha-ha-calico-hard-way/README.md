# How to Understand Typha High Availability in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, High Availability, Hard Way

Description: An explanation of how Typha high availability works, when it is needed, and what happens to the cluster when a Typha replica fails.

---

## Introduction

Typha high availability (HA) refers to running multiple Typha replicas so that the failure of one replica does not interrupt policy distribution to Felix agents. In a single-replica Typha setup, a Typha pod failure causes all Felix agents to lose their connection to the policy source. Felix enters a graceful mode where it continues enforcing the last known policy state, but new policy changes do not propagate until Typha recovers.

Understanding Typha HA requires understanding what happens during a Typha replica failure, how Felix detects the failure and reconnects, and what the minimum replica count should be for a given cluster size.

## What Happens When a Typha Replica Fails

1. Felix agents connected to the failed replica detect the connection drop (via TCP timeout or close)
2. Felix logs the connection loss and begins reconnecting
3. If multiple Typha replicas exist, Felix connects to a different replica
4. The new replica sends Felix a snapshot of the current policy state
5. Felix programs any policy changes that occurred during the disconnection

During the disconnection window (typically seconds to 30 seconds), Felix continues enforcing the last known policy. Existing connections continue working. New policy changes applied during this window are not programmed until the reconnection completes.

## Felix Reconnection Behavior

Felix uses Kubernetes service DNS to discover Typha. When the Service has multiple backend endpoints, Felix reconnects and the load balancer routes it to a healthy replica.

```bash
# Check Typha service endpoints
kubectl get endpoints calico-typha -n calico-system
```

With two Typha replicas, the endpoints list shows two IP addresses. Felix reconnects to one of them.

## Typha Replica Recommendations

| Cluster Size | Recommended Typha Replicas | Reason |
|-------------|---------------------------|--------|
| 1-50 nodes | 0 (direct API server) | Typha overhead not justified |
| 50-200 nodes | 1 | Basic deployment |
| 200-500 nodes | 2 | HA without excess resources |
| 500-2000 nodes | 3 | Full HA with zone distribution |
| 2000+ nodes | 5+ | Scale + HA |

## Single Replica Failure Mode

With one Typha replica:

```
Typha fails → All Felix agents disconnect → Felix continues with cached state
               → Typha pod restarts (typically <60s) → Felix reconnects
               → Policy changes during downtime applied
```

Policy changes during the Typha outage are applied after reconnection. For short Typha restarts (<5 minutes), the practical impact is minimal.

## Multi-Replica Failure Mode

With three Typha replicas (one per availability zone):

```
Typha replica in zone-a fails → Felix agents in zone-a reconnect to zone-b or zone-c
                                → No policy propagation interruption
                                → Zone-a Felix agents receive snapshot on reconnect
```

Policy changes continue propagating through the healthy replicas.

## Typha is Stateless

Each Typha replica independently watches the Kubernetes API server and maintains its own cache. There is no state shared between Typha replicas. This means:

- A new Typha replica is immediately usable after startup
- Replicas can be added or removed without coordination
- Each replica can handle a full Felix connection load independently

## Conclusion

Typha HA in hard way installations is achieved by running multiple Typha replicas, each independently caching Calico resource state from the Kubernetes API server. When a replica fails, Felix agents reconnect to a healthy replica and receive a snapshot of current state. The stateless nature of Typha makes scaling replicas up and down straightforward. The recommended replica count scales with cluster size, starting at two replicas for clusters with 200+ nodes to ensure that a single replica failure does not interrupt policy propagation.
