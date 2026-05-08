# Upgrading Cilium on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, k3s

Description: Step-by-step guide to safely upgrading Cilium on K3s clusters, including pre-upgrade checks, Helm-based upgrades, and post-upgrade validation.

---

## Introduction

Upgrading Cilium on K3s requires careful planning because the CNI is responsible for all pod networking. A failed upgrade can leave your cluster without network connectivity. Cilium supports rolling upgrades that maintain connectivity during the process, but only if you follow the correct upgrade path.

Cilium follows semantic versioning, and the only tested upgrade and rollback path is between consecutive minor versions (e.g., 1.15 to 1.16). Skipping minor versions is not supported. Always update to the latest patch release of your current minor version before upgrading to the next minor version. The upgrade process uses Helm to update the Cilium deployment, which triggers a rolling restart of Cilium agents across the cluster.

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

# Run a connectivity check
cilium connectivity test

# Check for any ongoing issues
kubectl get events -n kube-system --sort-by='.lastTimestamp' | grep cilium | tail -10

# Record current Helm values for the upgrade
helm get values cilium -n kube-system -o yaml > cilium-upgrade-values.yaml
cat cilium-upgrade-values.yaml
```

## Running the Cilium Pre-Flight Check

Cilium provides a pre-flight DaemonSet that validates upgrade compatibility:

```bash
# Deploy the pre-flight check for the target version
helm install cilium-preflight cilium/cilium --version 1.19.3 \
  --namespace kube-system \
  --set preflight.enabled=true \
  --set agent=false \
  --set operator.enabled=false \
  --set k8sServiceHost=API_SERVER_IP \
  --set k8sServicePort=API_SERVER_PORT

# Wait for pre-flight pods to be ready
kubectl rollout status daemonset/cilium-pre-flight-check -n kube-system --timeout=120s
kubectl rollout status deployment/cilium-pre-flight-check -n kube-system --timeout=120s

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
# Use your reviewed existing values and set upgradeCompatibility to the
# initial Cilium minor version installed in this cluster.
helm upgrade cilium cilium/cilium --version 1.19.3 \
  --namespace kube-system \
  -f cilium-upgrade-values.yaml \
  --set upgradeCompatibility=1.X

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
# Include the values you want to preserve, change, or ensure are set
upgradeCompatibility: "1.X"

operator:
  replicas: 1

ipam:
  operator:
    clusterPoolIPv4PodCIDRList:
      - "10.42.0.0/16"

kubeProxyReplacement: true
k8sServiceHost: "API_SERVER_IP"
k8sServicePort: "API_SERVER_PORT"
```

```bash
helm upgrade cilium cilium/cilium --version 1.19.3 \
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
kubectl run upgrade-test --image=curlimages/curl --restart=Never -- \
  -ks https://kubernetes.default.svc
kubectl logs upgrade-test 2>/dev/null
kubectl delete pod upgrade-test
```

## Rolling Back If Needed

If the upgrade causes issues, roll back to the previous version:

```bash
# Check Helm release history
helm history cilium -n kube-system

# Rollback to the previous release revision
helm rollback cilium REVISION -n kube-system

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

- **Upgrade hangs during DaemonSet rollout**: Check the new Cilium pod events and logs for image pull errors, Kubernetes API connectivity issues, or invalid Helm values.
- **Pods lose connectivity during upgrade**: This can indicate the upgrade is restarting too many agents at once for your cluster. Consider reducing `updateStrategy.rollingUpdate.maxUnavailable` in the DaemonSet spec.
- **New features not available after upgrade**: Some features require configuration changes in addition to the version upgrade. Check the Cilium release notes for your target version.
- **Helm upgrade fails with validation errors**: New versions may introduce required values or change value schemas. Compare your current values with the new chart defaults using `helm show values cilium/cilium --version TARGET_VERSION`.

## Conclusion

Upgrading Cilium on K3s follows a predictable path: pre-flight check, Helm upgrade, rolling DaemonSet restart, and post-upgrade validation. Always upgrade one minor version at a time, run the pre-flight check before the actual upgrade, monitor the rolling restart closely, and validate with connectivity tests afterward. Keep the rollback path ready in case issues arise during the upgrade.
