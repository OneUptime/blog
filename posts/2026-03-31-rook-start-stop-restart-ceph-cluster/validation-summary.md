# Validation Summary: How to Start, Stop, and Restart a Ceph Cluster

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI)

## Sources Consulted
- Rook official documentation on cluster maintenance: https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
- Ceph documentation on OSD flags (noout, norebalance): https://docs.ceph.com/en/latest/rados/operations/control/
- Kubernetes kubectl scale and rollout restart documentation: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

## Review Notes
- The restart section scales RGW to 1 replica and MDS to 2 replicas, which are reasonable defaults but may not match every deployment's original configuration. Users should note their original replica counts before stopping daemons.
- The post correctly omits the tools deployment from scale-down operations, ensuring `ceph` CLI commands remain available once monitors recover.
- The `-it` flags on `kubectl exec` commands are not strictly necessary for non-interactive single commands, but they are harmless and commonly used in documentation.
