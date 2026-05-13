# Validation Summary: How to Configure Service Load Balancer Addresses with Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes Services of type LoadBalancer
- Calico IPPool
- Calico BGPConfiguration
- calicoctl
- kubectl

## Sources Consulted
- Calico LoadBalancer IP address management: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico advertise Kubernetes service IP addresses: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico KubeControllersConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig

## Issues Found
- The prerequisite listed Calico v3.20+, but the `allowedUses` IPPool field used for LoadBalancer pools is documented in Calico Open Source as available since v3.21.0. Updated the prerequisite to Calico v3.21+.
- The IPPool example did not set `allowedUses: [LoadBalancer]`. Without this field, Calico defaults the pool to workload and tunnel usage, so it would not be used for LoadBalancer service IP assignment. Added `allowedUses`, `assignmentMode`, and `disabled` fields matching the official LoadBalancer IPAM example.
- The post checked BGP configuration but did not configure `serviceLoadBalancerIPs`, which Calico documents as necessary when advertising Service `status.LoadBalancer` addresses over BGP. Added a matching `BGPConfiguration` example.
- The verification step used `calicoctl ipam check`, which is not part of the current Calico Open Source `calicoctl ipam` command reference. Replaced it with a direct IPPool inspection command.
- The architecture diagram showed the pool assigning a generic service IP directly to a pod. Updated it to show the documented flow from LoadBalancer IP pool to LoadBalancer IP, Kubernetes Service, and pods.

## Review Notes
Calico kube-controllers manages LoadBalancer IP assignment, but the official documentation notes that BGP configuration is also required to advertise those LoadBalancer IPs outside the cluster.
