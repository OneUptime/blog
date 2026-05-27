# Validation Summary: How to Migrate from Keepalived to MetalLB on Kubernetes

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- Keepalived
- VRRP
- Layer 2 load balancer announcements
- kubectl

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB API reference: https://metallb.io/apis/index.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- RFC 9568, Virtual Router Redundancy Protocol Version 3: https://www.rfc-editor.org/rfc/rfc9568
- Keepalived documentation: https://www.keepalived.org/doc/

## Issues Found
- The MetalLB install command used the older v0.14.9 manifest. Updated it to the current v0.16.0 native manifest shown in the official MetalLB installation documentation.
- The Service example used `spec.loadBalancerIP`, which Kubernetes deprecated in v1.24. Replaced it with MetalLB's `metallb.io/loadBalancerIPs` annotation, which MetalLB documents as its annotation-based way to request a specific address.
- The Service example used the old `metallb.universe.tf/address-pool` annotation. Updated it to the current `metallb.io/address-pool` annotation from the MetalLB usage documentation.
- The cutover sequence said MetalLB services would remain pending until the Keepalived IPs were free. MetalLB only checks its own address pools and Kubernetes allocations, so it can assign an IP that is still active on Keepalived and create an address conflict. Updated the sequence to stop Keepalived before applying the MetalLB-backed Services.

## Review Notes
- The IPAddressPool and L2Advertisement resources use current `metallb.io/v1beta1` APIs and valid fields.
- The `kubectl wait`, `kubectl get svc`, `kubectl logs`, `systemctl`, and package-manager examples are syntactically valid.
- In Layer 2 mode, one node attracts traffic for a service IP and kube-proxy handles backend distribution according to the Service traffic policy. The post's high-level explanation is acceptable, but future revisions could clarify that L2 mode does not actively advertise from every node for the same service at the same time.
