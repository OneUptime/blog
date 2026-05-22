# Validation Summary: How to Compare Istio Performance Across Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- kubectl
- Fortio
- Prometheus / PromQL
- Envoy sidecars

## Sources Consulted
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Resource Labels: https://istio.io/latest/docs/reference/config/labels/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Fortio usage documentation: https://fortio.github.io/fortio-website/docs/getting-started/usage
- Kubernetes kubectl create service clusterip reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_service_clusterip/

## Issues Found
- The post described installing Istio with a "revision tag" while the commands used actual Istio control plane revisions. Changed the wording to "revision" and clarified that the matching `istioctl` binary should be used for each Istio version.
- The examples used Istio 1.20 and 1.21, which are no longer supported releases. Updated the examples to compare supported 1.29 and 1.30 revisions.
- The workload manifest did not create a Kubernetes Service for `echo-server`, but the benchmark commands called `http://echo-server.<namespace>:8080/echo`. Added an `echo-server` Service selecting the echo server pods on port 8080.
- The resource usage script printed separate "Memory" and "CPU" headings while running the same `kubectl top pods --containers` command twice. Updated it to run once under a combined "CPU and memory" heading.

## Review Notes
The examples use `fortio/fortio:latest` and `bitnami/kubectl:latest`. These are valid image references, but pinning image versions would make the benchmarks more reproducible in a production upgrade workflow.
