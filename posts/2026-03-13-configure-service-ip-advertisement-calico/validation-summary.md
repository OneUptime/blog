# Validation Summary: How to Configure Service IP Advertisement with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes Services
- BGP
- Calico BGPConfiguration
- Calico IPPool and LoadBalancer IPAM
- calicoctl

## Sources Consulted
- Calico documentation: Advertise Kubernetes service IP addresses, https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico documentation: BGP configuration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: LoadBalancer IP address management, https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico documentation: IP pool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes documentation: kube-apiserver reference, https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/

## Issues Found
- The prerequisite listed Calico v3.10+, but the post uses LoadBalancer IPAM with Calico IPPool `allowedUses`, which is documented as available since Calico v3.21. Updated the prerequisite to Calico v3.21+.
- The LoadBalancer IP pool example omitted `allowedUses: [LoadBalancer]`. Current Calico documentation states LoadBalancer IPAM requires an IPPool with `allowedUses` set to `LoadBalancer`, otherwise the default pool uses are `Workload` and `Tunnel`. Added `assignmentMode: Automatic` and `allowedUses: - LoadBalancer`.
- The LoadBalancer section said annotating services or creating an IP pool advertises individual LoadBalancer IPs. Calico documentation separates LoadBalancer IP allocation from BGP advertisement; advertisement requires `serviceLoadBalancerIPs` in `BGPConfiguration`. Adjusted the wording so the IPPool section describes allocation, while the existing BGPConfiguration patch remains the advertisement step.
- The `calicoctl patch` example used `--type merge`, but current `calicoctl patch` documentation marks the merge patch type as not implemented. Removed the flag and used the default patch behavior, consistent with Calico's BGPConfiguration examples.

## Review Notes
- The BGPConfiguration fields `serviceClusterIPs`, `serviceExternalIPs`, and `serviceLoadBalancerIPs` match current Calico documentation.
- The `projectcalico.org/ipv4pools` service annotation is valid for selecting LoadBalancer IP pools.
- The final `calicoctl patch` usage is consistent with Calico's documented BGPConfiguration examples.
