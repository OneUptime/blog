# Validation Summary: How to Configure Knative Serving Autoscaler with Custom Concurrency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Knative Serving
- Knative Pod Autoscaler (KPA)
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- kubectl
- hey load testing tool

## Sources Consulted
- Knative Serving autoscaling overview: https://knative.dev/docs/serving/autoscaling/
- Knative supported autoscaler types: https://knative.dev/docs/serving/autoscaling/autoscaler-types/
- Knative autoscaling metrics configuration: https://knative.dev/docs/serving/autoscaling/autoscaling-metrics/
- Knative autoscaling targets: https://knative.dev/docs/serving/autoscaling/autoscaling-targets/
- Knative concurrency configuration: https://knative.dev/docs/serving/autoscaling/concurrency/
- Knative scale bounds: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Knative scale-to-zero configuration: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Knative KPA-specific configuration: https://knative.dev/docs/serving/autoscaling/kpa-specific/
- Knative Serving metrics reference: https://knative.dev/docs/serving/observability/metrics/serving-metrics/
- Knative traffic management: https://knative.dev/docs/serving/traffic-management/
- Knative creating services documentation: https://knative.dev/docs/serving/services/creating-services/

## Issues Found
- Corrected the description of KPA/HPA from autoscaler "modes" to autoscaler implementations, and clarified that HPA can use CPU, memory, or custom metrics while KPA supports scale-to-zero.
- Replaced the outdated sample image `gcr.io/knative-samples/helloworld-go` with the current documented sample image `ghcr.io/knative/helloworld-go:latest`.
- Removed the invalid `autoscaling.knative.dev/container-concurrency` annotation. Knative documents the hard concurrency limit as the `spec.template.spec.containerConcurrency` field, not as an autoscaling annotation.
- Corrected the concurrency explanation so `autoscaling.knative.dev/target` is the soft target and `containerConcurrency` is the hard limit.
- Removed invalid per-revision `autoscaling.knative.dev/scale-up-rate` and `autoscaling.knative.dev/scale-down-rate` annotations. Knative documents scale up/down rate settings as global `config-autoscaler` keys, not per-revision annotations.
- Corrected scale-to-zero wording: `scale-to-zero-grace-period` is an internal network programming upper bound, while `scale-to-zero-pod-retention-period` retains the last pod after scale-to-zero has been selected.
- Fixed the custom metrics example so it uses an actual custom HPA metric name instead of labeling CPU scaling as a custom metric.
- Replaced outdated/non-current autoscaler metric names such as `autoscaler_desired_pods`, `autoscaler_actual_pods`, and `revision_app_request_count` with the current Knative metrics documented as `kn.revision.*` and `http.server.request.duration`.
- Updated the Prometheus alert examples and metric grep command to use Prometheus-normalized versions of the current Knative metric names.

## Review Notes
The Prometheus examples assume the metrics pipeline exposes OpenTelemetry metric names with Prometheus-compatible underscore normalization, such as `kn_revision_pods_desired` for Knative's documented `kn.revision.pods.desired`. Exact label names can vary by metrics backend and should be confirmed in the target cluster before production alerting.
