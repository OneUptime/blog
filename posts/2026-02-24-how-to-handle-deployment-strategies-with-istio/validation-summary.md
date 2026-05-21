# Validation Summary: How to Handle Deployment Strategies with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic shifting, mirroring, and header-based routing
- Kubernetes Deployments and Services
- kubectl JSON patch
- Prometheus metrics for Istio telemetry

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule and traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio request routing task: https://istio.io/latest/docs/tasks/traffic-management/request-routing/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio traffic routing operations guide: https://istio.io/latest/docs/ops/configuration/traffic-management/traffic-routing/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The canary example created two Kubernetes Deployments and then routed Istio traffic to `host: my-app`, but it did not define a Kubernetes Service named `my-app`. Istio routes to service hosts from the service registry, and Kubernetes clients need a Service endpoint that selects the versioned Pods. I added a `Service` manifest selecting `app: my-app` and mapping port `80` to container port `8080`.

## Review Notes
- The Istio `networking.istio.io/v1` API version, `VirtualService` route weights, `DestinationRule` subsets, header matching, and `mirrorPercentage.value` usage are current and match official Istio documentation.
- The `kubectl patch virtualservice ... --type=json -p='[...]'` commands use valid JSON Patch syntax. Strategic merge patch is not supported for custom resources, so explicitly using `--type=json` is appropriate.
- The preview-route example is technically valid as an Istio `VirtualService`, but an externally reachable preview hostname would also require the usual DNS and Istio Gateway configuration in a real cluster.
