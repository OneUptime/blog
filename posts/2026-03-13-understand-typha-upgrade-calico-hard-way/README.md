# Understanding Typha Upgrades in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, Upgrades, CNI, Networking, Maintenance

Description: Build a thorough understanding of the Typha upgrade process in a manifest-based Calico installation — including version compatibility matrices, upgrade ordering between Typha and Felix, and how to execute a safe upgrade with zero policy enforcement gaps.

---

## Introduction

Upgrading Calico "the hard way" means upgrading each component — Typha, Felix (calico-node), and calicoctl — by updating the container images in the respective Kubernetes resources. This gives you precise control over the upgrade sequence, but it also means you are responsible for getting the order right. Upgrading Felix before Typha, for example, creates a version skew window that may not be supported.

This post covers the correct upgrade order, version compatibility requirements, the steps to upgrade Typha safely, and how to verify the upgrade succeeded.

---

## Prerequisites

- Typha deployed in manifest mode per the setup post
- Current Typha, Felix, and calicoctl versions documented
- Access to the Calico release notes for the target version
- `kubectl` and `calicoctl` access
- Prometheus metrics available for monitoring during the upgrade

---

## Step 1: Check the Version Compatibility Matrix

Before upgrading, consult the Calico release notes to determine which versions of Typha, Felix, and calicoctl are compatible with each other.

The general rule for Calico is:

- Typha must be upgraded **before** Felix
- A one minor version skew between Typha and Felix is usually supported (check release notes)
- `calicoctl` should match the cluster's Calico API version

```bash
# Check the current versions of each component
echo "=== Current Typha version ==="
kubectl get deployment calico-typha -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

echo "=== Current Felix (calico-node) version ==="
kubectl get daemonset calico-node -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="calico-node")].image}{"\n"}'

echo "=== Current calicoctl version ==="
calicoctl version --client

echo ""
echo "Review the Calico release notes at:"
echo "https://docs.tigera.io/calico/latest/release-notes/"
```

---

## Step 2: Understand the Safe Upgrade Order

For a Calico minor version upgrade (e.g., 3.26 to 3.27):

```
1. Upgrade calicoctl CLI (out of band, no cluster impact)
2. Upgrade Typha (rolling Deployment update)
3. Upgrade calico-node DaemonSet (rolling DaemonSet update)
4. Verify post-upgrade health
```

Upgrading in this order ensures that Typha always runs an equal or newer version than the Felix agents connecting to it.

---

## Step 3: Upgrade Typha

Update the Typha Deployment with the new image version:

```bash
# Verify the new image tag exists before applying
docker manifest inspect calico/typha:v3.27.0 2>/dev/null || \
  echo "Image not found — verify tag"

# Update Typha to the new version
kubectl set image deployment/calico-typha \
  calico-typha=calico/typha:v3.27.0 \
  -n kube-system

# Monitor the rolling update — each pod replacement takes ~45–60 seconds
kubectl rollout status deployment/calico-typha -n kube-system --timeout=300s

# Verify all pods are running the new version
kubectl get pods -n kube-system -l k8s-app=calico-typha \
  -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[0].image}{"\n"}{end}'
```

---

## Step 4: Verify Typha Health After Upgrade

Before upgrading Felix, confirm Typha is healthy with the new image:

```bash
# Confirm all Typha pods are Running and Ready
kubectl get pods -n kube-system -l k8s-app=calico-typha

# Check Typha logs for any errors with the new version
kubectl logs -n kube-system -l k8s-app=calico-typha --tail=50 | grep -iE "error|fatal|panic"
# Expected: no errors

# Confirm Felix agents are still connected to Typha
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl exec -n kube-system $TYPHA_POD -- wget -qO- \
  http://localhost:9093/metrics 2>/dev/null | grep typha_connections_active
# Expected: non-zero value equal to approximately the number of nodes
```

---

## Step 5: Upgrade calico-node (Felix)

After Typha is verified, upgrade the calico-node DaemonSet:

```bash
# Update calico-node to the new version
kubectl set image daemonset/calico-node \
  calico-node=calico/node:v3.27.0 \
  -n kube-system

# Monitor the rolling DaemonSet update
# This takes significantly longer than the Deployment update because
# every node restarts its Felix agent sequentially
kubectl rollout status daemonset/calico-node -n kube-system --timeout=600s

# For large clusters, watch the DaemonSet rollout more granularly
watch -n 5 'kubectl get daemonset calico-node -n kube-system \
  -o custom-columns="DESIRED:.status.desiredNumberScheduled,UPDATED:.status.updatedNumberScheduled,READY:.status.numberReady"'
```

---

## Step 6: Validate the Full Upgrade

After both Typha and calico-node are upgraded, run the validation checklist:

```bash
echo "=== Post-Upgrade Validation ==="

# Verify Typha version
echo "Typha version:"
kubectl get pods -n kube-system -l k8s-app=calico-typha \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Verify Felix version
echo "Felix version:"
kubectl get pods -n kube-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[?(@.name=="calico-node")].image}'

# Verify policy still enforced (apply and delete a test policy)
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: upgrade-verification-test
spec:
  selector: "has(upgrade-test)"
  ingress:
    - action: Allow
EOF

calicoctl get globalnetworkpolicy upgrade-verification-test && \
  echo "Policy propagation: OK"
calicoctl delete globalnetworkpolicy upgrade-verification-test

# Check Typha connections are healthy
TYPHA_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-typha -o name | head -1)
kubectl exec -n kube-system $TYPHA_POD -- wget -qO- \
  http://localhost:9093/metrics 2>/dev/null | grep typha_connections_active
```

---

## Best Practices

- Always read the Calico release notes for the target version before upgrading; breaking changes and migration steps are documented there.
- Never upgrade Typha and calico-node simultaneously; upgrading one at a time with a health check in between reduces the blast radius of any version incompatibility.
- Upgrade in staging first; the calico-node DaemonSet rollout is slow (one node at a time) and can surface compatibility issues before production.
- Set `maxUnavailable: 1` on the calico-node DaemonSet rollout strategy to limit impact to one node at a time.
- Keep the previous image tag noted in your change log so you can roll back quickly if the upgrade causes problems.

---

## Conclusion

Typha upgrades in manifest mode follow a clear sequence: upgrade calicoctl, then Typha, then calico-node. Each step must be verified before proceeding to the next. By understanding the version compatibility requirements and the rolling update mechanics, you can execute Calico upgrades confidently without disrupting network policy enforcement across the cluster.

---

*Monitor your Calico upgrade rollout progress and detect stalled pods with [OneUptime](https://oneuptime.com).*
