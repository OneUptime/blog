# Validation Summary: How to Avoid Common Mistakes with Floating IPs with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico CNI plugin
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico Open Source documentation: Add a floating IP to a pod, https://docs.tigera.io/calico/latest/networking/ipam/add-floating-ip
- Calico Open Source IPPool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source calicoctl ipam show reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source calicoctl ipam check reference, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubectl generated reference, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The introduction described floating IPs as general IP address management and fine-grained pod IP assignment. Calico documents floating IPs as additional workload endpoint IPs that can be moved between pods, with host-side NAT delivering traffic to the pod's real IP. Updated the introduction to match that behavior.
- The prerequisites did not mention that Calico floating IPs require the Calico CNI plugin and are not currently supported for operator-managed Calico Kubernetes clusters. Added both caveats.
- The configuration section only showed IPPool and IPAM inspection commands, but Calico floating IPs are disabled by default and must be enabled in the CNI network config. Added a note about setting `feature_control.floating_ips` to `true`.
- The example showed only an IPPool, which is valid but incomplete for floating IP usage. Added a Kubernetes Pod example using the documented `cni.projectcalico.org/floatingIPs` annotation with an IP inside the configured pool.

## Review Notes
The `calicoctl get ippools -o yaml`, `calicoctl ipam show --show-blocks`, `calicoctl ipam check -o ipam-report.json`, and `kubectl get pods -A -o wide` commands are valid. The IPPool example uses valid `projectcalico.org/v3` fields; `blockSize: 26` is the IPv4 default and can only be set when the pool is created.
