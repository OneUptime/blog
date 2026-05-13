# Validation Summary: How to Use CEL Expressions for Sealed Secrets Health in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux CEL health check expressions
- Kubernetes custom resources
- Bitnami Sealed Secrets
- kubectl and Flux CLI debugging commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CEL health checks cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux v2.5 GA announcement: https://fluxcd.io/blog/2025/02/flux-v2.5.0/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Sealed Secrets Go API documentation: https://pkg.go.dev/github.com/bitnami-labs/sealed-secrets/pkg/apis/sealed-secrets/v1alpha1
- Bitnami Sealed Secrets release notes: https://github.com/bitnami-labs/sealed-secrets/blob/main/RELEASE-NOTES.md

## Issues Found
- The post stated that Flux v2.3 or later supported CEL health checks. Flux v2.5 introduced custom health checks using CEL, so the prerequisite was changed to Flux v2.5 or later.
- The post used a non-existent nested `healthChecks[].cel.healthyWhen` field. Flux defines CEL custom health checks under `spec.healthCheckExprs`, with `current`, optional `failed`, and optional `inProgress` expressions. All examples were updated to use `healthChecks` for target resources and `healthCheckExprs` for CEL evaluation.
- The prerequisite said "Sealed Secrets controller installed (kubeseal)", which conflated the controller with the `kubeseal` CLI. It was changed to require the controller, with `kubeseal` available when sealing new secrets.
- The Kubernetes prerequisite used a fixed "1.25 or later" claim. It was changed to require a Kubernetes version supported by the installed Flux release.

## Review Notes
- The SealedSecret `Synced` condition, `observedGeneration` field, strict/default sealing scope behavior, key renewal behavior, and debugging commands are consistent with the official Sealed Secrets and Flux documentation.
- Flux documentation notes that `wait: true` causes `.spec.healthChecks` to be ignored, so the examples intentionally use explicit `healthChecks` with `healthCheckExprs` for targeted SealedSecret checks.
