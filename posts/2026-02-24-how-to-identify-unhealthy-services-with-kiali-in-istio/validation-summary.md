# Validation Summary: How to Identify Unhealthy Services with Kiali in Istio

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio service mesh
- Kiali
- Prometheus metrics
- Kubernetes pod health
- Istio VirtualService configuration
- Distributed tracing

## Sources Consulted
- Kiali Health documentation: https://kiali.io/docs/features/health/
- Kiali Validation documentation: https://kiali.io/docs/features/validations/
- Kiali Topology documentation: https://kiali.io/docs/features/topology/
- Kiali CR Reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The post described Kiali health as combining traffic, pod, and configuration health into one overall score. Kiali's current health documentation lists pod status and traffic health as the health indicators, while Istio configuration validation is a separate feature shown alongside health. Updated the text to distinguish health from validation.
- The post used yellow for degraded health states. Current Kiali documentation describes degraded and failure-level graph health using orange and red. Updated the degraded color references to orange.
- The Overview page description referred to namespace cards. Current Kiali documentation describes the default page as an Overview Dashboard with component issue visibility, application health grouping, and Service Insights. Updated the wording to match the current UI documentation.
- The "No Traffic" pattern said a service is degraded when it receives zero traffic. Kiali has a "No Health Information" state, so the text now says zero traffic can result in no health information.
- The Kiali CR example used `degraded: 0.5`, but the Kiali CR reference defines the threshold as an integer percentage. Changed the example to `degraded: 1` and updated the explanation.

## Review Notes
The Istio `VirtualService` timeout example uses the current `networking.istio.io/v1` API and valid `http.timeout` placement. Other guidance is operationally accurate, but exact Kiali UI labels can vary by Kiali release.
