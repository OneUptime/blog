# Validation Summary: How to Configure Custom Health Checks for Jobs in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux kustomize-controller
- Kubernetes Jobs
- Kubernetes GitOps workflows
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux v2.6 release information: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- Flux kustomize-controller v1.6.0 source for custom Job status reader usage: https://github.com/fluxcd/kustomize-controller/blob/v1.6.0/internal/controller/kustomization_controller.go
- Flux runtime custom Job status reader source: https://github.com/fluxcd/pkg/blob/main/runtime/statusreaders/job.go
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The prerequisites listed Flux v2.3 or later, but the described behavior of waiting for Jobs to complete relies on Flux's custom Job status reader, present in kustomize-controller v1.6.0 / Flux v2.6.0 and later. Updated the prerequisite to Flux v2.6 or later.
- The post stated that Kubernetes Jobs are immutable once created. Refined this to specify that Job pod templates are immutable, because the practical update failure discussed is caused by changing fields such as the container image or command in `spec.template`.
- The versioned Job name example used `${MIGRATION_VERSION}` placeholders without showing the Flux post-build substitution or templating setup required to render them. Replaced the placeholder with a concrete versioned Job name and image tag.
- The debugging command used `flux get kustomization db-migration`; the documented Flux get subcommand is `flux get kustomizations`. Updated the command to list Kustomizations in the `flux-system` namespace.

## Review Notes
The Flux documentation states that `wait: true` ignores explicit `healthChecks` and checks all reconciled resources. The post's `wait: true` example is correct because it does not combine `wait` with explicit `healthChecks`.
