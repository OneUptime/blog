# Validation Summary: How to Use Multus Auto-Discovery with Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage operator)
- Multus CNI (multi-network plugin for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- NetworkAttachmentDefinitions (Multus CRD)

## Sources Consulted
- Rook official documentation on Multus network providers: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook GitHub source code — CephCluster CRD types: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook GitHub source code — network validation: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/network.go
- Rook GitHub source code — network settings application: https://github.com/rook/rook/blob/master/pkg/operator/ceph/controller/network.go
- Rook GitHub source code — Multus validation CLI: https://github.com/rook/rook/blob/master/cmd/rook/userfacing/multus/validation/validation.go
- Rook example cluster configs: https://github.com/rook/rook/tree/master/deploy/examples

## Issues Found

### 1. Incorrect characterization of addressRanges as "auto-discovery"
**What was wrong:** The post described `addressRanges` as the "primary auto-discovery mechanism" that causes Rook to "examine network interfaces on nodes" and "select the one with an IP matching the specified range." In reality, `addressRanges` is a manual override that *bypasses* auto-discovery. The actual auto-discovery mechanism uses network canary pods when `addressRanges` is omitted.
**What was changed:** Rewrote the introduction and section explanations to correctly distinguish between auto-discovery (canary pods, the default) and manual `addressRanges` (which skips auto-discovery and passes CIDRs directly to Ceph config).

### 2. Missing required selectors in Multus examples
**What was wrong:** Several YAML examples showed `provider: multus` with `addressRanges` but without `selectors`. Rook validation requires at least one selector when using the Multus provider — without selectors, the CephCluster spec would fail validation with: "at least one network selector must be specified when using the multus network provider."
**What was changed:** Added `selectors` referencing NADs to all Multus configuration examples.

### 3. Fabricated node annotations
**What was wrong:** The post claimed Rook supports `rook.io/public-network-interface` and `rook.io/cluster-network-interface` node annotations for per-node interface overrides. These annotations do not exist in Rook. The only networking-related node annotation Rook supports is `network.rook.io/mon-ip` (for host networking mon IP overrides only).
**What was changed:** Removed the entire "Auto-Discovery with Node Annotations" section.

### 4. Non-existent Multus validation YAML manifest
**What was wrong:** The post referenced `https://raw.githubusercontent.com/rook/rook/main/deploy/examples/multus-validation.yaml` which does not exist (returns 404). Multus validation in Rook is performed via the `rook multus validation run` CLI command inside the operator pod, not via a standalone YAML manifest.
**What was changed:** Replaced the section with the correct approach: exec into the operator pod and run `rook multus validation run`.

### 5. Fabricated log output
**What was wrong:** The example operator log output ("discovered public network interface: net1...") was not representative of actual Rook operator logs.
**What was changed:** Replaced with generic guidance to look for network-related log entries.

## Review Notes
- The `addressRanges` field, when specified for Multus, can only be set for networks that also have a corresponding selector. For example, you cannot specify a public address range without also having a public selector.
- For `provider: host` (host networking without Multus), `addressRanges` can be used standalone without selectors. The post is specifically about Multus, so this distinction matters.
- The `addressRanges` CIDRs translate directly to Ceph's `public_network` and `cluster_network` configuration values. It is Ceph itself (not Rook) that determines which interface to bind to based on these settings.
