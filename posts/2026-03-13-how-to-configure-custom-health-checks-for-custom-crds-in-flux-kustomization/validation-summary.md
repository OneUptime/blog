# Validation Summary: How to Configure Custom Health Checks for Custom CRDs in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux kustomize-controller
- Kubernetes CustomResourceDefinitions and custom resources
- Kubernetes kstatus health checks
- Common Expression Language (CEL)
- cert-manager
- Prometheus Operator
- Crossplane
- Sealed Secrets
- kubectl and Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CEL health check cheatsheet: https://fluxcd.io/flux/cheatsheets/cel-healthchecks/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux v2.3 release notes: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Kubernetes kstatus package documentation: https://pkg.go.dev/sigs.k8s.io/cli-utils/pkg/kstatus
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes `kubectl logs` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The prerequisites said Kubernetes 1.25 or later. Current Flux support is version-specific, and recent Flux releases require newer Kubernetes versions. Changed this to require a Kubernetes cluster supported by the installed Flux version.
- The post described `Ready=False` on custom resources as unhealthy. kstatus treats a generic custom resource with `Ready=False` as still reconciling, and Flux waits until it becomes ready or times out. Updated the explanation.
- The post implied `wait: true` fully health checks Prometheus Operator resources without status conditions. Clarified that Flux can only perform readiness checks for resources with supported health semantics, and successful apply is the main signal for resources without status.
- The debugging command used `flux get kustomization certificates`; the documented Flux CLI command is `flux get kustomizations`. Updated the command.
- The debugging section used `jq` but the prerequisites did not mention it. Added jq as an optional debugging prerequisite.

## Review Notes
The Flux Kustomization API examples use the current `kustomize.toolkit.fluxcd.io/v1` API and place `healthCheckExprs` correctly at `spec.healthCheckExprs`. The CEL examples match the form shown in Flux documentation and the Flux CEL health check cheatsheet.
