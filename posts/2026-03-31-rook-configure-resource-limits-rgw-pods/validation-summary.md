# Validation Summary: How to Configure Resource Limits for Rook-Ceph RGW Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- Kubernetes resource management (requests/limits)
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Ceph configuration and monitoring commands

## Sources Consulted
- Rook CephObjectStore CRD documentation and `GatewaySpec` struct in `pkg/apis/ceph.rook.io/v1/types.go` (release-1.16)
- Ceph documentation on `ceph daemon` vs `ceph tell` command semantics (admin socket vs monitor-relayed)
- Validated blog post: "How to Connect to a Ceph Daemon Admin Socket" (confirms `ceph daemon` requires local socket, `ceph tell` works remotely)
- Validated blog post: "How to Optimize Ceph RGW for Small Object Workloads" (confirms `gateway.type` is not a valid CRD field)
- Kubernetes autoscaling/v2 HPA API reference

## Issues Found

1. **Invalid `type: s3` field in CephObjectStore YAML** - The `spec.gateway.type` field does not exist in the Rook CephObjectStore CRD (`ceph.rook.io/v1`). The CephObjectStore inherently provides S3 and Swift APIs via RGW; there is no protocol selector field. Removed the `type: s3` line from the YAML example.

2. **`ceph daemon` used from tools pod** - The monitoring command ran `ceph daemon rgw.my-store.a perf dump` from the `rook-ceph-tools` deployment. The `ceph daemon` command connects via a local Unix domain socket (`/var/run/ceph/*.asok`) that only exists inside the RGW daemon's own pod. From the tools pod, this command would fail with a "no such file" error. Changed to `ceph tell rgw.my-store.a perf dump`, which sends the command via the Ceph monitors over the network and works from any pod with Ceph client credentials.

## Review Notes
- The HPA example is valid Kubernetes YAML, but in practice the Rook operator continuously reconciles the RGW deployment's replica count to match the `gateway.instances` field in the CephObjectStore spec. This means the HPA and Rook operator may conflict, with Rook resetting replicas back to the configured value. Users should be aware that HPA on Rook-managed deployments requires additional configuration or workarounds to prevent this reconciliation conflict.
- The thread-pool memory formula (`thread_count * 8MB + 512MB base`) is a reasonable approximation but actual memory usage varies with Ceph version, enabled features (e.g., beast frontend vs civetweb), and workload characteristics. The post correctly frames this as a "typical formula" rather than an exact calculation.
- The resource sizing guide values are reasonable starting points for the described workload tiers.
