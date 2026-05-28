# Validation Summary: How to Configure Fault Injection for Resilience Testing in Cloud Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Service Mesh
- Istio VirtualService
- Envoy fault injection
- Kubernetes kubectl
- YAML
- Bash, curl, and jq

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task documentation: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio traffic management problems documentation: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Google Cloud Service Mesh overview: https://cloud.google.com/service-mesh/docs/overview
- Envoy HTTP fault injection filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post claimed the guide covered connection failures, but it only showed HTTP delay and abort examples. I changed the introduction to say the guide covers delays and HTTP errors.
- The VirtualService examples used `networking.istio.io/v1beta1`. Current Istio documentation uses the stable `networking.istio.io/v1` API for VirtualService examples, so I updated all snippets to `networking.istio.io/v1`.
- The timeout test configured `timeout: 10s` on the same VirtualService rule as fault injection. Istio documents that fault injection cannot be combined with retry or timeout policies on the same VirtualService, so I removed that field and clarified that the timeout should be configured in application code or an upstream route.
- The combined delay/error section stated that the remaining 40% of requests are processed normally. Istio documents delay and abort faults as independent when both are specified, so I changed the explanation to note that some requests may be both delayed and aborted.

## Review Notes
The examples assume Kubernetes workloads using Istio APIs in Cloud Service Mesh. Google Cloud documentation notes that Cloud Service Mesh can also use Google Cloud-specific service routing APIs for some Compute Engine and Traffic Director-style deployments, where these VirtualService examples would not be the applicable configuration surface.
