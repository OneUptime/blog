# Validation Summary: How to Monitor Dual-Stack IPv6 with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- IPv4/IPv6 dual-stack networking
- Calico IPPool resources
- calicoctl IPAM commands

## Sources Consulted
- Calico documentation: Configure dual stack or IPv6 only, https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes documentation: IPv4/IPv6 dual-stack, https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The example IPPool only showed an IPv4 CIDR, which did not match the post's dual-stack IPv6 topic. I changed it to include separate IPv4 and IPv6 Calico IPPool resources because an IPPool has a single IPv4 or IPv6 CIDR.
- The verification commands did not include a command that shows pool utilization, even though the description mentions pool utilization. I added `calicoctl ipam show --show-blocks`, which is the documented Calico command for IP pool and block usage.
- The architecture diagram showed a Calico IPPool allocating Service IPs. I changed it to show Calico IPPools assigning Pod IPs and Kubernetes Service CIDRs assigning Service IPs.
- The conclusion said Calico provides reliable IP addressing for Kubernetes services and workloads. I changed it to clarify that Calico provides workload IP addressing while Kubernetes allocates service addresses.

## Review Notes
The commands `calicoctl get ippools -o yaml`, `calicoctl get bgpconfiguration -o yaml`, `kubectl get svc -A`, and `calicoctl ipam check` are valid. Kubernetes dual-stack Service details depend on cluster-level service CIDR configuration and Service `ipFamilyPolicy` settings.
