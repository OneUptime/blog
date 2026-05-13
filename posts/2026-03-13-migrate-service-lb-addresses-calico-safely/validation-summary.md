# Validation Summary: How to Migrate to Service Load Balancer Addresses with Calico Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes Services of type LoadBalancer
- Calico IPPool
- Calico BGPConfiguration
- Calico IPAM
- calicoctl
- kubectl

## Sources Consulted
- Calico LoadBalancer IP address management documentation: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico 3.30 LoadBalancer IP address management documentation: https://docs.tigera.io/calico/3.30/networking/ipam/service-loadbalancer
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Advertise Kubernetes service IP addresses documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico resource definitions reference: https://docs.tigera.io/calico/latest/reference/resources/overview
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The prerequisite listed Calico v3.20+, but the official Calico LoadBalancer IPAM documentation is available for Calico 3.30 and later. Updated the prerequisite to Calico v3.30+.
- The configuration checks did not verify the Calico LoadBalancer controller. Added `kubectl get kubecontrollersconfiguration default -o yaml`, which is the official check for the kube-controllers LoadBalancer controller configuration.
- The BGP configuration command used `bgpconfiguration` without selecting the default resource. Updated it to `calicoctl get bgpconfig default -o yaml`, matching the official Calico service IP advertisement documentation.
- The IPPool example did not include `allowedUses: LoadBalancer`, so Calico would not use it for LoadBalancer Service address assignment. Added `assignmentMode: Automatic` and `allowedUses: LoadBalancer`.
- The architecture diagram labeled the assigned address as a generic Service IP. Updated it to `LoadBalancer IP` to avoid confusing the LoadBalancer address with a Kubernetes ClusterIP.

## Review Notes
The post is technically valid after correction, but it remains a high-level guide. A future revision could show an explicit `Service` manifest with `type: LoadBalancer` and, when BGP advertisement is required, an example `serviceLoadBalancerIPs` BGPConfiguration patch.
