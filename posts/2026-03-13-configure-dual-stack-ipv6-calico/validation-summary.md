# Validation Summary: How to Configure Dual-Stack IPv6 with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- IPv6
- IPv4/IPv6 dual-stack networking
- calicoctl

## Sources Consulted
- Calico documentation: Configure dual stack or IPv6 only, https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: IP pool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: IPv4/IPv6 dual-stack, https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The example configuration only defined an IPv4 Calico IPPool, so it did not configure dual-stack pod addressing. Replaced it with a Calico operator Installation example that includes both IPv4 and IPv6 pools.
- The prerequisites implied Calico alone was sufficient. Updated them to require Calico IPAM and a Kubernetes cluster configured for IPv4/IPv6 dual-stack.
- The post did not mention the manifest-based Calico CNI settings required to assign both IPv4 and IPv6 pod addresses. Added the documented `assign_ipv4` and `assign_ipv6` settings, plus the `IP6` and `FELIX_IPV6SUPPORT` environment variables.
- The verification commands checked Services and Calico IPAM but did not inspect pod address assignment. Added `kubectl get pods -A -o wide`.
- The architecture diagram implied Calico IPPools directly assign Service IPs. Updated it to show IPv4 and IPv6 IPPools assigning pod IPs, with a dual-stack Service targeting pods.

## Review Notes
The post is technically valid after the fixes, but it remains a high-level guide. A future revision could include Kubernetes control-plane flags and a dual-stack Service manifest with `ipFamilyPolicy` for a complete end-to-end example.
