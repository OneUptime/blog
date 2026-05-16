# Validation Summary: How to Set Up MetalLB with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Services
- kube-proxy IPVS mode
- MetalLB
- MetalLB Layer 2 mode
- MetalLB BGP mode
- Helm
- kubectl

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config

## Issues Found
- The manifest install command referenced MetalLB `v0.14.5`, while the current official installation documentation uses `v0.15.3`. Updated the URL to use `v0.15.3`.
- The Talos kube-proxy example enabled `ipvs-strict-arp` without showing IPVS mode. Added `mode: ipvs` so the example is complete for the IPVS-specific strict ARP setting.
- The Layer 2 description said it works in any network environment. MetalLB L2 mode depends on ARP/NDP on a local L2 network, so the wording was narrowed to avoid overclaiming.
- The BGP description said it provides true load balancing across nodes. MetalLB BGP can distribute traffic when routers use ECMP, so the wording was corrected to make that dependency explicit.
- The Layer 2 test command hard-coded `192.168.1.200`, but MetalLB may assign any available address from the pool. Changed it to `curl http://<external-ip>`.
- The service examples used legacy `metallb.universe.tf` annotations. Updated them to the current `metallb.io/address-pool` and `metallb.io/allow-shared-ip` annotations.
- The specific IP and shared IP examples used `spec.loadBalancerIP`, which MetalLB still supports but Kubernetes plans to deprecate. Updated the examples to use the current MetalLB `metallb.io/loadBalancerIPs` annotation.
- The BGP troubleshooting example used `kubectl exec ... netstat` inside the speaker pod, but MetalLB documents that the controller and speaker containers are distroless. Replaced it with guidance to check the router BGP neighbor table and TCP/179 reachability from the speaker nodes.
- The BGP community value was unquoted. Quoted it so the YAML clearly treats the community as a string.

## Review Notes
MetalLB's Helm install documentation notes that clusters enforcing Pod Security Admission need privileged labels on the MetalLB namespace because the speaker requires elevated permissions. The post's Helm command is still valid, but a future enhancement could mention that namespace-label requirement for locked-down clusters.
