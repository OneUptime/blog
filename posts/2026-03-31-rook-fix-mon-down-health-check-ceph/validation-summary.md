# Validation Summary: How to Fix MON_DOWN Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (monitors, quorum, health checks)
- Rook-Ceph operator (Kubernetes)
- kubectl CLI
- systemd (bare metal Ceph deployments)
- Prometheus alerting

## Sources Consulted
- Ceph official documentation on monitor troubleshooting: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Ceph monitor management documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Rook-Ceph monitor health documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/#monitors
- Ceph mgr Prometheus module metrics: https://docs.ceph.com/en/latest/mgr/prometheus/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **Missing monmap extraction step (bare metal recovery section):** The `ceph-mon --mkfs` command referenced `--monmap /tmp/monmap` but the post did not show how to obtain the monmap file. Without first running `ceph mon getmap -o /tmp/monmap`, the reinitialize command would fail because the file doesn't exist. Added the `ceph mon getmap` command and updated the introductory text to clarify the two-step process.

2. **Typo in summary section:** "Restart or reprovisioned affected pods" was a grammatical error. Changed to "Restart or reprovision affected pods".

## Review Notes
- The Rook CephCluster editing guidance (lines 78-81) is intentionally high-level. The exact steps for removing and re-adding a monitor via the CephCluster CR depend on the Rook version and cluster configuration. The advice to edit the CR is directionally correct but readers may need to consult Rook docs for their specific version.
- The `ceph quorum_status -f json-pretty | python3 -m json.tool` pipeline is redundant since `-f json-pretty` already formats the output, but it is not harmful and still works correctly.
- The Prometheus alert metric `ceph_mon_quorum_status` and label `ceph_daemon` are correct for the Ceph mgr prometheus module.
- All kubectl commands use the correct Rook-Ceph namespace (`rook-ceph`) and label selectors (`app=rook-ceph-mon`).
