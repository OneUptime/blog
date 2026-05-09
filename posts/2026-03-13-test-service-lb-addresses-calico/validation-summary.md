# Validation Summary: How to Test Service Load Balancer Addresses with Calico Before Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes Services
- LoadBalancer IPAM
- BGPConfiguration
- IPPool
- calicoctl
- kubectl

## Sources Consulted
- Calico LoadBalancer IP address management: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico Advertise Kubernetes service IP addresses: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The prerequisite listed Calico v3.20+, but the corrected LoadBalancer IPPool configuration uses `allowedUses`, which the Calico IPPool reference marks as available since v3.21.0. Changed the prerequisite to Calico v3.21+.
- The IPPool example did not include `allowedUses: LoadBalancer`, so Calico LoadBalancer IPAM would not use that pool for Service LoadBalancer address assignment. Added `allowedUses`, `assignmentMode`, `disabled`, and `blockSize` fields consistent with Calico's documented LoadBalancer IPPool example.
- The example did not configure BGP advertisement for LoadBalancer addresses even though the post describes allocation and routing. Added a `BGPConfiguration` example using `serviceLoadBalancerIPs` for the same CIDR.
- The configuration commands did not check the LoadBalancer controller configuration. Added `kubectl get kubecontrollersconfiguration default -o yaml`, which Calico documents as the way to verify the LoadBalancer controller assignment mode.

## Review Notes
The verification commands are syntactically valid. `calicoctl ipam check` checks Calico IPAM data structure integrity against Kubernetes; for a more targeted future post, the verification section could also inspect the LoadBalancer Service's assigned external IP and BGP route advertisement.
