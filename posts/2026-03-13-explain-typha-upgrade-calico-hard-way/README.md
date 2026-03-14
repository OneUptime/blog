# Explaining Typha Upgrades in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, Upgrades, CNI, Networking, Rolling Updates

Description: Understand what happens to Felix connections, policy enforcement, and cluster networking during a Typha upgrade — covering the rolling update sequence, version compatibility requirements, and the impact window when running Calico in manifest mode.

---

## Introduction

Upgrading Typha in a manifest-based Calico deployment is a rolling Deployment update, but it has networking implications that a standard application rollout does not. When a Typha pod is replaced, every Felix agent connected to it must reconnect to a remaining pod and receive a new full state snapshot before it can resume processing policy updates.

Understanding what happens during this reconnection window — how long it lasts, what Felix does with stale state, and whether policy enforcement is disrupted — is essential for planning and communicating upgrades to the teams that depend on your cluster's network behavior.

---

## Prerequisites

- Typha deployed in `kube-system` per the setup post in this series
- Familiarity with the Typha architecture and connection lifecycle
- `kubectl` and `calicoctl` access
- Prometheus metrics enabled on Typha

---

## Step 1: Understand Typha and Calico Version Compatibility

Typha, Felix (calico-node), and calicoctl must all be on compatible versions. Calico typically maintains version compatibility within a minor version range (e.g., Typha 3.26.x works with Felix 3.26.x and 3.27.x).

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

Calico's upgrade documentation specifies the supported version skew. In general, upgrade Typha before Felix so that Felix connects to the newer Typha version, not the reverse.

---

## Step 2: Understand the Rolling Update Impact

When Kubernetes performs a rolling update of the Typha Deployment, it replaces pods one at a time:

```
Phase 1: Start replacement pod
  Old pod: Running, serving 150 Felix connections
  New pod: Starting, building API server cache

Phase 2: New pod passes readiness probe
  Old pod: Running, serving 150 Felix connections
  New pod: Running, accepting new connections

Phase 3: Old pod is terminated
  Old pod: Terminating, drops all 150 connections
  New pod: Receives 150 reconnecting Felix agents
  Felix agents: Reconnect, receive full state snapshot

Phase 4: Complete
  New pod: Serving all 150 reconnected Felix agents
  Total reconnection window: typically 5–30 seconds per pod
```

During Phase 3, Felix agents on the terminated pod's connections are briefly using stale policy state. For most clusters, the reconnection window is short enough (under 10 seconds) that no perceptible impact occurs unless policy changes are applied simultaneously.

---

## Step 3: Understand the Version Skew During the Upgrade Window

When Typha is upgraded before Felix, there is a window where the new Typha version is serving Felix agents running the old version. Calico's protocol between Typha and Felix is designed to be backward compatible within supported version ranges. Verify this in the Calico release notes before upgrading.

```bash
# Check the Calico release notes for the target version's compatibility matrix
# https://docs.tigera.io/calico/latest/release-notes/

# Verify which Typha protocol version is in use
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl logs -n kube-system $TYPHA_POD --tail=30 | grep -i "version\|protocol"
```

---

## Step 4: Understand What Felix Does During Reconnection

When Felix loses its Typha connection, it does not immediately clear its local policy state. Instead, it:

1. Keeps all current iptables/eBPF rules in place (no policy is removed)
2. Attempts to reconnect to Typha (using the Service DNS name)
3. On successful reconnect, receives a full state snapshot
4. Compares the snapshot to its current state and applies only the delta

This means that during a brief reconnection window (typically under 10 seconds), Felix continues enforcing the last known good policy state. New policy changes applied during this window will not reach Felix until after reconnection, but existing policies remain active.

```bash
# Monitor Felix reconnection events during an upgrade
NODE_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node -o name | head -1)
kubectl logs -n kube-system $NODE_POD -c calico-node --tail=100 -f | grep -i "typha\|reconnect"
```

---

## Step 5: Understand the Total Upgrade Duration

The total time to upgrade all Typha pods depends on:

- Number of Typha replicas
- Time for each new pod to pass the readiness probe (typically 30–60 seconds)
- Time for terminated pod's Felix agents to reconnect (typically 5–15 seconds)

For a 3-replica Typha deployment, the total upgrade window is approximately:

```
Total upgrade time = replicas * (readiness_delay + reconnection_time)
                   = 3 * (45s + 10s) = ~165 seconds (~3 minutes)
```

During this 3-minute window, at any given moment roughly 1/3 of Felix agents are in a reconnection state (brief stale policy window).

---

## Best Practices

- Never apply policy changes during a Typha upgrade; wait for the rollout to complete before making policy changes.
- Monitor `typha_connections_active` per pod during the upgrade to confirm reconnections are completing correctly.
- Upgrade Typha before Felix in a Calico version upgrade to ensure the newer Typha version is in place before Felix agents connect with the new protocol version.
- Use `kubectl rollout status deployment/calico-typha -n kube-system` to track upgrade progress and detect if a pod fails to become ready.
- Communicate the upgrade maintenance window to teams that apply frequent policy changes, so they know to pause changes during the 3–5 minute window.

---

## Conclusion

A Typha upgrade is a rolling replacement of Kubernetes pods with a networking-specific impact: each pod replacement causes a brief reconnection event for the Felix agents connected to it. Understanding the phases, the reconnection window, and Felix's behavior during reconnection allows you to plan upgrades confidently and communicate the expected impact accurately.

---

*Monitor Typha upgrade progress and detect stalled rollouts with [OneUptime](https://oneuptime.com).*
