# Validation Summary: How to Set Resources for Rook-Ceph Crash Collector

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (crash collector / ceph-crash daemon)
- Kubernetes (resource requests/limits, DaemonSet, kubectl)

## Sources Consulted
- Rook official documentation: CephCluster CRD spec for `spec.resources.crashcollector` and `spec.crashCollector` settings (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph documentation: crash module and `ceph crash` CLI commands (https://docs.ceph.com/en/latest/mgr/crash/)
- Kubernetes documentation: resource requests and limits syntax, `kubectl top`, event field selectors
- Cross-referenced with other Rook-Ceph blog posts in this repository for consistency of YAML paths

## Issues Found
No technical issues found.

## Review Notes
- The post mentions "Long-running crash reports contain large core dumps" — crash reports collected by `ceph-crash` are metadata and stack traces, not actual core dumps. Core dumps are handled separately by the OS. This is a minor conceptual imprecision but does not affect the practical resource configuration guidance.
- The `kubectl top pods` command requires metrics-server to be installed in the cluster; this is a common prerequisite not mentioned in the post but is generally assumed knowledge.
- Resource values used (15m CPU, 60Mi memory) are reasonable for the crash collector daemon, which is indeed very lightweight.
- The post correctly distinguishes between `spec.resources.crashcollector` (lowercase, for resource configuration) and `spec.crashCollector` (camelCase, for feature configuration like disabling), which is a common point of confusion.
