# Validation Summary: How to Set the LoadBalancerClass in MetalLB for Multi-LB Coexistence

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes `spec.loadBalancerClass`
- MetalLB
- MetalLB Helm chart
- MetalLB `IPAddressPool` and `L2Advertisement` CRDs
- AWS Load Balancer Controller
- Helm
- kubectl

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB usage documentation: https://metallb.io/usage/index.html
- MetalLB release notes: https://metallb.io/release-notes/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration/
- AWS Load Balancer Controller NLB service documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/

## Issues Found
- The MetalLB Helm values example incorrectly placed `loadBalancerClass` under `controller`. MetalLB's Helm chart documents this as a top-level `loadBalancerClass` parameter, so the example was corrected.
- The direct manifest example only added `--lb-class` to the controller. MetalLB requires `--lb-class=<CLASS_NAME>` on both the controller and speaker, so the speaker example was added.
- The `IPAddressPool` comment said `autoAssign: true` prevented automatic assignment. This was reversed; `autoAssign: true` allows automatic assignment, so the comment was corrected.
- The service annotation used the deprecated `metallb.universe.tf/address-pool` prefix and described it as requesting a specific IP. The current MetalLB annotation is `metallb.io/address-pool`, and it requests assignment from a pool rather than a specific address, so both the annotation and comment were corrected.
- The older-version warning said running the flag on unsupported MetalLB versions would have no effect. The post now states the accurate operational point: versions before 0.13.2 do not support class filtering, so without that feature they continue reconciling supported `LoadBalancer` services.
- The post described controllers as "registering" load balancer classes. Kubernetes does not define a `LoadBalancerClass` registration resource equivalent to `IngressClass`; the wording was changed to say controllers can be configured with a class name.

## Review Notes
- Kubernetes documents `spec.loadBalancerClass` as stable since v1.24, valid only for `type: LoadBalancer`, and immutable once set.
- The AWS example class `service.k8s.aws/nlb` matches the AWS Load Balancer Controller documentation.
- MetalLB's older `metallb.universe.tf` annotation prefix is still backward compatible in recent releases, but the current documentation recommends the `metallb.io` prefix.
