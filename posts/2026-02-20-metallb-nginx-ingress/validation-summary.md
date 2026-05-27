# Validation Summary: How to Deploy MetalLB with Nginx Ingress Controller

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- Ingress NGINX Controller
- Helm
- Kubernetes Services and Ingress resources
- Prometheus metrics

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- Ingress NGINX deployment documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- Ingress NGINX Helm chart values: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/charts/ingress-nginx/values.yaml
- Ingress NGINX annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes source IP documentation: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes Ingress NGINX retirement notice: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/

## Issues Found
- The post described the setup as "production-ready" without mentioning that Kubernetes Ingress NGINX was retired in March 2026. Updated the description, introduction, and summary to remove the production-ready claim and add a concise retirement caveat.
- The MetalLB manifest used v0.14.9 while the current official manifest examples use v0.16.0. Updated the install command and version comment to v0.16.x/v0.16.0.
- The Helm install command enabled `controller.metrics.serviceMonitor.enabled=true`, which requires Prometheus Operator `ServiceMonitor` CRDs and can fail on clusters without them. Removed that flag while keeping `controller.metrics.enabled=true`, which still creates the metrics service used later in the post.
- The Helm upgrade example did not use `--reuse-values`, so it could reset previously configured settings such as metrics. Added `--reuse-values` to preserve the existing release values while scaling replicas.
- The verification step referred to the "Nginx default backend" even though the chart's default backend is disabled by default. Updated the wording to say the Ingress Controller responds with the expected 404.
- The traffic-flow sequence implied that the MetalLB speaker receives and forwards HTTP traffic. Corrected the diagram so MetalLB answers ARP while the node owning the VIP receives traffic and forwards it through the LoadBalancer service.
- The dedicated IP example used the old `metallb.universe.tf/loadBalancerIPs` annotation. Updated it to the current `metallb.io/loadBalancerIPs` annotation.

## Review Notes
- The remaining Kubernetes manifests use current APIs and valid field names for Deployment, Service, Ingress, MetalLB `IPAddressPool`, and MetalLB `L2Advertisement`.
- The Ingress NGINX rate-limiting annotations used in the post are valid, but new production deployments should consider Gateway API or another maintained ingress controller because Ingress NGINX is retired.
