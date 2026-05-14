# How to Avoid Common Mistakes with Calico Component Version Compatibility

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Version Compatibility, CNI, Troubleshooting

Description: Common version compatibility mistakes in Calico deployments - from skipping minor versions to mismatched calicoctl - and how to prevent and fix them.

---

## Introduction

Version compatibility mistakes in Calico are typically not immediately obvious - the system continues running but with subtle failures: API calls returning errors, features that should work but don't, or policies that appear to apply but aren't enforced. These mistakes are preventable with proper version tracking and upgrade planning.

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

kubectl version -o yaml
kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'
# Cross-reference with https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
```

For EKS/GKE/AKS managed clusters with auto-upgrade enabled, disable auto-upgrade or set a maintenance window to review compatibility before each Kubernetes minor version upgrade.

## Mistake 2: Mismatched calicoctl Version

Using a `calicoctl` binary that doesn't match the cluster's Calico version causes commands to fail unless version mismatch checks are explicitly bypassed. Older `calicoctl` versions used after an upgrade can also result in unexpected behavior and data.

**Symptom**: `calicoctl` returns a version mismatch error, or commands run with `--allow-version-mismatch` return resources with unexpected fields.

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

**Symptom**: Calico appears partially healthy - some functions work but others don't. Error messages reference internal API version mismatches.

**Diagnosis**:
```bash
# Check all Calico component images
kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].image}{"\n"}{end}'
# All should show the same Calico version
```

**Prevention**: Use the documented Calico operator upgrade procedure - it updates the CRDs and operator-managed components together, preventing partial manual upgrades:
```bash
# Operator-managed upgrade: apply the CRDs and Tigera operator manifest for the target release
curl https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml -O
curl https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml -O
kubectl apply --server-side --force-conflicts -f v1_crd_projectcalico_org.yaml
kubectl apply --server-side --force-conflicts -f tigera-operator.yaml
```

## Mistake 4: Running End-of-Life Calico with Active Security Vulnerabilities

Calico follows a time-limited support policy. Older versions stop receiving security patches. Running an end-of-life Calico version with a known CVE is a significant security risk.

**Prevention**:
- Subscribe to Tigera security announcements
- Run a monthly audit of your Calico version against the list of active security advisories
- Define an SLA: "We will apply critical security patches within 7 days of release"

## Mistake 5: Not Updating the CRD Schema After Upgrades

Calico CRDs are versioned. When upgrading Calico, new CRD fields are not available to the Kubernetes API until the CRD manifests for the target Calico release have been applied.

**Symptom**: After upgrade, `calicoctl get` shows resources but new fields from the upgraded schema are rejected or unavailable.

**Fix**: After any Calico upgrade, verify CRDs are updated:
```bash
kubectl get crd | grep projectcalico
# Verify the served versions on a representative Calico CRD
kubectl get crd globalnetworkpolicies.crd.projectcalico.org \
  -o jsonpath='{range .spec.versions[*]}{.name}{"\t"}{.served}{"\n"}{end}'
```

The Calico operator handles CRD upgrades automatically. If managing Calico manually, ensure you apply the CRD manifests from the new version before upgrading the components.

## Best Practices

- Treat every Kubernetes minor upgrade as a trigger for a Calico compatibility review
- Use a version management script that checks all component versions against the compatibility matrix
- Run `calicoctl version` as part of your daily operational checks
- Keep a changelog of every Calico and Kubernetes version change in your cluster for incident investigation

## Conclusion

Version compatibility mistakes in Calico are preventable with version tracking, compatibility checks before upgrades, atomic upgrade processes (via the operator), and keeping `calicoctl` in sync with the cluster version. Building these checks into your upgrade procedure and daily operational runbook eliminates the majority of version-related failures.
