# Upgrading Cilium on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K3s

Description: Step-by-step guide to safely upgrading Cilium on K3s clusters, including pre-upgrade checks, Helm-based upgrades, and post-upgrade validation.

---

## Introduction

Upgrading Cilium on K3s requires careful planning because the CNI is responsible for all pod networking. A failed upgrade can leave your cluster without network connectivity. Cilium supports rolling upgrades that maintain connectivity during the process, but only if you follow the correct upgrade path.

Cilium follows semantic versioning and supports upgrades between consecutive minor versions (e.g., 1.15 to 1.16). Skipping minor versions is not supported. The upgrade process uses Helm to update the Cilium deployment, which triggers a rolling restart of Cilium agents across the cluster.

This guide covers the complete upgrade lifecycle from pre-flight checks through post-upgrade validation.

## Prerequisites

- A K3s cluster running Cilium installed via Helm
- Helm v3 installed
- The Cilium CLI installed
- `kubectl` with cluster-admin access
- Knowledge of your current Cilium version

## Pre-Upgrade Checks

Verify the cluster is healthy before starting the upgrade:

```bash
# Check current Cilium version
cilium version
kubectl exec -n kube-system ds/cilium -- cilium version

# Verify cluster health
cilium status
kubectl get nodes
kubectl get pods -n kube-system -l app.kubernetes.io/part-of=cilium

# Run pre-flight check
cilium connectivity test

# Check for any ongoing issues
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10

# Record current Helm values for reference
helm get values cilium -n kube-system -o yaml > /tmp/cilium-current-values.yaml
cat /tmp/cilium-current-values.yaml
```

## Running the Cilium Pre-Flight Check

Cilium provides a pre-flight DaemonSet that validates upgrade compatibility:

```bash
# Deploy the pre-flight check for the target version
helm install cilium-preflight cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  --set preflight.enabled=true \
  --set agent=false \
  --set operator.enabled=false

# Wait for pre-flight pods to complete
kubectl rollout status daemonset/cilium-pre-flight-check -n kube-system --timeout=120s

# Check pre-flight results
kubectl logs -n kube-system -l k8s-app=cilium-pre-flight-check --tail=20

# Remove pre-flight check after verification
helm uninstall cilium-preflight -n kube-system
```

## Performing the Helm Upgrade

```bash
# Update the Helm repository
helm repo update cilium

# Check available versions
helm search repo cilium/cilium --versions | head -10

# Upgrade Cilium to the target version
# Reuse your existing values and only change the version
helm upgrade cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  --reuse-values

# Monitor the rolling upgrade
kubectl rollout status daemonset/cilium -n kube-system --timeout=600s
kubectl rollout status deployment/cilium-operator -n kube-system --timeout=120s

# If Hubble is enabled, verify its components also upgraded
kubectl rollout status deployment/hubble-relay -n kube-system --timeout=120s 2>/dev/null
```

If you need to modify values during the upgrade:

```yaml
# cilium-upgrade-values.yaml
# Values to apply during the upgrade
# Only include values you want to change or ensure are set
operator:
  replicas: 1

ipam:
  operator:
    clusterPoolIPv4PodCIDRList:
      - "10.42.0.0/16"

kubeProxyReplacement: true
```

```bash
helm upgrade cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  -f cilium-upgrade-values.yaml
```

## Post-Upgrade Validation

Verify the upgrade was successful:

```bash
# Verify the new version is running
cilium version
kubectl exec -n kube-system ds/cilium -- cilium version

# Check all Cilium components are healthy
cilium status

# Run the connectivity test to verify networking
cilium connectivity test

# Check for any pods that were disrupted during upgrade
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Verify services are still accessible
kubectl run upgrade-test --image=busybox --restart=Never -- \
  wget -qO- --timeout=5 http://kubernetes.default.svc:443 2>&1
kubectl logs upgrade-test 2>/dev/null
kubectl delete pod upgrade-test
```

## Rolling Back If Needed

If the upgrade causes issues, roll back to the previous version:

```bash
# Check Helm release history
helm history cilium -n kube-system

# Rollback to the previous release
helm rollback cilium -n kube-system

# Wait for rollback to complete
kubectl rollout status daemonset/cilium -n kube-system --timeout=600s

# Verify rollback was successful
cilium version
cilium status
```

## Verification

Complete upgrade verification checklist:

```bash
echo "=== Cilium Upgrade Verification ==="
echo "1. Version:"
cilium version | head -2
echo ""
echo "2. Status:"
cilium status | head -15
echo ""
echo "3. Nodes:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions[-1].type,VERSION:.status.nodeInfo.kubeletVersion
echo ""
echo "4. Cilium Pods:"
kubectl get pods -n kube-system -l app.kubernetes.io/part-of=cilium -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName
```

## Troubleshooting

- **Upgrade hangs during DaemonSet rollout**: Check if PodDisruptionBudgets are blocking pod eviction. The default Cilium PDB allows one pod to be unavailable. If only one node exists, the PDB may block the rollout. Use `kubectl delete pdb cilium-agent -n kube-system` temporarily.
- **Pods lose connectivity during upgrade**: This indicates the upgrade is not rolling correctly. Check that `updateStrategy.rollingUpdate.maxUnavailable` is set to 1 (default) in the DaemonSet spec.
- **New features not available after upgrade**: Some features require configuration changes in addition to the version upgrade. Check the Cilium release notes for your target version.
- **Helm upgrade fails with validation errors**: New versions may introduce required values or change value schemas. Compare your current values with the new chart defaults using `helm show values cilium/cilium --version TARGET_VERSION`.

## Conclusion

Upgrading Cilium on K3s follows a predictable path: pre-flight check, Helm upgrade, rolling DaemonSet restart, and post-upgrade validation. Always upgrade one minor version at a time, run the pre-flight check before the actual upgrade, monitor the rolling restart closely, and validate with connectivity tests afterward. Keep the rollback path ready in case issues arise during the upgrade.
