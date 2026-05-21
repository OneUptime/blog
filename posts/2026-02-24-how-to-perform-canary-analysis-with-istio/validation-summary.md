# Validation Summary: How to Perform Canary Analysis with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService and DestinationRule
- Kubernetes Deployments and Services
- Prometheus / PromQL
- Flagger Canary resources and MetricTemplates
- Helm and kubectl
- Grafana dashboards

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Flagger install on Kubernetes: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger FAQ for Istio metrics and routing: https://docs.flagger.app/faq
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The manual Istio setup defined only Deployments, but the VirtualService and DestinationRule route to host `my-app`, which must be a service in the Kubernetes service registry. Added a `Service` named `my-app` that selects both versions by `app: my-app`.
- The Prometheus examples did not filter Istio metrics by reporter. Added `reporter="destination"` to the manual error-rate and latency queries and to the custom MetricTemplate query so the examples use server-side Istio telemetry and avoid mixing source and destination observations.
- The Flagger installation command omitted the documented CRD installation step and the matching `--set crd.create=false` Helm value. Added both.
- The Flagger section could be read as using the earlier two-Deployment manual setup, but Flagger expects a single target Deployment and creates the stable primary Deployment itself. Added a clarifying sentence and corrected the workflow description from "creates a canary Deployment" to "creates a primary Deployment".

## Review Notes
- The Istio networking resources use the current stable `networking.istio.io/v1` API.
- The Flagger `Canary` and `MetricTemplate` resources use the current `flagger.app/v1beta1` API and fields shown in official Flagger documentation.
- The `request-duration` metric is described as P99 latency in the post, which matches Flagger's documented Istio duration check.
