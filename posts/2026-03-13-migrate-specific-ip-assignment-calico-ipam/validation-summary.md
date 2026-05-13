# Validation Summary: How to Migrate to Specific IP Assignment with Calico IPAM Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico IPAM
- Calico IPPool resources
- Calico pod IP annotations
- calicoctl
- kubectl

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/cni-plugin/configuration
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check

## Issues Found
- The description implied that specific IP assignment can be added to existing pods without disruption. Calico documents that the `cni.projectcalico.org/ipAddrs` annotation must be present when the pod is created and that adding it later has no effect. Updated the description and introduction to make the creation-time requirement clear.
- The prerequisites named a specific Calico version without tying the feature to the actual requirement. Replaced it with the documented requirement that Calico IPAM must be enabled for pod address allocation.
- The example showed only an IPPool, not a specific pod IP assignment. Added a minimal Pod example using the documented `cni.projectcalico.org/ipAddrs` annotation with an address inside the example pool.

## Review Notes
The existing `calicoctl get ippools -o yaml`, `calicoctl ipam show --show-blocks`, and `calicoctl ipam check -o ipam-report.json` commands match the current Calico documentation. The IPPool fields `cidr`, `blockSize`, and `natOutgoing` are valid; `blockSize` can only be set when the pool is created.
