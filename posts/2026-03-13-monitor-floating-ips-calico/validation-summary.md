# Validation Summary: How to Monitor Floating IPs with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- calicoctl

## Sources Consulted
- Calico documentation: Add a floating IP to a pod, https://docs.tigera.io/calico/latest/networking/ipam/add-floating-ip
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- The post described generic Calico IPAM but did not show how floating IPs are enabled or assigned. Updated the introduction and example to reflect Calico's floating IP model and added the `cni.projectcalico.org/floatingIPs` pod annotation.
- The prerequisites omitted important support constraints. Updated them to require the Calico CNI plugin with floating IPs enabled, a configured IP pool for the floating IP range, and a manifest-managed Calico deployment because pod floating IPs are not supported for operator-managed clusters.
- The verification commands did not check a floating IP specifically. Added `calicoctl ipam show --ip=10.48.0.10`, which is supported by the official `calicoctl ipam show` command.
- The architecture diagram only showed normal pod IP allocation. Added a floating IP node to accurately represent the reviewed topic.

## Review Notes
The `IPPool` fields `cidr`, `blockSize`, and `natOutgoing` are valid for current Calico. The `calicoctl ipam show --show-blocks`, `calicoctl ipam check -o <file>`, and `kubectl get pods -A -o wide` commands are valid. The post remains brief and could be expanded later with explicit CNI configuration for enabling floating IPs, but the reviewed technical content is now accurate.
