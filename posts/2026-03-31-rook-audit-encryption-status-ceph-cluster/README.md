# How to Audit Encryption Status Across a Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, Audit, Security, Compliance

Description: Learn how to audit encryption status across all OSDs in a Ceph cluster, verify that LUKS encryption is active on each device, and generate compliance reports.

---

## Why Audit Encryption Status?

Security and compliance requirements often mandate that all storage is encrypted at rest. Auditing verifies that every OSD in the cluster is actually using LUKS encryption, that no devices were accidentally provisioned without encryption, and that keys are properly managed.

## Step 1: Check Rook CephCluster Configuration

Verify encryption is configured in the CephCluster spec:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o jsonpath='{.spec.storage.config.encryptedDevice}'
```

This should return `true`. If it returns nothing or `false`, encryption is not configured.

## Step 2: List All OSD Pods and Their Nodes

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd \
  -o custom-columns="NAME:.metadata.name,NODE:.spec.nodeName,STATUS:.status.phase"
```

## Step 3: Check dm-crypt Devices on Each Node

Run this on each node to verify dm-crypt devices exist:

```bash
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== Node: $node ==="
  kubectl debug node/$node -it --image=busybox -- \
    chroot /host ls /dev/mapper/ 2>/dev/null | grep dmcrypt || echo "No dm-crypt devices found"
done
```

## Step 4: Verify LUKS Headers

For each OSD device, confirm LUKS is active:

```bash
kubectl -n rook-ceph exec -it rook-ceph-osd-0-<suffix> -- bash -c \
  "cryptsetup status /dev/mapper/*dmcrypt* 2>/dev/null"
```

Expected output includes:
```yaml
type:    LUKS2
cipher:  aes-xts-plain64
keysize: 512 bits
```

## Step 5: Verify Encryption Key Secrets Exist

Each encrypted OSD should have a corresponding Secret:

```bash
# Get all encryption key secrets
kubectl -n rook-ceph get secrets | grep "encryption-key"
```

Compare the count with the number of OSDs:

```bash
OSD_COUNT=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph osd stat | awk '{print $1}')
KEY_COUNT=$(kubectl -n rook-ceph get secrets | grep "encryption-key" | wc -l)
echo "OSDs: $OSD_COUNT, Keys: $KEY_COUNT"
```

## Step 6: Generate an Audit Report

```bash
#!/bin/bash
echo "Ceph OSD Encryption Audit Report"
echo "Generated: $(date)"
echo "================================="

for osd_pod in $(kubectl -n rook-ceph get pods -l app=rook-ceph-osd -o name); do
  osd_id=$(kubectl -n rook-ceph get $osd_pod -o jsonpath='{.metadata.labels.ceph-osd-id}')
  node=$(kubectl -n rook-ceph get $osd_pod -o jsonpath='{.spec.nodeName}')

  encrypted=$(kubectl -n rook-ceph exec $osd_pod -- \
    bash -c "ls /dev/mapper/*dmcrypt* &>/dev/null && echo YES || echo NO" 2>/dev/null | tail -1)

  echo "OSD ${osd_id} | Node: ${node} | Encrypted: ${encrypted}"
done

echo ""
echo "--- Key Secret Summary ---"
KEY_COUNT=$(kubectl -n rook-ceph get secrets --no-headers | grep -c "rook-ceph-osd-encryption-key")
echo "Total encryption key secrets: $KEY_COUNT"
```

## Step 7: Vault Audit (if using Vault)

Check Vault audit logs for key access events:

```bash
vault audit list
cat /var/log/vault/audit.log | jq 'select(.request.path | startswith("rook/osd"))' | tail -20
```

## Summary

Auditing Ceph cluster encryption involves verifying the CephCluster spec, confirming dm-crypt devices exist on each OSD node, checking LUKS headers with `cryptsetup status`, and ensuring every OSD has a corresponding encryption key secret. Automate the audit with a script that compares OSD counts to key secret counts, and regularly review Vault audit logs if using KMS-based key management.
