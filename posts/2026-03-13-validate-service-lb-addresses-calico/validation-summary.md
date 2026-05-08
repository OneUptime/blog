# Validation Summary: How to Validate Service Load Balancer Addresses with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes Services of type LoadBalancer
- Calico IPPool resources
- Calico BGPConfiguration resources
- calicoctl
- kubectl

## Sources Consulted
- Calico LoadBalancer IP address management: https://docs.tigera.io/calico/latest/networking/ipam/service-loadbalancer
- Calico 3.30 LoadBalancer IP address management: https://docs.tigera.io/calico/3.30/networking/ipam/service-loadbalancer
- Calico Advertise Kubernetes service IP addresses: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico 3.29 IPPool resource reference: https://docs.tigera.io/calico/3.29/reference/resources/ippool
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The prerequisite listed Calico v3.20+, but Calico LoadBalancer IPAM with `allowedUses: LoadBalancer` is documented in Calico 3.30 and was not listed as an accepted `allowedUses` value in the Calico 3.29 IPPool reference. Updated the prerequisite to Calico v3.30+.
- The IPPool example did not set `allowedUses: LoadBalancer`. Calico requires an IPPool with `allowedUses` containing `LoadBalancer` before Calico assigns IP addresses to Services of type LoadBalancer. Added `assignmentMode: Automatic` and `allowedUses: [LoadBalancer]` to the example.
- The post described BGP advertisement of LoadBalancer IPs but did not show the required `BGPConfiguration.spec.serviceLoadBalancerIPs` setting. Added a default `BGPConfiguration` example using the same CIDR as the LoadBalancer IP pool.
- The configuration checks did not include the LoadBalancer controller configuration. Added `kubectl get kubecontrollersconfiguration default -o yaml`, which the official Calico documentation uses to verify the LoadBalancer controller assignment mode.
- The architecture diagram incorrectly implied the LoadBalancer service IP directly maps to a pod. Updated it to show the IP pool assigning the service IP and BGP advertising it to external clients.
- The conclusion said the LoadBalancer address configuration provides IP addressing for both services and workloads. The specific Calico LoadBalancer IPAM configuration applies to Kubernetes Service LoadBalancer addresses, so the wording was narrowed to services.

## Review Notes
The commands `calicoctl get ippools -o yaml`, `calicoctl get bgpconfiguration -o yaml`, `kubectl get svc -A`, and `calicoctl ipam check` are valid commands. The guide remains high level and could be improved in the future with an example Service of type `LoadBalancer` and expected output, but no further technical corrections were required.
