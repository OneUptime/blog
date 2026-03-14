# How to Validate Calico Component Version Compatibility in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Version Compatibility, CNI, Lab, Testing, Upgrades, Validation

Description: Step-by-step procedures for validating Calico and Kubernetes version compatibility in a lab environment before production upgrades.

---

## Introduction

Version compatibility validation in a lab cluster serves two purposes: confirming that your planned upgrade sequence is supported, and verifying that no functionality is broken after the upgrade. A lab validation should mirror the production upgrade sequence exactly — same versions, same order, same configuration.

This guide walks through the complete version compatibility validation workflow, from pre-upgrade checks to post-upgrade functional testing.

## Prerequisites

- A lab Kubernetes cluster running a Calico version matching production
- `kubectl` and `calicoctl` configured
- The Tigera version compatibility matrix (available at docs.tigera.io)
- Your target Kubernetes and Calico versions identified

## Step 1: Pre-Upgrade Version Audit

Document your current versions before making any changes:

```bash
# Current Kubernetes version
kubectl version --short

# Current Calico version (from calico-node pods)
kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Current Calico operator version
kubectl get deployment tigera-operator -n tigera-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# Current calicoctl version
calicoctl version

# Document all in a pre-upgrade record
echo "Pre-upgrade versions:" > upgrade-record.txt
echo "Kubernetes: $(kubectl version --short 2>/dev/null | grep Server)" >> upgrade-record.txt
echo "Calico: $(kubectl get pods -n calico-system -l k8s-app=calico-node -o jsonpath='{.items[0].spec.containers[0].image}')" >> upgrade-record.txt
```

## Step 2: Compatibility Matrix Check

Cross-reference your current and target versions with the Tigera compatibility matrix:

```bash
# Current K8s version
K8S_VERSION=$(kubectl version -o json | jq -r '.serverVersion.minor')
echo "Current Kubernetes minor version: $K8S_VERSION"

# Target Calico version's supported K8s range
# Check at: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
```

Verify that:
1. Your target Calico version supports your target Kubernetes version
2. Your target Calico version supports your current Kubernetes version (so you can upgrade Calico first)

## Step 3: Pre-Upgrade Functional Baseline

Record the baseline state before upgrading:

```bash
# Deploy test pods
kubectl run pre-upgrade-test-server --image=nginx
kubectl run pre-upgrade-test-client --image=nicolaka/netshoot -- sleep 3600

SERVER_IP=$(kubectl get pod pre-upgrade-test-server -o jsonpath='{.status.podIP}')

# Test connectivity
kubectl exec pre-upgrade-test-client -- wget -qO- http://$SERVER_IP
# Record result

# Test policy enforcement
kubectl apply -f test-deny-policy.yaml
kubectl exec pre-upgrade-test-client -- wget --timeout=5 -qO- http://$SERVER_IP
# Record: should timeout

# Check node status
calicoctl node status > pre-upgrade-node-status.txt
kubectl get nodes > pre-upgrade-node-state.txt
```

## Step 4: Upgrade Calico in the Lab

Using the Calico operator:

```bash
# Patch the operator to use the new version
kubectl set image deployment/tigera-operator \
  tigera-operator=quay.io/tigera/operator:v1.30.0 \
  -n tigera-operator

# Or update the Installation resource for the Calico version
kubectl patch installation default \
  --type merge \
  -p '{"spec":{"variant":"Calico"}}'

# Wait for upgrade to complete
kubectl rollout status daemonset calico-node -n calico-system
kubectl rollout status deployment calico-kube-controllers -n calico-system
```

## Step 5: Post-Calico-Upgrade Validation

```bash
# Verify new Calico version
kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'

# Check TigeraStatus for any issues
kubectl get tigerastatus

# Re-run connectivity tests
kubectl exec pre-upgrade-test-client -- wget -qO- http://$SERVER_IP
# Expected: Same result as baseline

# Re-check node status
calicoctl node status
# Compare with pre-upgrade-node-status.txt
```

## Step 6: Upgrade Kubernetes in the Lab

After Calico upgrade is validated, upgrade Kubernetes (method depends on your cluster provider):

```bash
# For kubeadm clusters:
sudo kubeadm upgrade plan
sudo kubeadm upgrade apply v1.28.0

# Wait for control plane
kubectl get nodes
```

## Step 7: Post-Kubernetes-Upgrade Validation

```bash
# Verify Kubernetes version
kubectl version --short

# Verify Calico is still healthy after Kubernetes upgrade
kubectl get tigerastatus
kubectl get pods -n calico-system

# Re-run full connectivity and policy tests
kubectl exec pre-upgrade-test-client -- wget -qO- http://$SERVER_IP
kubectl exec pre-upgrade-test-client -- wget --timeout=5 -qO- http://$SERVER_IP
# Policy should still be enforced

# Check calicoctl compatibility
calicoctl version
# Update calicoctl if version doesn't match
```

## Validation Checklist

| Check | Pre-Upgrade | Post-Calico | Post-K8s |
|---|---|---|---|
| Version documented | Yes | Yes | Yes |
| Node connectivity | Working | Working | Working |
| Policy enforcement | Working | Working | Working |
| calicoctl version sync | Match | Match | Match |
| TigeraStatus healthy | — | All Available | All Available |

## Best Practices

- Mirror the production environment exactly in the lab — same node OS, kernel version, and cluster configuration
- Keep the upgrade record file for post-incident analysis if production upgrades have issues
- Run the lab validation at least one week before the planned production upgrade to allow time for issue discovery

## Conclusion

Lab version compatibility validation confirms that the planned upgrade sequence is supported and functional before affecting production. The four-phase approach — pre-upgrade baseline, Calico upgrade, Kubernetes upgrade, post-upgrade validation — ensures each component upgrade is independently validated before combining them, reducing the risk of compounding failures during the production upgrade window.
