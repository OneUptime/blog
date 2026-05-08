# Validation Summary: How to Validate Floating IPs with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico IPAM
- Calico IPPool
- Calico CNI floating IPs
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Add a floating IP to a pod, https://docs.tigera.io/calico/latest/networking/ipam/add-floating-ip
- Calico documentation: IPPool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show

## Issues Found
- The post described Calico floating IPs as a general IPAM assignment feature and claimed failover between pods. Calico documents Kubernetes pod floating IPs as additional workload endpoint IPs implemented with NAT; they can be moved, but this post did not show an automatic failover mechanism. Updated the description, introduction, and conclusion to use the documented behavior.
- The prerequisites said only Calico v3.20+ and configured IP pools were required. Current Calico documentation says Kubernetes pod floating IPs require the Calico CNI plugin, are disabled by default, and are not currently supported for operator-managed Calico clusters. Updated the prerequisites to require manifest-installed Calico CNI, enabled floating IPs, and an IP pool covering the floating IP range.
- The example only showed an IPPool and did not assign a floating IP to a pod. Added the documented `cni.projectcalico.org/floatingIPs` pod annotation while keeping the IPPool example because floating IPs must be within a configured IP pool.
- The verification commands only showed generic IPAM and pod listing output. Added a `kubectl` annotation check so the example verifies that the floating IP annotation is present on the pod.
- The architecture diagram showed only normal IPPool to pod IP allocation. Updated it to include the floating IP between the IP pool and pod IP.

## Review Notes
The Calico `calicoctl ipam show --show-blocks` and `calicoctl ipam check -o ipam-report.json` commands match the current documented CLI syntax. The IPPool fields `cidr`, `blockSize`, and `natOutgoing` are valid in the current `projectcalico.org/v3` IPPool resource.
