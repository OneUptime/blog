# Validation Summary: How to Set Up Istio for Hybrid Cloud Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Istio multicluster and multi-network deployments
- East-west gateways
- Istio certificate authority configuration
- Istio DestinationRule locality load balancing
- Istio DNS proxying
- kubectl and istioctl

## Sources Consulted
- Istio official multicluster overview: https://istio.io/latest/docs/setup/install/multicluster/
- Istio official multi-primary on different networks guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio official multicluster prerequisites and trust setup: https://istio.io/latest/docs/setup/install/multicluster/before-you-begin/
- Istio official DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio 1.25 change notes for DNS auto-allocation deprecation: https://istio.io/latest/news/releases/1.25.x/announcing-1.25/change-notes/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio supported releases and version skew policy: https://istio.io/latest/docs/releases/supported-releases/

## Issues Found
- The network reachability requirement referred specifically to east-west gateway `LoadBalancer` IPs. Istio's official multicluster guidance requires the east-west gateway to be reachable, but the post also supports NodePort and MetalLB for on-premises environments. Changed this to "east-west gateway addresses" so the statement covers LoadBalancer IPs and NodePort-style addresses.
- The IstioOperator snippets used `ISTIO_META_DNS_AUTO_ALLOCATE` in proxy metadata. Istio 1.25 deprecated this proxy metadata setting in favor of the newer DNS auto-allocation behavior and ServiceEntry label control. Removed the deprecated setting while keeping `ISTIO_META_DNS_CAPTURE`.
- The DestinationRule example used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for DestinationRule. Updated the apiVersion.
- The upgrade guidance said control plane version skew is supported from N-1 to N+1. Istio's official skew policy states that the control plane can be one version ahead of the data plane, while the data plane cannot be ahead of the control plane. Reworded the guidance accordingly and kept the recommendation to keep control planes in sync.

## Review Notes
The main multi-primary, multi-network installation sequence, network labels, shared root CA workflow, east-west gateway generation, `expose-services.yaml`, remote-secret exchange, and locality failover concepts align with current Istio sidecar-mode documentation. The locality failover example assumes Kubernetes locality labels are meaningful for the chosen `from` and `to` values; production deployments should ensure node region/zone/subzone labels match the desired failover model.
