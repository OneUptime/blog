# Validation Summary: How to Migrate to Floating IPs with Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool resources
- Calico CNI floating IP annotations
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Add a floating IP to a pod - https://docs.tigera.io/calico/latest/networking/ipam/add-floating-ip
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico documentation: IPPool resource reference - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- The introduction described floating IPs as general IP address assignment control for pods. Updated it to match Calico's documented behavior: a floating IP is an additional stable address that fronts a single pod and is NATed to the workload's real pod IP.
- The prerequisites did not mention that Kubernetes pod floating IPs require manifest-managed CNI configuration and are not supported for operator-managed Calico clusters. Updated the prerequisites to reflect the supported configuration model and the need to enable floating IPs in the CNI config.
- The configuration section only inspected IP pools and IPAM blocks. Added the documented `feature_control` setting required to enable `floating_ips`.
- The example only showed an `IPPool`, which is necessary for advertisement but does not assign a floating IP to a pod. Added a pod manifest using the documented `cni.projectcalico.org/floatingIPs` annotation.
- The description and architecture diagram described generic pod IP assignment rather than floating IP behavior. Updated them to describe a stable address across pod replacement and the documented NAT path from floating IP to pod IP.

## Review Notes
The existing `calicoctl get ippools -o yaml`, `calicoctl ipam show --show-blocks`, `calicoctl ipam check -o ipam-report.json`, and `kubectl get pods -A -o wide` commands are valid. The IPPool fields `cidr`, `blockSize`, and `natOutgoing` are valid for current Calico releases; `blockSize` can only be set when an IPPool is created.
