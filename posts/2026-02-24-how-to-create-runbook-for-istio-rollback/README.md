# How to Create Runbook for Istio Rollback

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Rollback, Operations

Description: A step-by-step runbook for rolling back Istio upgrades and configuration changes safely in production environments.

---

Rolling back Istio is something you hope you never need to do, but absolutely must be prepared for. When an upgrade goes wrong or a configuration change breaks traffic flow, having a clear rollback procedure is the difference between a 5-minute recovery and a multi-hour outage. This runbook covers the most common rollback scenarios and gives you exact commands to execute.

## Runbook: Istio Rollback

### Purpose
Restore Istio to a known good state after a failed upgrade or problematic configuration change.

### When to Trigger This Runbook

Use this runbook when any of the following occur after an Istio upgrade or configuration change:

- Service-to-service communication failures exceeding error budget
- P99 latency increased by more than 50%
- istiod pods are crash-looping
- Sidecar injection is failing for new pods
- mTLS connectivity broken between services
- Gateway is not routing traffic correctly

### Scenario 1: Rollback a Canary Upgrade

If you performed a canary upgrade and the new revision is causing problems:

#### Step 1: Identify Which Namespaces Are on the New Revision

```bash
# List namespaces with the new revision label
kubectl get namespaces -l istio.io/rev

# Check which proxies are running the new version
istioctl proxy-status | awk '{print $1, $NF}' | sort -k2
```

#### Step 2: Revert Namespaces to the Old Version

```bash
# For each namespace that was migrated to the new revision:
OLD_REVISION=default  # or the previous revision label
NEW_REVISION=1-24-0

# Remove the new revision label and restore the old injection method
kubectl label namespace <namespace> istio.io/rev- istio-injection=enabled

# Restart all deployments to pick up the old sidecar
kubectl rollout restart deployment -n <namespace>

# Wait for rollout to complete
kubectl rollout status deployment --all -n <namespace> --timeout=300s
```

Script to revert all affected namespaces:

```bash
#!/bin/bash
NEW_REVISION=1-24-0
NAMESPACES=$(kubectl get namespaces -l istio.io/rev=$NEW_REVISION -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
  echo "Reverting namespace: $ns"
  kubectl label namespace $ns istio.io/rev- istio-injection=enabled --overwrite
  kubectl rollout restart deployment -n $ns
  kubectl rollout status deployment --all -n $ns --timeout=300s
  echo "Namespace $ns reverted"
  sleep 10  # Brief pause between namespaces
done
```

#### Step 3: Verify All Proxies Are on the Old Version

```bash
# All proxies should show the old version
istioctl proxy-status

# Check for any stragglers
istioctl proxy-status | grep $NEW_REVISION
# This should return no results
```

#### Step 4: Remove the New Control Plane

```bash
# Only after all proxies are back on the old version
istioctl uninstall --revision $NEW_REVISION -y

# Verify only the old istiod remains
kubectl get pods -n istio-system -l app=istiod
kubectl get deploy -n istio-system | grep istiod
```

### Scenario 2: Rollback an In-Place Upgrade

If you performed an in-place upgrade (not canary) and need to go back:

#### Step 1: Install the Previous Version of istioctl

```bash
# Download the previous version
PREVIOUS_VERSION=1.23.0
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$PREVIOUS_VERSION sh -
export PATH=$PWD/istio-$PREVIOUS_VERSION/bin:$PATH

# Verify
istioctl version --remote=false
```

#### Step 2: Restore the Previous Configuration

```bash
# If you have the backup IstioOperator config:
istioctl install -f istio-operator-backup.yaml -y

# Or install with the previous version's default profile:
istioctl install --set profile=default -y
```

#### Step 3: Restart All Meshed Workloads

```bash
# Restart all deployments in meshed namespaces to get the old sidecar version
MESHED_NS=$(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}')

for ns in $MESHED_NS; do
  echo "Restarting deployments in $ns"
  kubectl rollout restart deployment -n $ns
  kubectl rollout status deployment --all -n $ns --timeout=300s
done
```

#### Step 4: Verify

```bash
istioctl proxy-status
# All proxies should show the old version
```

### Scenario 3: Rollback a Configuration Change

If an Istio configuration resource (VirtualService, DestinationRule, AuthorizationPolicy, etc.) is causing issues:

#### Step 1: Identify the Problematic Resource

```bash
# Check recently modified Istio resources
kubectl get virtualservices,destinationrules,authorizationpolicies,gateways \
  --all-namespaces --sort-by=.metadata.creationTimestamp

# Run Istio analysis to find issues
istioctl analyze --all-namespaces
```

#### Step 2: Revert the Configuration

If you have backups:

```bash
# Restore from backup files
kubectl apply -f backup-virtualservices.yaml
kubectl apply -f backup-destinationrules.yaml
kubectl apply -f backup-authorizationpolicies.yaml
```

If using GitOps (Argo CD or Flux):

```bash
# Revert the git commit that introduced the change
git revert <commit-hash>
git push origin main

# Wait for the GitOps controller to sync
# Or force a sync:
argocd app sync istio-config
```

If you need to delete a recently added resource:

```bash
# Delete the specific problematic resource
kubectl delete virtualservice <name> -n <namespace>
kubectl delete destinationrule <name> -n <namespace>
kubectl delete authorizationpolicy <name> -n <namespace>
```

#### Step 3: Verify Configuration Propagation

```bash
# Check that the configuration has been pushed to proxies
istioctl proxy-config route <pod-name> -n <namespace>
istioctl proxy-config cluster <pod-name> -n <namespace>

# Check push status
istioctl proxy-status
# Look for STALE entries - they indicate proxies that haven't received the update
```

### Scenario 4: Emergency Complete Removal

In extreme cases where Istio itself is causing a cluster-wide outage:

```bash
# Step 1: Remove sidecar injection immediately
# This prevents new pods from getting sidecars
kubectl delete mutatingwebhookconfiguration istio-sidecar-injector
kubectl delete mutatingwebhookconfiguration istio-revision-tag-default

# Step 2: Restart all workloads (they will come up without sidecars)
kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}' | \
  xargs -I {} kubectl rollout restart deployment -n {}

# Step 3: Once traffic is flowing again, properly uninstall Istio
istioctl uninstall --purge -y
kubectl delete namespace istio-system
```

WARNING: This is a destructive operation. It removes all mTLS enforcement, traffic policies, and routing rules. Use only as a last resort.

### Post-Rollback Verification

After any rollback, verify these items:

```bash
# 1. All pods are running
kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded | grep -v Completed

# 2. Service connectivity
# Test a known service-to-service call
kubectl exec deploy/<source-app> -c <container> -- curl -s http://<destination>:<port>/health

# 3. Ingress traffic
curl -s http://<ingress-ip>/health

# 4. Metrics are flowing
# Check Prometheus for recent istio_requests_total data points

# 5. No error spikes
# Check your monitoring dashboards for the 5 minutes following rollback
```

### Root Cause Analysis

After stabilizing the environment, document:

1. What change was made that required rollback
2. What symptoms were observed
3. How long the incident lasted
4. What rollback steps were taken
5. Root cause (if determined)
6. Action items to prevent recurrence

### Rollback Time Estimates

| Scenario | Estimated Time |
|---|---|
| Revert single config resource | 2-5 minutes |
| Rollback canary upgrade (single namespace) | 10-15 minutes |
| Rollback canary upgrade (full mesh) | 30-60 minutes |
| Rollback in-place upgrade | 45-90 minutes |
| Emergency complete removal | 15-30 minutes |

Practice rollback procedures in staging environments regularly. A rollback procedure that you have never actually tested is just a hope, not a plan.
