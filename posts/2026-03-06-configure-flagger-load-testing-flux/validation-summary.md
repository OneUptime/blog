# Validation Summary: How to Configure Flagger Load Testing with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flagger
- Kubernetes
- Flagger Canary resources
- Flagger load tester
- hey
- wrk
- ghz
- kubectl

## Sources Consulted
- Flagger install with Flux documentation: https://fluxcd.io/flagger/install/flagger-install-with-flux/
- Flagger webhooks and load testing documentation: https://fluxcd.io/flagger/usage/webhooks/
- Flagger Canary service documentation: https://fluxcd.io/flagger/usage/how-it-works/
- Flagger repository README and Canary example: https://github.com/fluxcd/flagger
- Flagger load tester Dockerfile: https://raw.githubusercontent.com/fluxcd/flagger/main/Dockerfile.loadtester
- Flagger loadtester package documentation: https://pkg.go.dev/github.com/fluxcd/flagger/pkg/loadtester
- Flagger loadtester Helm chart metadata: https://artifacthub.io/packages/helm/flagger/loadtester

## Issues Found
- The load tester deployment example was a plain Kubernetes Deployment and Service applied with `kubectl`, despite the post saying it was deployed with Flux. Replaced it with the official Flux `OCIRepository` and `Kustomization` pattern for deploying the Flagger load tester manifests from `ghcr.io/fluxcd/flagger-manifests`.
- The deployment example pinned `ghcr.io/fluxcd/flagger-loadtester:0.31.0`, which is outdated compared with the current loadtester chart/image release. The Flux manifest now tracks the supported Flagger manifests with `semver: 1.x`.
- The post claimed Fortio was supported by the official Flagger load tester image. The current official image includes tools such as `hey`, `wrk`, and `ghz`, but not Fortio. Replaced the Fortio section with a `wrk` example and updated the introduction and conclusion accordingly.
- The post did not mention the service mesh sidecar injection requirement for the load tester namespace. Added a short caveat to the deployment step.

## Review Notes
The `hey`, `ghz`, webhook metadata, Canary `spec.service`, metrics, and `kubectl` inspection examples are consistent with current Flagger documentation. The gRPC example uses a custom proto path, so users must mount or otherwise provide that proto file in the load tester container for that exact command to run.
