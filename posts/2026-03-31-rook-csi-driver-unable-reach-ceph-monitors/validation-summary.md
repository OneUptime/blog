# Validation Summary: How to Troubleshoot CSI Driver Unable to Reach Ceph Monitors in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes NetworkPolicy
- Helm (Kubernetes package manager)
- kubectl CLI

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Rook Helm chart values (csi.enableCSIHostNetwork): https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#networkpolicy-v1-networking-k8s-io
- Ceph monitor documentation (ports 6789 v1 and 3300 v2/msgr2): https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- POSIX Extended Regular Expressions specification (grep -E behavior)
- BusyBox netcat documentation

## Issues Found
- **`grep -E "^\d"` is not valid POSIX ERE**: In the command to filter `ceph mon dump` output, the pattern `\d` was used with `grep -E`. POSIX Extended Regular Expressions do not support `\d` as a digit shorthand — only Perl-compatible regex (`grep -P`) does. Changed to `grep -E "^[0-9]"` which correctly matches lines starting with a digit (the monitor index numbers in `ceph mon dump` output).

## Review Notes
- All kubectl commands use correct resource names, labels, and flags for Rook-Ceph deployments.
- The NetworkPolicy YAML is correctly structured: targets `rook-ceph-mon` pods, allows ingress from all namespaces on TCP 6789 (v1 protocol) and 3300 (msgr2 protocol).
- The ConfigMap name `rook-ceph-mon-endpoints` is the correct name Rook uses to store monitor endpoint information for CSI drivers.
- The Helm value `csi.enableCSIHostNetwork=true` is the correct path for enabling host networking on CSI pods in the Rook operator chart.
- The `busybox` image's `nc -zv` command works in many BusyBox builds but behavior can vary. An alternative like `nicolaka/netshoot` could be more reliable for network debugging, but the current recommendation is acceptable for a troubleshooting guide.
