# Validation Summary: How to Troubleshoot Service Load Balancer Addresses with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes Services
- LoadBalancer IP address management
- Calico IPAM
- Calico BGPConfiguration
- calicoctl
- kubectl

## Sources Consulted
- Calico LoadBalancer IP address management: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico advertise Kubernetes service IP addresses: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The prerequisites listed Calico v3.20+, but the LoadBalancer IPPool configuration requires `allowedUses`, which the Calico IPPool reference documents as available since v3.21.0. Updated the prerequisite to Calico v3.21+.
- The example IPPool did not set `allowedUses: LoadBalancer`. Calico documentation states that Calico does not automatically provide a LoadBalancer IP pool and requires an IPPool with `allowedUses` set to `LoadBalancer` before it assigns Service LoadBalancer IPs. Added `allowedUses`, `assignmentMode`, and `disabled` fields to make the example align with the documented LoadBalancer IPAM configuration.
- The verification command used `calicoctl ipam check`, which is not listed in the current Calico Open Source IPAM command overview. Replaced it with `calicoctl ipam show`, which is the documented command for showing overall IP usage.

## Review Notes
The BGP inspection command is valid because `calicoctl get` supports `bgpconfiguration` and pluralized resource names. For a fuller future troubleshooting guide, the post could also show checking `KubeControllersConfiguration` and `serviceLoadBalancerIPs`, but the existing commands and snippets are technically correct after the fixes above.
