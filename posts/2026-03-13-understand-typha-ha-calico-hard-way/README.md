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

Felix uses `FELIX_TYPHAK8SSERVICENAME` to discover Typha by looking up the endpoints for the configured Kubernetes Service. When the Service has multiple healthy backend endpoints, Felix can reconnect to a different Typha replica.

```bash
# Check Typha service endpoints in a hard way installation

kubectl get endpointslices -n kube-system -l kubernetes.io/service-name=calico-typha
```

With multiple ready Typha replicas, the EndpointSlice output shows multiple backend addresses. Felix reconnects to one of them.

## Typha Replica Recommendations

| Cluster Size | Recommended Typha Replicas | Reason |
|-------------|---------------------------|--------|
| 1-50 nodes | 0 or operator-managed Typha | Older manifest installs can connect directly to the API server; operator installs include Typha |
| 50-200 nodes | 3 in production | Production minimum for failure and rolling upgrade tolerance |
| 200-500 nodes | 3 | At least one replica per 200 nodes, with production HA |
| 500-2000 nodes | 3-10 | At least one replica per 200 nodes, spread across failure domains |
| 2000+ nodes | 10-20 | Scale + HA, staying within the recommended maximum of 20 replicas |

## Single Replica Failure Mode

With one Typha replica:

```plaintext
Typha fails → All Felix agents disconnect → Felix continues with cached state
               → Typha pod restarts → Felix reconnects
               → Policy changes during downtime applied
```

Policy changes during the Typha outage are applied after reconnection. For short Typha restarts, the practical impact is usually limited to delayed policy updates.

## Multi-Replica Failure Mode

With three Typha replicas (one per availability zone):

```plaintext
Typha replica in zone-a fails → Felix agents connected to it reconnect to zone-b or zone-c
                                → Healthy replicas keep serving their existing clients
                                → Zone-a Felix agents receive snapshot on reconnect
```

Policy changes continue propagating through the healthy replicas, while clients that were connected to the failed replica resume updates after reconnection.

## Typha is Stateless

Each Typha replica independently watches the Kubernetes API server and maintains its own cache. There is no state shared between Typha replicas. This means:

- A new Typha replica is immediately usable after startup
- Replicas can be added or removed without coordination
- Each replica should be sized so that the remaining replicas can handle the Felix connection load after a failure

## Conclusion

Typha HA in hard way installations is achieved by running multiple Typha replicas, each independently caching Calico resource state from the Kubernetes API server. When a replica fails, Felix agents reconnect to a healthy replica and receive a snapshot of current state. The stateless nature of Typha makes scaling replicas up and down straightforward. The recommended replica count scales with cluster size, with at least three replicas in production to reduce the impact of rolling upgrades and failures.
