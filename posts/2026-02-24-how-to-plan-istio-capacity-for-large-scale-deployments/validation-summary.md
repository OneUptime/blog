# Validation Summary: How to Plan Istio Capacity for Large-Scale Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar proxies
- IstioOperator configuration
- Istio Sidecar resources
- Istio discovery selectors
- Horizontal Pod Autoscaling
- Prometheus metrics
- Fortio load testing

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Configuration Scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- IstioOperator Options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio discovery selectors blog: https://istio.io/latest/blog/2021/discovery-selectors/
- Istio Circuit Breaking task, Fortio client examples: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio istioctl command reference, Istiod metric names: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/

## Issues Found
- Updated the Sidecar resource API version from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1`.
- Corrected the proxy concurrency explanation. Current Istio documentation says unset concurrency is automatically determined based on CPU limits; it is not always a fixed default of 2 worker threads.
- Replaced outdated or incorrect Istiod metric names. `pilot_xds_connected_clients` was changed to `pilot_xds`, and `pilot_xds_push_errors` was replaced with current XDS error/reject metrics: `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`.
- Corrected the Fortio load-testing example to deploy Istio's Fortio sample client and execute `/usr/bin/fortio` from the `fortio` container instead of running `fortio` from the `sleep` sample pod.
- Adjusted the Fortio wording from "Istio's recommended load testing tool" to "one of Istio's benchmarking tools" to match current Istio performance documentation.

## Review Notes
The sizing examples are rough planning guidance rather than official guarantees. Istio's current performance documentation emphasizes measuring against workload-specific factors such as request rate, connection count, payload size, proxy features, and configuration size.
