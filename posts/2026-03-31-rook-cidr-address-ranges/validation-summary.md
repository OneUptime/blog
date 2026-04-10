# Validation Summary: How to Configure Address Ranges (CIDR) for Rook-Ceph Networks

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system, Squid v19.2.0)
- Kubernetes (container orchestration)
- CIDR / IP networking (IPv4, IPv6, dual-stack)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook network providers documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Ceph source code (`src/common/pick_address.cc`) for NIC matching/fallback behavior
- Quay.io container registry for Ceph image tag verification (`quay.io/ceph/ceph:v19.2.0`)

## Issues Found
1. **Incorrect fallback behavior claim (line 153):** The post stated "If no NIC on a node has an IP within the CIDR, Ceph falls back to the default route interface." This is incorrect. When `public_network` or `cluster_network` is explicitly configured but no NIC on the node matches the CIDR, the Ceph daemon **fails to start** with an error (`unable to find any IP address in networks ...`). There is no silent fallback to the default route interface. Fixed the text to accurately describe the failure behavior.

## Review Notes
- The `ceph osd dump` grep pattern uses `public_addr|cluster_addr` (singular). Modern Ceph versions (Nautilus+) use `public_addrs` and `cluster_addrs` (plural) in the output. The grep still works because the singular pattern matches as a substring of the plural field names, so this is not an error, but worth noting.
- All YAML configuration snippets match the current Rook CephCluster CRD schema.
- The Ceph container image `quay.io/ceph/ceph:v19.2.0` is verified to exist on Quay.io.
- The verification commands (`ceph config get`, `ceph config dump`, `ceph osd dump`) are all valid Ceph CLI commands.
