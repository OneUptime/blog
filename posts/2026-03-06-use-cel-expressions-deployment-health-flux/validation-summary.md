# Validation Summary: How to Use CEL Expressions for Deployment Health in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization API
- Flux kustomize-controller health checks
- Kubernetes Deployments
- Kubernetes readiness and liveness probes
- kubectl
- GitOps deployment dependencies

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes cli-utils kstatus package documentation: https://pkg.go.dev/sigs.k8s.io/cli-utils/pkg/kstatus/status

## Issues Found
- The post title, tags, and description claimed the article was about CEL expressions for Deployment health. Flux supports CEL health check expressions through `.spec.healthCheckExprs` for custom resources, and dependency readiness expressions through `.spec.dependsOn[].readyExpr`, but the article's examples use standard Deployment health checks through `.spec.healthChecks` and `.spec.wait`. Updated the title, tags, and description to accurately describe the content as Deployment health checks in Flux.

## Review Notes
The Flux Kustomization examples use the current `kustomize.toolkit.fluxcd.io/v1` API, valid `.spec.healthChecks`, `.spec.wait`, `.spec.timeout`, and `.spec.dependsOn` fields. The Kubernetes Deployment manifest uses valid `apps/v1` syntax and valid readiness/liveness probe fields. The `kubectl get deployment` and `kubectl get kustomization` commands are valid for inspecting resource status.
