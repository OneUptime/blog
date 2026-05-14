# Enable Operator Managing Identities Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF, IPAM

Description: A step-by-step guide to migrating an existing Cilium cluster from agent-distributed identity management to centralized Operator-managed identities with minimal disruption to running workloads.

---

## Introduction

Migrating an existing Cilium cluster to Operator-managed identities is more complex than enabling it on a new cluster because there is existing identity state that must be preserved and transitioned. All currently running pods have active identities, and network policies referencing those identities must continue to be enforced without interruption during the migration. The migration must be carefully sequenced to avoid a window where identities are neither agent-managed nor Operator-managed.

Cilium's migration approach is designed to be safe: first the Operator is allowed to manage identities alongside the agents, then the agents are restarted in Operator-managed mode. This intermediate state keeps existing identities available while the mode changes. Agents transition from creating identities to consuming them without requiring workload pod restarts or network disruptions.

This guide provides a safe migration procedure, troubleshooting steps for migration-specific issues, validation to confirm the migration succeeded, and monitoring to catch post-migration regressions.

## Prerequisites

- A Cilium version whose Helm chart supports `identityManagementMode` installed on an existing cluster
- All Cilium components healthy before starting migration
- Snapshot of current identity state for comparison
- Maintenance window scheduled (or willingness to accept brief elevated API server load)
- `kubectl` with cluster admin access and Helm 3.x

## Configure Identity Management Migration

Prepare and execute the migration:

```bash
# Step 1: Capture pre-migration state

echo "Pre-migration identity count:"
kubectl get ciliumidentities --no-headers | wc -l

echo "Saving identity list..."
kubectl get ciliumidentities -o json | \
  jq -r '.items[] | "\(.metadata.name): \(.["security-labels"])"' > /tmp/pre-migration-identities.txt

echo "Current Cilium health:"
cilium status

# Step 2: Verify Operator is healthy before migrating
kubectl -n kube-system get pods -l name=cilium-operator
kubectl -n kube-system logs -l name=cilium-operator --tail=20

# Step 3: Allow both the Operator and agents to manage identities
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set identityManagementMode=both \
  --set operator.identityGCInterval=15m0s \
  --set operator.identityHeartbeatTimeout=30m0s

kubectl -n kube-system rollout restart deployment/cilium-operator
kubectl -n kube-system rollout status deployment/cilium-operator

# Step 4: Monitor Operator processing identities
kubectl -n kube-system logs -l name=cilium-operator -f | grep -i "identity"

# Step 5: Switch agents to Operator-managed identities
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set identityManagementMode=operator \
  --set operator.identityGCInterval=15m0s \
  --set operator.identityHeartbeatTimeout=30m0s

kubectl -n kube-system rollout restart ds/cilium
kubectl -n kube-system rollout status ds/cilium
```

Verify migration settings are applied:

```bash
# Confirm Operator identity management is enabled
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.identity-management-mode}'; echo

# Confirm agents are in consumer mode
kubectl -n kube-system exec ds/cilium -- cilium config view | grep identity-management-mode
```

## Troubleshoot Migration Issues

Diagnose problems during migration:

```bash
# Issue: Identity count drops unexpectedly after migration
PRE_COUNT=$(wc -l < /tmp/pre-migration-identities.txt)
POST_COUNT=$(kubectl get ciliumidentities --no-headers | wc -l)
echo "Pre: $PRE_COUNT, Post: $POST_COUNT"

# If count dropped, check if GC ran too aggressively
kubectl -n kube-system logs -l name=cilium-operator | grep "identity gc\|deleted identity"

# Issue: Network policies stopping enforcement during migration
cilium hubble port-forward &
hubble observe --verdict DROPPED --last 100 -f

# Check if policy enforcement dropped
kubectl -n kube-system exec ds/cilium -- cilium endpoint list | \
  grep -v "policy-enforcement=disabled"

# Issue: Operator not processing identities
kubectl -n kube-system logs -l name=cilium-operator | grep -i "identity"

# Issue: Agents still trying to create identities after the final operator mode switch
kubectl -n kube-system logs ds/cilium | grep -i "identity created\|conflict"
```

Fix migration-specific problems:

```bash
# Fix: Re-enable agent identity creation temporarily if Operator-managed mode is failing
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set identityManagementMode=both
kubectl -n kube-system rollout restart ds/cilium
kubectl -n kube-system rollout status ds/cilium
# Stabilize, then retry migration

# Fix: Extend GC timeout to prevent premature identity cleanup during migration
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set operator.identityGCInterval=2h0m0s \
  --set operator.identityHeartbeatTimeout=4h0m0s

# Fix: Inspect the labels for a missing identity before recreating workloads
kubectl -n kube-system exec ds/cilium -- cilium-dbg identity get <identity-id> -o yaml
```

## Validate Migration Success

Confirm the migration completed successfully:

```bash
# Check identity count matches pre-migration
PRE_COUNT=$(wc -l < /tmp/pre-migration-identities.txt)
POST_COUNT=$(kubectl get ciliumidentities --no-headers | wc -l)
echo "Pre: $PRE_COUNT, Post: $POST_COUNT (should be similar)"

# Verify all running pods still have valid identities
kubectl get pods -A -o wide --no-headers | while read ns pod rest; do
  IP=$(kubectl get pod $pod -n $ns -o jsonpath='{.status.podIP}' 2>/dev/null)
  if [ -n "$IP" ]; then
    ENDPOINT=$(kubectl -n kube-system exec ds/cilium -- \
      cilium endpoint list 2>/dev/null | grep -F "$IP")
    if [ -z "$ENDPOINT" ]; then
      echo "WARNING: No endpoint for $ns/$pod ($IP)"
    fi
  fi
done

# Run full connectivity test to confirm no policy regressions
cilium connectivity test

# Verify Operator-managed identity mode remains configured
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.identity-management-mode}'; echo

kubectl -n kube-system logs -l name=cilium-operator --since=30m | \
  grep -i "identity" | tail -20
```

## Monitor Post-Migration Identity Health

```mermaid
graph TD
    A[Pre-migration] -->|Agents manage identities| B[Distributed identity state]
    B -->|helm upgrade| C[Migration Start]
    C -->|Both mode| D[Operator and agents manage identities]
    D -->|Agents switch to operator mode| E[Operator-managed state]
    E -->|Agents become consumers| F[Post-migration]
    F -->|Monitor| G{Identity count stable?}
    G -->|Yes| H[Migration successful]
    G -->|No| I[Investigate GC aggressiveness]
```

Post-migration monitoring:

```bash
# Monitor identity count stability for 24 hours after migration
watch -n300 "kubectl get ciliumidentities --no-headers | wc -l"

# Check Operator is reconciling identities correctly
kubectl -n kube-system port-forward svc/cilium-operator 9963:9963 &
watch -n60 "curl -s http://localhost:9963/metrics | grep 'cilium_operator_.*identity\\|cilium_operator_cid_controller'"

# Confirm the cluster is still configured for Operator-managed identities
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.identity-management-mode}'; echo

# Alert on identity churn post-migration
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-post-migration
  namespace: kube-system
spec:
  groups:
  - name: post-migration
    rules:
    - alert: IdentityChurnHigh
      expr: sum(increase(cilium_operator_cid_controller_work_queue_event_count[5m])) > 100
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High identity churn rate detected post-migration"
EOF
```

## Conclusion

Migrating to Operator-managed identities is a safe, low-risk operation when executed carefully. The key to success is capturing pre-migration state, ensuring the Operator is healthy before enabling the feature, and using an extended GC timeout to prevent premature identity cleanup during the transition. Post-migration validation through the connectivity test suite confirms no policy regressions. Once stable, Operator-managed identities provide a more scalable and operationally clear foundation for growing clusters, with all identity lifecycle events visible through the Operator's metrics and logs.
