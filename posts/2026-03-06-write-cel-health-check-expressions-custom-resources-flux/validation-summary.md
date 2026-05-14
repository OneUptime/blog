# Validation Summary: How to Write CEL Health Check Expressions for Custom Resources in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD Kustomization API
- Common Expression Language (CEL)
- Kubernetes custom resources and status conditions
- cert-manager Certificate resources
- Istio VirtualService resources
- Argo Rollouts Rollout resources
- Crossplane managed resources
- Knative Service resources
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CEL health check cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux v2.5 GA announcement: https://v2-6.docs.fluxcd.io/blog/2025/02/flux-v2.5.0/
- Flux kustomize package API types: https://pkg.go.dev/github.com/fluxcd/pkg/apis/kustomize
- Istio configuration status field documentation: https://istio.io/latest/docs/reference/config/config-status/
- Argo Rollouts status documentation: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_status/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Knative Services documentation: https://knative.dev/docs/serving/services/

## Issues Found
- Corrected the Flux version prerequisite from v2.4+ to v2.5+, because Flux v2.5 introduced CEL custom health checks for Kustomizations.
- Replaced invalid `healthChecks[].cel.expression` examples with the supported `.spec.healthCheckExprs` structure using `current`.
- Removed `name` and `namespace` fields from CEL health check expression entries, because Flux custom health check expressions are keyed by `apiVersion` and `kind`, not individual object references.
- Added `wait: true` where examples only use `healthCheckExprs`, because Flux only evaluates these expressions when `.spec.wait` is enabled or `.spec.healthChecks` is specified.
- Replaced `self.status`, `self.spec`, and `self.metadata` references with direct field access such as `status`, `spec`, and `metadata`, matching Flux's custom health check expression input model.
- Added a guard against division by zero in the percentage-based replica health example.
- Corrected the Istio VirtualService example to use the documented `PassedAnalysis` condition and noted that Istio status reporting must be enabled.
- Updated optional-field examples to use `has(status.conditions)` instead of `has(status)` because Flux documents that checking a missing top-level field with `has(status)` can itself error.

## Review Notes
Flux `healthCheckExprs` apply by resource kind for resources in the Kustomization inventory; they are not per-object entries like `healthChecks`. The examples remain generic and should be tested against each operator's actual status schema before production use.
