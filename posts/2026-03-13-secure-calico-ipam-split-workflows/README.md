# Securing Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Security, RBAC, Networking, IP Pools, CNI

Description: Secure Calico IPAM split operations by restricting who can modify IP pools, audit-logging all IPAM changes, and preventing accidental deletion of active pools using RBAC and admission controls.

---

## Introduction

IPAM splits touch some of the most critical Calico resources in your cluster. An IPPool deletion at the wrong time can leave running pods with IPs that the IPAM system no longer recognizes, causing routing failures. An unauthorized pool modification can redirect pod IP allocations to the wrong CIDR, breaking network policies.

This post covers RBAC scoping for IPAM operations, audit logging of pool changes, and protecting active pools from accidental deletion.

---

## Prerequisites

- Calico v3.x installed with `calicoctl` v3.x
- Kubernetes RBAC knowledge
- `kubectl` cluster-admin access
- Understanding of the Calico IPPool resource (`projectcalico.org/v3`)

---

## Step 1: Restrict IPPool Modification to Dedicated Roles

By default, any cluster-admin can modify IP pools. Scope this to a dedicated role:

```yaml
# ipam-operator-role.yaml
# ClusterRole for engineers authorized to perform IPAM splits
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-ipam-operator
rules:
  # Full IPAM pool management — assign only to IPAM operators
  - apiGroups: ["crd.projectcalico.org"]
    resources:
      - ippools
      - ipamblocks
      - ipamconfigs
      - blockaffinities
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Read-only access to nodes for node selector planning
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
---
# ClusterRole for engineers who can read IPAM state but not modify it
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calico-ipam-viewer
rules:
  - apiGroups: ["crd.projectcalico.org"]
    resources:
      - ippools
      - ipamblocks
      - ipamconfigs
      - blockaffinities
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
```

```bash
kubectl apply -f ipam-operator-role.yaml

# Bind the operator role to only the engineers who perform IPAM splits
kubectl create clusterrolebinding ipam-operator-binding \
  --clusterrole=calico-ipam-operator \
  --user=platform-engineer@example.com
```

---

## Step 2: Verify RBAC is Enforced

```bash
# Confirm a regular developer cannot modify IP pools
kubectl auth can-i delete ippools.crd.projectcalico.org \
  --as=developer@example.com
# Expected: no

# Confirm the IPAM operator can perform splits
kubectl auth can-i create ippools.crd.projectcalico.org \
  --as=platform-engineer@example.com
# Expected: yes

# Confirm the IPAM viewer can only read
kubectl auth can-i delete ippools.crd.projectcalico.org \
  --as=monitoring@example.com
# Expected: no
```

---

## Step 3: Enable Audit Logging for IPPool Changes

Configure the Kubernetes audit policy to record all IPPool create, update, patch, and delete operations:

```yaml
# In /etc/kubernetes/audit-policy.yaml — add before the catch-all rule
# Records all modifications to Calico IPPool resources
- level: Request
  resources:
    - group: crd.projectcalico.org
      resources:
        - ippools
        - ipamblocks
        - ipamconfigs
  verbs: ["create", "update", "patch", "delete"]
  # Log the full request body so you can see what changed
```

After the API server picks up the audit policy, verify changes appear in the audit log:

```bash
# Watch for IPPool changes in the audit log
grep "ippools" /var/log/kubernetes/audit.log | grep -E "create|update|delete" | tail -10
```

---

## Step 4: Protect Active Pools from Accidental Deletion

Add a Kubernetes finalizer annotation to active IP pools to require a deliberate two-step deletion:

```yaml
# ippool-protected.yaml
# IP pool with a protection annotation to prevent accidental deletion
# Note: Kubernetes finalizers on CRDs require a controller to process them
# Use annotations as a process-level guard instead
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: prod-zone-a
  annotations:
    # Document deletion prerequisites as metadata
    # Enforcement relies on team process and audit log review
    calico.oneuptime.io/deletion-requires: "zero-allocations-verified"
    calico.oneuptime.io/pool-owner: "platform-team"
    calico.oneuptime.io/last-verified: "2026-03-13"
spec:
  cidr: 10.0.0.0/17
  nodeSelector: "zone == 'zone-a'"
  ipipMode: Never
  vxlanMode: Always
  natOutgoing: true
  disabled: false
```

Before deleting any pool, run the verification script:

```bash
#!/bin/bash
# verify-pool-safe-to-delete.sh
# Verifies that an IP pool has zero allocations before deletion is safe

POOL_NAME="$1"
POOL_CIDR=$(calicoctl get ippool "$POOL_NAME" \
  -o jsonpath='{.spec.cidr}' 2>/dev/null)

echo "=== Pre-deletion check for pool: $POOL_NAME ($POOL_CIDR) ==="

# Check that the pool is disabled (must be disabled before deletion)
DISABLED=$(calicoctl get ippool "$POOL_NAME" \
  -o jsonpath='{.spec.disabled}' 2>/dev/null)
if [ "$DISABLED" != "true" ]; then
  echo "[FAIL] Pool $POOL_NAME is not disabled. Disable it first."
  exit 1
fi
echo "[PASS] Pool is disabled"

# Run IPAM consistency check
calicoctl ipam check 2>&1 | grep -q "consistent" && \
  echo "[PASS] IPAM is consistent" || \
  { echo "[FAIL] IPAM is not consistent"; exit 1; }

echo ""
echo "[OK] Pool appears safe to delete. Review block allocation output above."
echo "     Run: calicoctl delete ippool $POOL_NAME"
```

---

## Best Practices

- Restrict `delete` verb on `ippools` to a named IPAM operator role; not even cluster-admin accounts used daily should have this permission.
- Always disable a pool before deleting it — disabling first prevents new allocations and makes the deletion a two-step process that is harder to perform accidentally.
- Require two-person review (four-eyes principle) for all IPPool deletions in production.
- Retain IPPool audit log entries for at least 90 days to support incident investigations.
- Use `calicoctl ipam check` as part of the audit trail — run it before and after every IPAM change and record the output in your change management system.

---

## Conclusion

Securing IPAM splits requires restricting write access to a small, named group of operators, logging every modification for audit purposes, and establishing a process gate — pool disablement before deletion — that prevents accidental data loss. These controls make IPAM operations auditable and reversible.

---

*Correlate IPAM change events with service reliability metrics in [OneUptime](https://oneuptime.com).*
