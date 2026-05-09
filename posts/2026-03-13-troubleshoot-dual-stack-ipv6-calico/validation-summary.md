# Validation Summary: How to Troubleshoot Dual-Stack IPv6 with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- IPv6
- IPv4/IPv6 dual-stack networking
- Calico IPAM
- calicoctl

## Sources Consulted
- Calico documentation: Configure dual stack or IPv6 only, https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico documentation: IP pool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Get started with IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl ipam, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: calicoctl ipam check, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation: IPv4/IPv6 dual-stack, https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The example configuration was IPv4-only even though the post is about dual-stack IPv6. I changed it to include separate IPv4 and IPv6 Calico `IPPool` resources, matching Calico's model where workload IPs are allocated from IP pools.
- The verification commands only listed Services and an IPAM consistency check, which did not directly verify that pods had both address families or show pool/block usage. I added `kubectl get pods -A -o wide`, `kubectl get svc -A -o wide`, and `calicoctl ipam show --show-blocks`, and kept `calicoctl ipam check` with `--show-problem-ips` to surface allocation problems.
- The architecture diagram implied that Calico IPPools assign Kubernetes Service IPs. Calico IPPools are used by Calico IPAM for workload endpoint/pod addresses, while Kubernetes Services have their own dual-stack fields and cluster IP allocation. I updated the diagram to show IPv4 and IPv6 pools feeding pod IPs, with the dual-stack Service targeting pods.

## Review Notes
The post remains brief and does not cover full dual-stack cluster setup, such as Kubernetes service CIDR configuration, Calico CNI `assign_ipv4` and `assign_ipv6` settings, or host IPv4/IPv6 forwarding requirements. Those omissions are scope limitations rather than correctness errors in the corrected content.
