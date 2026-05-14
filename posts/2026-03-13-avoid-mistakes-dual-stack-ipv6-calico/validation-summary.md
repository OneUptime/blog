# Validation Summary: How to Avoid Common Mistakes with Dual-Stack IPv6 with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes dual-stack IPv4/IPv6 networking
- Calico IPAM and IPPool resources
- Calico BGPConfiguration resources
- calicoctl and kubectl CLI commands

## Sources Consulted
- Calico documentation, "Configure dual stack or IPv6 only": https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl ipam check command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes documentation, "IPv4/IPv6 dual-stack": https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The example configuration showed only an IPv4 `IPPool`, which did not match a dual-stack IPv6 guide. I changed the snippet to include both IPv4 and IPv6 `IPPool` resources, using valid `projectcalico.org/v3` fields and the documented IPv6 default block size of `/122`.
- The architecture diagram implied that a Calico IPPool directly provides Kubernetes Service IPs. Kubernetes Service ClusterIPs are allocated from the Kubernetes service cluster IP ranges, while Calico IPPools allocate workload and tunnel addresses by default. I updated the diagram so the IPPool points to Pods and the Service IP points to Pods separately.

## Review Notes
- The `calicoctl get ippools -o yaml`, `calicoctl get bgpconfiguration -o yaml`, `kubectl get svc -A`, and `calicoctl ipam check` commands are valid according to current documentation.
- Calico documentation notes that dual-stack configuration steps are for new clusters and require Calico IPAM plus Kubernetes dual-stack configuration. The post remains intentionally brief and does not cover those install-time details.
