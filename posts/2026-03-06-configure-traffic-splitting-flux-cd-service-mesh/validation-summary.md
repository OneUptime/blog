# Validation Summary: How to Configure Traffic Splitting with Flux CD and Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments and Services
- Flux CD Kustomizations and notification Alerts
- Istio VirtualService and DestinationRule traffic management
- Linkerd SMI TrafficSplit
- Kubernetes Gateway API HTTPRoute
- kubectl, flux CLI, and linkerd viz CLI

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Linkerd TrafficSplit documentation: https://linkerd.io/2.19/features/traffic-split/
- Linkerd SMI extension documentation: https://linkerd.io/2.19/tasks/linkerd-smi/
- SMI TrafficSplit v1alpha4 specification: https://github.com/servicemeshinterface/smi-spec/blob/main/apis/traffic-split/v1alpha4/traffic-split.md
- Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/

## Issues Found
- Flux Alert used `notification.toolkit.fluxcd.io/v1`, but the current Flux Alert API is documented as `notification.toolkit.fluxcd.io/v1beta3`. Updated the Alert manifest to `v1beta3`.
- The Gateway API HTTPRoute example used `timeouts.request` without stating the Gateway API version requirement. Added a prerequisite for Gateway API v1.2 or later CRDs and a compatible controller.
- The Linkerd section presented SMI TrafficSplit as a normal current path. Linkerd documents the SMI extension and TrafficSplit support as deprecated. Added that caveat and noted that the SMI extension is required.
- The Istio verification command executed `curl` in the default workload container and assumed the application image had curl and access to Envoy admin stats. Updated it to select a pod and execute `pilot-agent request GET stats` in the `istio-proxy` container, matching Istio documentation.

## Review Notes
The Istio, Kubernetes Service, Flux Kustomization, SMI TrafficSplit, and Gateway API HTTPRoute examples are syntactically consistent with the referenced APIs. The Linkerd SMI approach remains usable only where the deprecated SMI extension is installed; future revisions should consider replacing it with Linkerd dynamic request routing.
