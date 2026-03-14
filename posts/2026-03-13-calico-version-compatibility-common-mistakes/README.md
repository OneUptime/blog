# How to Avoid Common Mistakes with Calico Component Version Compatibility

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Version Compatibility, CNI, Troubleshooting, Upgrades, Best Practices

Description: Common version compatibility mistakes in Calico deployments — from skipping minor versions to mismatched calicoctl — and how to prevent and fix them.

---

## Introduction

Version compatibility mistakes in Calico are typically not immediately obvious — the system continues running but with subtle failures: API calls returning errors, features that should work but don't, or policies that appear to apply but aren't enforced. These mistakes are preventable with proper version tracking and upgrade planning.

## Prerequisites

- Current versions of all Calico components and Kubernetes documented
- Access to the Tigera version compatibility matrix
- `kubectl` and `calicoctl` configured

## Mistake 1: Upgrading Kubernetes Without Checking Calico Compatibility

The most common version mistake: upgrading Kubernetes (often via a managed service like EKS or GKE auto-upgrade) without checking whether the current Calico version supports the new Kubernetes version.

**Symptom**: After a Kubernetes upgrade, calico-node pods start failing with API version errors. Policies stop being enforced.

**Diagnosis**:
```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | \
  grep -i "error\|deprecated\|not supported"
```

**Prevention**: Check the compatibility matrix before any Kubernetes upgrade:
```bash
# Check current versions
kubectl version --short
kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'
# Cross-reference with https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
```

For EKS/GKE/AKS managed clusters with auto-upgrade enabled, disable auto-upgrade or set a maintenance window to review compatibility before each Kubernetes minor version upgrade.

## Mistake 2: Mismatched calicoctl Version

Using a `calicoctl` binary that doesn't match the cluster's Calico version causes silent failures — commands appear to succeed but the resources are created with the wrong API schema.

**Symptom**: `calicoctl get` works but returned resources have unexpected fields. `calicoctl apply` returns success but the resource is not applied correctly.

**Diagnosis**:
```bash
calicoctl version
# Compare "Client Version" with "Cluster Version"
# If they differ in minor version, update calicoctl
```

**Fix**: Download the matching calicoctl version:
```bash
CALICO_VERSION=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}' | grep -o 'v[0-9]*\.[0-9]*\.[0-9]*')
curl -L -o /usr/local/bin/calicoctl \
  https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calicoctl-linux-amd64
chmod +x /usr/local/bin/calicoctl
```

## Mistake 3: Partial Calico Component Upgrade

Upgrading only some Calico components (e.g., calico-node but not calico-kube-controllers) creates version skew between components. This is an unsupported state.

**Symptom**: Calico appears partially healthy — some functions work but others don't. Error messages reference internal API version mismatches.

**Diagnosis**:
```bash
# Check all Calico component images
kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
# All should show the same Calico version
```

**Prevention**: Use the Calico operator for upgrades — it updates all components atomically, preventing partial upgrades:
```bash
# Operator-managed upgrade: update the operator, which updates all components
kubectl set image deployment/tigera-operator \
  tigera-operator=quay.io/tigera/operator:v1.30.5 \
  -n tigera-operator
```

## Mistake 4: Running End-of-Life Calico with Active Security Vulnerabilities

Calico follows a time-limited support policy. Older versions stop receiving security patches. Running an end-of-life Calico version with a known CVE is a significant security risk.

**Prevention**:
- Subscribe to Tigera security announcements
- Run a monthly audit of your Calico version against the list of active security advisories
- Define an SLA: "We will apply critical security patches within 7 days of release"

## Mistake 5: Not Updating the CRD Schema After Upgrades

Calico CRDs are versioned. When upgrading Calico, new CRD features become available but old resources using the old schema may behave unexpectedly until they are re-applied.

**Symptom**: After upgrade, `calicoctl get` shows resources but new features in the upgraded schema are not available.

**Fix**: After any Calico upgrade, verify CRDs are updated:
```bash
kubectl get crd | grep calico
# Verify the creation timestamp is recent (post-upgrade)
kubectl get crd globalnetworkpolicies.crd.projectcalico.org -o yaml | grep "resourceVersion"
```

The Calico operator handles CRD upgrades automatically. If managing Calico manually, ensure you apply the CRD manifests from the new version before upgrading the components.

## Best Practices

- Treat every Kubernetes minor upgrade as a trigger for a Calico compatibility review
- Use a version management script that checks all component versions against the compatibility matrix
- Run `calicoctl version` as part of your daily operational checks
- Keep a changelog of every Calico and Kubernetes version change in your cluster for incident investigation

## Conclusion

Version compatibility mistakes in Calico are preventable with version tracking, compatibility checks before upgrades, atomic upgrade processes (via the operator), and keeping `calicoctl` in sync with the cluster version. Building these checks into your upgrade procedure and daily operational runbook eliminates the majority of version-related failures.
