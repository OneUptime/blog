# Validation Summary: How to Set Up an Istio Egress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio egress gateways
- Istio ServiceEntry, Gateway, VirtualService, and IstioOperator APIs
- Kubernetes NetworkPolicy
- kubectl and istioctl
- Prometheus / PromQL

## Sources Consulted
- Istio Egress Gateways task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The monitoring section used `istio_requests_total` without explaining that it applies to HTTP, HTTP/2, and gRPC traffic. The primary HTTPS egress example uses TLS passthrough, which is reported as TCP traffic rather than HTTP request traffic. I clarified that `istio_requests_total` is for HTTP traffic and added a TCP metric query using `istio_tcp_connections_opened_total` for TLS passthrough and other TCP traffic.

## Review Notes
- The Istio networking API snippets use the current `networking.istio.io/v1` API version and match the current Istio egress gateway configuration model.
- The IstioOperator examples use fields that are still documented in the current IstioOperator API reference, including egress gateway enablement, labels, replica count, resources, and HPA settings.
- `istioctl` is not installed in the local environment, so CLI verification was performed against the official Istio command reference rather than local `--help` output.
