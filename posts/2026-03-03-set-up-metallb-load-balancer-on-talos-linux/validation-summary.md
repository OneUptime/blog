# Validation Summary: How to Set Up MetalLB Load Balancer on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Services
- MetalLB
- Helm
- kube-proxy IPVS mode
- Layer 2 load balancer announcements
- Prometheus metrics

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos Pod Security documentation: https://docs.siderolabs.com/kubernetes-guides/security/pod-security

## Issues Found
- The Talos patch command used `--patch-file`, which is not the documented current flag for patching a running machine config. Changed it to `--patch @talos-proxy-patch.yaml`.
- The Helm install flow created `metallb-system` without Pod Security labels. Talos enforces baseline Pod Security Admission by default, while MetalLB speaker needs elevated network privileges. Added privileged Pod Security labels before installing MetalLB.
- The CIDR example used `10.0.0.200/28` while claiming it represented `10.0.0.200` through `10.0.0.215`; that range is not aligned as a `/28`. Changed it to `10.0.0.192/28` and updated the comment to `10.0.0.192` through `10.0.0.207`.
- The service examples used legacy `metallb.universe.tf` annotations. Updated them to the current `metallb.io` annotation keys.
- The examples used Kubernetes `spec.loadBalancerIP` for static IP selection. Kubernetes deprecated this field in v1.24, and MetalLB supports the provider-specific `metallb.io/loadBalancerIPs` annotation. Updated the examples to use that annotation.
- The monitoring section listed `metallb_layer2_requests_received`, which is not listed in the current MetalLB metrics documentation. Replaced it with the documented `metallb_k8s_client_config_loaded_bool` metric.
- The troubleshooting section suggested executing `speaker --help` inside a speaker pod as a status check. Replaced it with current MetalLB status and service event commands.
- The Talos firewall note was too broad. Updated it to account for Talos ingress firewall or upstream ACLs when those are enabled.

## Review Notes
The post is technically relevant and mostly accurate after the corrections. Future improvements could add an explicit BGP configuration example, but the current L2-focused tutorial is valid.
