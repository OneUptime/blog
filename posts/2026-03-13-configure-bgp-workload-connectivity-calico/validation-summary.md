# Validation Summary: How to Configure BGP to Workload Connectivity in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- BGP
- BIRD 2
- Linux routing

## Sources Consulted
- Calico documentation: Configure BGP peering, https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Overlay networking, https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico documentation: IP pool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: BGP configuration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- BIRD 2.18 User's Guide, https://bird.nic.cz/doc/bird-2.18.html

## Issues Found
- The IPPool example set both `ipipMode` and `vxlanMode` to `Never`. Calico documents these fields as mutually exclusive, with both defaulting to `Never`, so the example now sets only `ipipMode: Never`.
- The IPPool verification text referred generically to export filters. Updated it to call out `disableBGPExport: false` and BGP filters, matching current Calico IPPool and BGPFilter terminology.
- The IPPool example did not explicitly show `disableBGPExport: false`, which is the Calico field controlling whether IPPool CIDR routes are exported over BGP. Added it to make the workload advertisement requirement clear.
- The BIRD 2 filter example used `if net ~ 10.48.0.0/16+`, which is not the correct prefix-set form for the `+` prefix pattern. Updated it to `if net ~ [ 10.48.0.0/16+ ] then accept;`.
- The heading "Deploy a Test Workload with Fixed IP" implied the pod IP was fixed, but the `kubectl run` command creates a normal pod with an assigned IP. Updated the heading to "Deploy a Test Workload with an Assigned IP."
- The Linux `ip route` verification step assumed BIRD routes are present in the kernel routing table. Clarified that this applies when BIRD exports the accepted BGP routes to the kernel.

## Review Notes
The article is technically relevant and accurate after the corrections. In a future expansion, it could include a complete BIRD router example with `protocol kernel` if the intent is to demonstrate Linux kernel route installation, but that is not required for the current guide.
