# How to Handle Flux Sync After Edge Site Reconnection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Edge Computing, GitOps, Reconnection, Sync

Description: Manage Flux CD reconciliation when edge sites reconnect to the network, handling accumulated changes and conflict resolution gracefully.

---

## Introduction

When an edge site reconnects to the internet after an extended offline period, Flux CD does not simply pick up where it left off - it encounters a reconciliation challenge. Many commits may have accumulated in Git since the last successful fetch, new container images may be available, and the desired state may have changed significantly from what the edge cluster currently runs.

Understanding how Flux handles reconnection and proactively managing the reconnection process prevents thundering herd problems (all sites reconnecting simultaneously and saturating the Git server), conflicting state, and unexpected workload disruptions.

This guide covers Flux's reconnection behavior, techniques for staggering reconnection-driven reconciliation, and best practices for operating edge sites through extended offline periods.

## Prerequisites

- Flux CD deployed on edge clusters with intermittent connectivity
- Understanding of your site's typical offline duration (hours, days, or weeks)
- Alerting in place to detect when sites reconnect
- `flux` and `kubectl` access to edge clusters

## Step 1: Understand Flux's Reconnection Behavior

When network connectivity is restored and Flux successfully fetches the Git repository:

1. Source controller fetches the latest revision (all commits since last successful fetch)
2. Flux updates the GitRepository status with the new revision
3. Kustomization controllers detect the revision change and begin reconciling
4. All changes accumulated during the offline period are applied in a single reconciliation cycle
5. Flux does not replay individual commits - it applies the current state of the repository

```bash
# Monitor reconnection in real time
watch -n5 "flux get sources git -A && echo '---' && flux get kustomizations -A"

# The source will show a new revision when connectivity is restored
# STATUS column will transition from "artifact up-to-date" (stale) to a new SHA

# Check how many commits accumulated during the offline period
git log --oneline HEAD..origin/main | wc -l
```

## Step 2: Handle Accumulated Image Updates

If image automation was running during the offline period and new images were pushed, Flux may try to update image tags after reconnection.

```bash
# Check if image automation has pending updates
flux get imageupdateautomations -A

# Review what image tag changes accumulated
kubectl get imagepolicy -A -o json | \
  jq '.items[] | {name: .metadata.name, latestImage: .status.latestImage}'

# If many image updates accumulated, suspend automation briefly
# to review before applying
flux suspend imageupdateautomation flux-system -n flux-system

# Review pending changes, then resume
flux resume imageupdateautomation flux-system -n flux-system
```

## Step 3: Stagger Reconnection for Large Fleets

When hundreds of edge sites reconnect simultaneously (after a widespread network outage), they can overwhelm the Git server with concurrent clone operations. Implement staggered reconnection.

```bash
#!/bin/bash
# stagger-reconnection.sh
# Run on each edge cluster when network is restored
# Adds a random delay to spread out Git pulls

# Generate a random delay between 0 and 300 seconds (5 minutes)
DELAY=$((RANDOM % 300))
CLUSTER_ID=$(hostname)

echo "[$CLUSTER_ID] Waiting ${DELAY}s before Flux reconnection..."
sleep "$DELAY"

echo "[$CLUSTER_ID] Triggering Flux reconciliation..."
flux reconcile source git flux-system
flux reconcile kustomization flux-system --with-source

echo "[$CLUSTER_ID] Reconnection complete"
```

Configure this as a systemd service that triggers on network-up:

```ini
# /etc/systemd/system/flux-reconnect.service
[Unit]
Description=Staggered Flux reconnection on network restore
After=network-online.target
Wants=network-online.target
# Only run once per network-up event
StartLimitIntervalSec=60

[Service]
Type=oneshot
ExecStart=/usr/local/bin/stagger-reconnection.sh
RemainAfterExit=no

[Install]
WantedBy=network-online.target
```

## Step 4: Validate State After Reconnection

After Flux finishes reconciling, validate that the edge cluster is in the expected state.

```bash
#!/bin/bash
# validate-after-reconnection.sh
set -euo pipefail

CLUSTER_ID=$(hostname)
NAMESPACE="production"

echo "[$CLUSTER_ID] Validating cluster state after reconnection..."

# 1. Check Flux resources are all Ready
FAILED_FLUX=$(flux get all -A 2>/dev/null | grep -v "True" | grep -v "NAME" | wc -l)
if [ "$FAILED_FLUX" -gt 0 ]; then
  echo "WARNING: $FAILED_FLUX Flux resources are not Ready"
  flux get all -A | grep -v "True"
fi

# 2. Check application pods are Running
FAILED_PODS=$(kubectl get pods -n "$NAMESPACE" \
  --field-selector='status.phase!=Running,status.phase!=Succeeded' \
  -o name | wc -l)
if [ "$FAILED_PODS" -gt 0 ]; then
  echo "WARNING: $FAILED_PODS pods are not Running"
  kubectl get pods -n "$NAMESPACE" | grep -v Running | grep -v Completed
fi

# 3. Check expected image versions
EXPECTED_VERSION=$(flux get kustomization apps -n flux-system \
  -o jsonpath='{.status.lastAppliedRevision}')
echo "Applied revision: $EXPECTED_VERSION"

# 4. Run application health check
if curl -sf http://localhost/healthz > /dev/null; then
  echo "Application health check: OK"
else
  echo "WARNING: Application health check failed"
fi

echo "[$CLUSTER_ID] Validation complete"
```

## Step 5: Handle State Conflicts

If the edge cluster's local state has diverged from Git (due to manual changes made during the offline period), Flux will overwrite local changes during reconciliation.

```bash
# Preview what Flux will change during reconciliation
# Use server-side diff to see what would change
flux diff kustomization apps -n flux-system

# If you need to preserve local changes made during offline period,
# create a hotfix commit to Git before reconciliation:
kubectl get deployment my-app -n production -o yaml > /tmp/emergency-patch.yaml
# Edit to capture the offline change
# Add to Git repo on the central side, then allow reconnection
```

## Step 6: Monitor Reconnection Events Centrally

```yaml
# Flux alert when a site reconnects (source becomes ready after being unhealthy)
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: site-reconnection
  namespace: flux-system
spec:
  providerRef:
    name: slack-edge-ops
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: flux-system
  # Filter for Ready->True transitions
  summary: "Edge site {{ .InvolvedObject.Namespace }}/{{ .InvolvedObject.Name }} reconnected and reconciled"
```

Track reconnection metrics:

```bash
# Record reconnection in your observability system
curl -X POST https://monitoring.example.com/api/events \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"edge_site_reconnection\",
    \"site_id\": \"$(hostname)\",
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"offline_duration_minutes\": \"$OFFLINE_MINUTES\",
    \"commits_applied\": \"$COMMITS_APPLIED\"
  }"
```

## Best Practices

- Add random delays (jitter) to reconnection-triggered reconciliation to prevent thundering herd.
- Set Flux source `timeout` generously - reconnection pulls may be slow on saturated links.
- Monitor the age of the last successful Flux reconciliation as the primary connectivity health metric.
- Document what happens to manually-made emergency changes during a network outage - Flux will overwrite them.
- Test reconnection behavior quarterly by simulating an offline period in a test environment.
- Use `flux reconcile --with-source` after manual network restoration to speed up reconnection.

## Conclusion

Flux CD handles edge site reconnection gracefully, automatically applying all changes accumulated during the offline period in a single reconciliation cycle. The main operational considerations are preventing Git server overload from simultaneous reconnections (add jitter), managing image automation to avoid unreviewed updates, and validating cluster state after reconnection completes. With these practices in place, reconnection transitions from a potential incident to a routine, automated event.
