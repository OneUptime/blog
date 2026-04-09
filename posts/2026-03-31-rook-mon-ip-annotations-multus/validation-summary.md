# Validation Summary: How to Set Mon IP Annotations with Multus in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system) — monitors specifically
- Multus CNI (multi-network plugin for Kubernetes)
- Kubernetes (networking, ConfigMaps, pods, annotations)

## Sources Consulted
- Rook Network Providers documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/network-providers/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook source code — mon package: https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mon/mon.go
- Rook Multus design document: https://github.com/rook/rook/blob/master/design/ceph/multus-network.md
- Rook GitHub issues on mon endpoints and Multus networking: https://github.com/rook/rook/issues/14829, https://github.com/rook/rook/issues/8277

## Issues Found

### 1. Core premise was fundamentally incorrect
**What was wrong:** The post claimed monitors need annotations to advertise Multus network IPs instead of pod network IPs. In reality, Rook monitors with Multus do NOT listen on Multus NAD interfaces — they use Kubernetes Service ClusterIPs for their advertised endpoints. The Multus NAD is attached for outbound communication only. This is a documented architectural detail in Rook.
**What was changed:** Rewrote the introduction and "The Problem with Multi-Network Pods" section to accurately describe how monitors work with Multus, including the relevant quote from official documentation.

### 2. Fabricated annotation: `rook.io/mon-endpoint`
**What was wrong:** The post claimed "Rook reads the `rook.io/mon-endpoint` annotation on monitor pods to determine the IP address to register in the monitor map." This annotation does not exist in Rook.
**What was changed:** Removed the fabricated annotation reference. Replaced the section with accurate information about configuring Multus in the CephCluster spec and mentioned the real `network.rook.io/mon-ip` node annotation (which works with host networking, not Multus).

### 3. Fabricated annotation: `rook.io/mon-ip` in CephCluster spec
**What was wrong:** The YAML example showed `spec.mon.annotations.mon.rook.io/mon-ip` which is invalid. The real annotation is `network.rook.io/mon-ip` and it is applied to Kubernetes **nodes** (not the CephCluster CR). Additionally, `spec.mon.annotations` is not a valid field in the CephCluster CRD (annotations go under `spec.annotations`).
**What was changed:** Replaced the invalid YAML with the correct CephCluster Multus configuration and documented the real `network.rook.io/mon-ip` node annotation with its correct usage.

### 4. Dangerous advice to manually edit `rook-ceph-mon-endpoints` ConfigMap
**What was wrong:** The post suggested manually creating/editing the `rook-ceph-mon-endpoints` ConfigMap to "pre-configure which storage network IP each monitor will use." This ConfigMap is operator-managed and manual edits may be overwritten or cause cluster inconsistencies.
**What was changed:** Rewrote the section to explain the ConfigMap is for reference/troubleshooting and explicitly warned against manual editing. Added the missing `maxMonId` field to the example.

### 5. Fabricated annotation: `network.operator.openshift.io/interfaces-data`
**What was wrong:** The post suggested annotating monitor pods with `network.operator.openshift.io/interfaces-data` to make Rook read Multus IPs. This is an OpenShift-specific annotation unrelated to Rook. Rook does not read this annotation.
**What was changed:** Replaced the entire "Using Pod Annotations Directly" section with instructions for verifying Multus interface attachment on monitor pods (checking `net1` interface and its IP), which is the actually useful operation.

### 6. Incorrect expected output for `ceph mon dump`
**What was wrong:** The verification section showed storage network IPs (192.168.100.x) as the expected output, reinforcing the false premise that monitors use Multus IPs. With Multus, monitors use Kubernetes Service ClusterIPs.
**What was changed:** Updated the expected output to show Service ClusterIPs (10.96.x.x) and explained that this is the correct behavior with Multus.

### 7. Incorrect IP range in initial example
**What was wrong:** The initial `ceph mon dump` example showed `10.244.x.x` (pod network CIDR) as the monitor IP. With Rook, monitors are accessed via Kubernetes Service ClusterIPs (typically `10.96.x.x`), not pod IPs.
**What was changed:** Updated to `10.96.x.x` to reflect Service ClusterIPs.

## Review Notes
- The blog's original title "How to Set Mon IP Annotations with Multus in Rook" describes a feature that doesn't exist as described. The corrected post retains the topic of monitor networking with Multus but accurately explains the actual behavior.
- The `network.rook.io/mon-ip` annotation (for host networking) was mentioned as an alternative for users who truly need monitors on specific IPs, since that's the closest real feature to what the original post was attempting to describe.
- The Multus CephCluster configuration (`provider: multus` with selectors) was correct in the original post and was preserved.
- Users should be aware that the Rook community has ongoing work to potentially allow monitors to listen on Multus interfaces in the future, but this is not currently supported.
