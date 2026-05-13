# Explaining Typha Upgrades in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Upgrade, Communication

Description: Understand what happens to Felix connections, policy enforcement, and cluster networking during a Typha upgrade - covering the rolling update sequence, version compatibility requirements, and the...

---

## Introduction

Upgrading Typha in a manifest-based Calico deployment is part of a rolling Calico update, but it has networking implications that a standard application rollout does not. When a Typha pod is replaced, every Felix agent connected to it must reconnect to another ready Typha pod and receive a new full state snapshot before it can resume processing policy updates.

Understanding what happens during this reconnection window - how long it lasts, what Felix does with stale state, and whether policy enforcement is disrupted - is essential for planning and communicating upgrades to the teams that depend on your cluster's network behavior.

---

## Prerequisites

- Typha deployed in `kube-system` per the setup post in this series
- Familiarity with the Typha architecture and connection lifecycle
- `kubectl` and `calicoctl` access
- Prometheus metrics enabled on Typha

---

## Step 1: Understand Typha and Calico Version Compatibility

Typha, Felix (calico-node), and calicoctl must all be on compatible versions. Calico components are released together, and `calicoctl` should match the Calico version running in the cluster after the upgrade.

Before any upgrade, verify the current versions:

```bash
# Check current Typha image version

kubectl get deployment calico-typha -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check current Felix (calico-node) image version
kubectl get daemonset calico-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check calicoctl version
calicoctl version
```

Calico's upgrade documentation and release notes specify any version-specific upgrade requirements. For manifest-based upgrades, the documented procedure is to apply the target Calico manifest and let Kubernetes roll the affected Calico workloads.

---

## Step 2: Understand the Rolling Update Impact

When Kubernetes performs a rolling update of the Typha Deployment, it replaces pods gradually. With a common three-replica Typha deployment and conservative rolling update settings, the sequence looks like this:

```plaintext
Phase 1: Start replacement pod
  Old pod: Running, serving 150 Felix connections
  New pod: Starting, building API server cache

Phase 2: New pod passes readiness probe
  Old pod: Running, serving 150 Felix connections
  New pod: Running, accepting new connections

Phase 3: Old pod is terminated
  Old pod: Terminating, drops all 150 connections
  Ready Typha pods: Receive reconnecting Felix agents
  Felix agents: Reconnect, receive full state snapshot

Phase 4: Complete
  Ready Typha pods: Serving all reconnected Felix agents
  Reconnection window: measure in your cluster; often seconds, but workload and API server load matter
```

During Phase 3, Felix agents on the terminated pod's connections are briefly using their last received policy state. For most healthy clusters, the reconnection window is short enough that no perceptible impact occurs unless policy changes are applied simultaneously.

---

## Step 3: Understand the Version Skew During the Upgrade Window

During a Calico upgrade, there may be a short window where Typha and Felix pods are not all on the same image version. Verify the documented upgrade path and any version-specific notes before upgrading.

```bash
# Check the Calico release notes for the target version's upgrade notes
# https://docs.tigera.io/calico/latest/release-notes/

# Inspect Typha startup and client connection logs
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl logs -n kube-system $TYPHA_POD --tail=30 | grep -i "version\|protocol"
```

---

## Step 4: Understand What Felix Does During Reconnection

When Felix loses its Typha connection, it does not immediately clear its local policy state. Instead, it:

1. Keeps all current iptables/eBPF rules in place (no policy is removed)
2. Attempts to reconnect to Typha by looking up the Endpoints for the configured Kubernetes Service
3. On successful reconnect, receives a full state snapshot
4. Reconciles its local dataplane to the received state and then processes subsequent updates

This means that during a brief reconnection window, Felix continues enforcing the last known good policy state. New policy changes applied during this window will not reach Felix until after reconnection, but existing policies remain active.

```bash
# Monitor Felix reconnection events during an upgrade
NODE_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node -o name | head -1)
kubectl logs -n kube-system $NODE_POD -c calico-node --tail=100 -f | grep -i "typha\|reconnect"
```

---

## Step 5: Understand the Total Upgrade Duration

The total time to upgrade all Typha pods depends on:

- Number of Typha replicas
- Time for each new pod to pass the readiness probe
- Time for terminated pod's Felix agents to reconnect

For a 3-replica Typha deployment, an example estimate is:

```plaintext
Total upgrade time = replicas * (readiness_delay + reconnection_time)
                   = 3 * (45s + 10s) = ~165 seconds (~3 minutes)
```

During this 3-minute window, the Felix agents connected to the Typha pod being terminated may briefly reconnect. The exact fraction depends on how evenly clients are spread across Typha pods and on the Deployment rolling update settings.

---

## Best Practices

- Never apply policy changes during a Typha upgrade; wait for the rollout to complete before making policy changes.
- Monitor `typha_connections_active` per pod during the upgrade to confirm reconnections are completing correctly.
- Follow the official Calico upgrade procedure and release notes for the target version; keep Typha, Felix, and calicoctl in supported combinations.
- Use `kubectl rollout status deployment/calico-typha -n kube-system` to track upgrade progress and detect if a pod fails to become ready.
- Communicate the upgrade maintenance window to teams that apply frequent policy changes, so they know to pause changes during the 3–5 minute window.

---

## Conclusion

A Typha upgrade is a rolling replacement of Kubernetes pods with a networking-specific impact: each pod replacement causes a brief reconnection event for the Felix agents connected to it. Understanding the phases, the reconnection window, and Felix's behavior during reconnection allows you to plan upgrades confidently and communicate the expected impact accurately.

---

*Monitor Typha upgrade progress and detect stalled rollouts with [OneUptime](https://oneuptime.com).*
