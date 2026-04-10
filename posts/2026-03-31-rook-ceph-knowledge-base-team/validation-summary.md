# Validation Summary: How to Build a Ceph Knowledge Base for Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (MON, OSD, RBD, CephFS, RGW)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl)
- Linux utilities (lsblk, wipefs, journalctl, smartctl)
- Git

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/
- Rook documentation: https://rook.io/docs/rook/latest/
- `wipefs` man page for flag verification
- `journalctl` man page for `--since` and `-p` flag verification
- `smartctl` (smartmontools) documentation

## Issues Found
1. **Malformed closing code fences (lines 75 and 107)**: Two code fence closings used ` ```bash ` instead of plain ` ``` `. A closing code fence must not include a language identifier — this broke the markdown rendering, causing the "Runbooks" and "Keeping the Knowledge Base Current" sections to be swallowed into the preceding code block. Fixed both to plain ` ``` `.

## Review Notes
- The runbook example mixes Rook-specific commands (`kubectl get pods -n rook-ceph`) with bare-metal Ceph commands (`journalctl -u ceph-osd@N`, `ceph daemon osd.N status`). In a pure Rook deployment, you would use `kubectl logs` and `kubectl exec` instead of `journalctl` and direct daemon socket commands. This is not incorrect since the post is providing knowledge base templates and teams may have mixed environments, but authors of actual runbooks should tailor commands to their deployment model.
- The claim that "Rook auto-discovers and provisions the OSD within 10 minutes" is a reasonable approximation but depends on the Rook operator's reconcile interval and discover daemon configuration. Actual timing may vary.
- All Ceph pool names used in examples (replicapool, cephfs-data, .rgw.root) are standard defaults or common conventions.
