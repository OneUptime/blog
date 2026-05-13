# Validation Summary: How to Set Up Flagger with Apache APISIX Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache APISIX
- APISIX Ingress Controller
- Flagger
- Kubernetes
- Helm
- Prometheus
- ApisixRoute CRD
- Flagger Canary and MetricTemplate CRDs

## Sources Consulted
- Flagger Apache APISIX canary deployments documentation: https://docs.flagger.app/tutorials/apisix-progressive-delivery
- Flagger usage documentation for canary service behavior: https://docs.flagger.app/usage/how-it-works
- Apache APISIX Helm chart documentation: https://apisix.apache.org/docs/helm-chart/apisix/
- Apache APISIX Ingress Controller getting started documentation: https://apisix.apache.org/docs/ingress-controller/getting-started/get-apisix-ingress-controller/
- Apache APISIX ApisixRoute concept documentation: https://apisix.apache.org/docs/ingress-controller/concepts/apisix_route/
- Apache APISIX ApisixRoute v2 reference: https://apisix.apache.org/docs/ingress-controller/references/apisix_route_v2/
- Apache APISIX Prometheus plugin documentation: https://apisix.apache.org/docs/apisix/plugins/prometheus/
- Prometheus Community Helm charts repository: https://prometheus-community.github.io/helm-charts

## Issues Found
- The APISIX Helm repository URL used the older API7/APISIX chart location. Updated it to the official Apache APISIX Helm chart repository URL documented by Apache.
- The APISIX installation did not configure the Prometheus export endpoint or scrape annotations needed by the APISIX/Flagger flow. Added the APISIX Helm values from the Flagger APISIX tutorial for Prometheus export address, URI, metric prefix, and pod scrape annotations.
- The Canary example omitted `spec.provider: apisix` and `spec.routeRef`, and instead used service host/apex fields that do not match Flagger's documented APISIX integration. Added an application `ApisixRoute`, added the required route reference in the Canary, and removed the incorrect APISIX routing fields from the Canary service spec.
- The post said Flagger creates the application ApisixRoute directly. Updated the explanation to clarify that Flagger references an existing ApisixRoute and generates/manages the canary ApisixRoute for traffic splitting.
- The example apply command only applied the Canary resource. Updated it to apply both the ApisixRoute and the Canary.
- The generated ApisixRoute example used the same name as the user-created route. Updated the example name to match Flagger's documented generated APISIX canary route naming pattern.

## Review Notes
Local `helm` and `kubectl` validation was not possible because those binaries are not installed in this workspace. The review was completed against official documentation. The Prometheus metric labels can vary with APISIX Prometheus plugin configuration, and the post already notes that readers should verify actual metric names and labels in their Prometheus instance.
