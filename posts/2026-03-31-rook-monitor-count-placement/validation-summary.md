# Validation Summary: How to Configure Monitor Count and Placement in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system — monitor/quorum subsystem)
- Kubernetes (scheduling primitives: node affinity, pod anti-affinity, tolerations, topology spread constraints)
- kubectl CLI

## Sources Consulted
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook placement configuration documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#placement-configuration)
- Ceph monitor documentation (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/)
- Kubernetes well-known labels and annotations (https://kubernetes.io/docs/reference/labels-annotations-taints/)
- Kubernetes pod topology spread constraints (https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)
- Kubernetes affinity and anti-affinity (https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)

## Issues Found
No technical issues found.

## Review Notes
- The post references Ceph v19.2.0 (Squid release). All configuration fields and commands are current for this version and the latest Rook operator.
- The toleration for `node-role.kubernetes.io/master` is included for backward compatibility with Kubernetes versions prior to 1.24. This is still good practice but could eventually be dropped as older clusters age out.
- The `ceph mon stat` output comment (`quorum a,b,c,d,e`) is a simplification of the actual output format, which includes additional details like IP addresses and election epoch. This is acceptable for illustrative purposes.
- The post correctly notes that mon count should be odd. Rook's operator will actually adjust even values to the nearest odd number, but recommending odd values directly is the right guidance.
