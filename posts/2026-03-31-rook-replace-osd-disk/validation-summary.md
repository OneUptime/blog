# Validation Summary: How to Replace a Failed OSD Disk in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD management, CRUSH map, authentication)
- Kubernetes (kubectl, pods, deployments, PVCs, ConfigMaps, node debugging)
- BlueStore (Ceph OSD backend)
- Linux disk utilities (sgdisk, dd, wipefs, pvremove, lsblk)

## Sources Consulted
- Rook official documentation: OSD management and cluster CRD storage configuration (https://rook.io/docs/rook/latest/)
- Ceph official documentation: OSD removal procedures, `ceph osd out`, `ceph osd crush remove`, `ceph auth del`, `ceph osd rm` (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Kubernetes documentation: `kubectl debug node`, `kubectl exec`, label selectors (https://kubernetes.io/docs/reference/kubectl/)

## Issues Found
- **Typo on line 108**: "reprovisioning" was grammatically incorrect in the sentence "Annotate the node to tell Rook to reprovisioning once the new disk is in." Fixed to "reprovision."

## Review Notes
- The manual OSD removal in Step 3 uses three separate commands (`ceph osd crush remove`, `ceph auth del`, `ceph osd rm`). The single command `ceph osd purge osd.$OSD_ID --yes-i-really-mean-it` (available since Ceph Luminous) achieves the same result more concisely, but the manual approach shown is correct and valid.
- Newer Rook versions support the `removeOSDsIfOutAndSafeToRemove` field in the CephCluster CR, which can automate parts of this workflow. The manual approach remains valid for all versions.
- The `dd` command in Step 7 writes only 400KB (`bs=4096 count=100`), which is sufficient to clear partition headers at the start of the disk. This is standard practice.
- The `watch kubectl exec` pattern in Step 2 works but can be fragile with shell quoting in some environments. This is a common and accepted pattern.
