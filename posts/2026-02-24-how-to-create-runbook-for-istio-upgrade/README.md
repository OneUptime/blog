# How to Create Runbook for Istio Upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Upgrade, Operations

Description: A detailed runbook for upgrading Istio in production clusters using canary upgrades with pre-checks, validation steps, and rollback procedures.

---

Upgrading Istio in production is one of those tasks that needs to go smoothly every single time. A failed upgrade can break service-to-service communication across your entire mesh, which means potential downtime for everything. Having a well-tested runbook removes the guesswork and makes upgrades predictable and safe.

This runbook covers the canary upgrade approach, which is the recommended method for production environments because it allows you to validate the new version before cutting over all traffic.

## Runbook: Istio Canary Upgrade

### Purpose
Upgrade Istio from the current version to a target version using the canary upgrade method with minimal disruption to mesh traffic.

### Prerequisites

```bash
# 1. Record current version
istioctl version
CURRENT_VERSION=$(istioctl version --short --remote=false)

# 2. Verify target version compatibility
# Check the Istio release notes for the target version
# Ensure Kubernetes version is supported by the target Istio version

# 3. Download the target version of istioctl
TARGET_VERSION=1.24.0
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$TARGET_VERSION sh -
export PATH=$PWD/istio-$TARGET_VERSION/bin:$PATH

# 4. Run pre-upgrade check
istioctl x precheck

# 5. Verify cluster health
kubectl get nodes
kubectl get pods -n istio-system
istioctl proxy-status

# 6. Ensure no ongoing deployments
kubectl get pods --all-namespaces --field-selector=status.phase!=Running,status.phase!=Succeeded
```

### Pre-Upgrade Checklist

- [ ] Current Istio version recorded
- [ ] Target version istioctl downloaded and in PATH
- [ ] Pre-check passed
- [ ] All nodes healthy
- [ ] All istio-system pods running
- [ ] No pending deployments in progress
- [ ] Change management ticket approved
- [ ] Team notified of upcoming upgrade
- [ ] Monitoring dashboards open and showing healthy metrics
- [ ] IstioOperator configuration for target version prepared

### Step 1: Backup Current Configuration

```bash
# Backup the current IstioOperator configuration
kubectl get istiooperator -n istio-system -o yaml > istio-operator-backup.yaml

# Backup all Istio configuration resources
for resource in virtualservices destinationrules gateways serviceentries authorizationpolicies peerauthentications; do
  kubectl get $resource --all-namespaces -o yaml > backup-$resource.yaml
done

# Backup the istio configmap
kubectl get configmap istio -n istio-system -o yaml > istio-configmap-backup.yaml
```

### Step 2: Install the Canary Control Plane

The canary approach installs the new version alongside the current version with a revision label:

```bash
# Create the IstioOperator config for the new version
# Use a revision label to distinguish it from the current version
TARGET_REVISION=1-24-0

istioctl install --set revision=$TARGET_REVISION \
  --set components.pilot.k8s.resources.requests.cpu=500m \
  --set components.pilot.k8s.resources.requests.memory=512Mi \
  --set components.pilot.k8s.resources.limits.cpu=2000m \
  --set components.pilot.k8s.resources.limits.memory=2Gi \
  -y
```

### Step 3: Verify the Canary Control Plane

```bash
# Both old and new istiod should be running
kubectl get pods -n istio-system -l app=istiod

# Check the new revision is healthy
kubectl get deploy -n istio-system | grep istiod

# Verify the new version
istioctl version

# Check the mutating webhook for the new revision
kubectl get mutatingwebhookconfiguration | grep istio
```

You should see two istiod deployments: one for the current version and one with the canary revision.

### Step 4: Migrate a Test Namespace

Start by migrating a non-critical namespace to validate the new version:

```bash
# Remove the old injection label and add the new revision label
kubectl label namespace test-namespace istio-injection- istio.io/rev=$TARGET_REVISION

# Restart pods to pick up the new sidecar version
kubectl rollout restart deployment -n test-namespace

# Wait for rollout
kubectl rollout status deployment --all -n test-namespace --timeout=300s

# Verify pods are running with the new sidecar
istioctl proxy-status | grep test-namespace
# The PROXY VERSION column should show the new version
```

### Step 5: Validate the Test Namespace

```bash
# Check proxy versions
istioctl proxy-status | grep test-namespace

# Run Istio analysis
istioctl analyze -n test-namespace

# Verify mTLS is working
istioctl authn tls-check <pod-name>.test-namespace

# Check application health
kubectl get pods -n test-namespace
# All pods should be Running with 2/2 containers

# Test actual traffic flow
kubectl exec -n test-namespace deploy/<test-app> -c <container> -- \
  curl -s http://<service>:<port>/health
```

Monitor for at least 15 minutes:
- Request success rate should be > 99.9%
- Latency should be within normal range
- No errors in sidecar logs

```bash
# Check sidecar logs for errors
kubectl logs -n test-namespace deploy/<test-app> -c istio-proxy --tail=50 | grep -i error
```

### Step 6: Migrate Remaining Namespaces

Once the test namespace is validated, migrate remaining namespaces one at a time:

```bash
# List all namespaces with Istio injection
kubectl get namespace -l istio-injection=enabled

# For each namespace (do one at a time):
NAMESPACE=my-namespace
kubectl label namespace $NAMESPACE istio-injection- istio.io/rev=$TARGET_REVISION
kubectl rollout restart deployment -n $NAMESPACE
kubectl rollout status deployment --all -n $NAMESPACE --timeout=300s

# Validate after each namespace
istioctl proxy-status | grep $NAMESPACE
```

Wait 5-10 minutes between namespaces and monitor traffic health.

### Step 7: Migrate Gateways

Gateways need to be migrated separately:

```bash
# Check current gateway version
kubectl get pods -n istio-system -l app=istio-ingressgateway -o jsonpath='{.items[0].spec.containers[0].image}'

# The canary install should have created a new gateway deployment
kubectl get deploy -n istio-system | grep gateway
```

If using in-place upgrade for gateways:

```bash
# Update the gateway to use the new revision
istioctl install --set revision=$TARGET_REVISION \
  --set components.ingressGateways[0].name=istio-ingressgateway \
  --set components.ingressGateways[0].enabled=true \
  -y
```

### Step 8: Remove the Old Control Plane

After all workloads are migrated and validated:

```bash
# Verify no proxies are still connected to the old control plane
istioctl proxy-status
# All proxies should show the new version

# Remove the old control plane
istioctl uninstall --revision default -y

# Or if the old version had a specific revision:
# istioctl uninstall --revision <old-revision> -y

# Verify only the new istiod remains
kubectl get pods -n istio-system -l app=istiod
```

### Step 9: Post-Upgrade Validation

```bash
# Full mesh analysis
istioctl analyze --all-namespaces

# Verify all proxy versions match
istioctl proxy-status

# Check for any configuration issues
istioctl proxy-config listener --all

# Verify certificate issuance
istioctl proxy-config secret deploy/<any-pod> | head -10
```

### Rollback Procedure

If issues are found during the upgrade:

```bash
# Step 1: Switch namespaces back to the old version
kubectl label namespace $NAMESPACE istio.io/rev- istio-injection=enabled

# Step 2: Restart pods to revert sidecars
kubectl rollout restart deployment -n $NAMESPACE

# Step 3: Remove the canary control plane
istioctl uninstall --revision $TARGET_REVISION -y

# Step 4: Verify the old control plane is serving all proxies
istioctl proxy-status
```

### Completion Checklist

- [ ] All namespaces migrated to new revision
- [ ] All proxy versions show the new version
- [ ] Old control plane removed
- [ ] `istioctl analyze` shows no issues
- [ ] Application metrics show normal behavior for 30+ minutes
- [ ] Monitoring dashboards are green
- [ ] Rollback materials (backup configs) archived
- [ ] Upgrade documented with date, versions, and any issues encountered

### Timing Estimates

| Step | Estimated Duration |
|---|---|
| Prerequisites and backup | 15 minutes |
| Install canary control plane | 5 minutes |
| Migrate test namespace | 10 minutes |
| Validate test namespace | 15 minutes |
| Migrate remaining namespaces | 5-10 minutes per namespace |
| Migrate gateways | 10 minutes |
| Remove old control plane | 5 minutes |
| Post-upgrade validation | 15 minutes |

For a cluster with 10 namespaces, expect the full upgrade to take about 2-3 hours including validation time.
