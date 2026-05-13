# Validation Summary: How to Choose Kubernetes Networking for Calico Users for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico CNI and IPAM
- BGP routing
- VXLAN encapsulation
- IP-in-IP encapsulation
- IPv4, IPv6, and dual-stack networking

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPAM block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico IPv6 and dual-stack guide: https://docs.tigera.io/calico/latest/networking/ipam/ipv6
- Calico Azure public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/azure
- Calico AWS public cloud reference: https://docs.tigera.io/calico/latest/reference/public-cloud/aws
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The encapsulation table described IP-in-IP as suitable for cloud VPCs generally and the text grouped AWS, GCP, and Azure together. Calico's Azure documentation states that Azure blocks IPIP packets, so I clarified that IP-in-IP requires protocol 4 support and that Azure should use VXLAN for Calico overlay networking.
- The IP pool sizing section said each node pre-allocates one block. Calico IPAM allocates blocks to hosts on demand for route aggregation, so I changed the wording to avoid implying unconditional pre-allocation.
- The IP pool sizing example listed a /18 as 16,382 IPs. Calico reports the full CIDR size for pool capacity, so a /18 contains 16,384 addresses. I corrected the count and changed the 30% headroom calculation from "~10,000" to 8,320 IPs.
- The dual-stack example showed only a standalone IPv6 IPPool, which would not by itself enable dual-stack. I replaced it with the operator Installation example pattern that configures both IPv4 and IPv6 pools at install time.
- The dual-stack section said Kubernetes 1.20+ was required. Current Calico Open Source documentation states dual stack requires Calico IPAM and Kubernetes dual-stack support, and its setup instructions are for new clusters. I replaced the specific version claim with that requirement.

## Review Notes
- The BGP node-to-node mesh disable command is valid, but Calico warns that disabling the mesh can break pod networking unless replacement BGPPeer resources are configured.
- The route reflector threshold of 50 nodes is a practical rule of thumb rather than a hard Calico limit.
