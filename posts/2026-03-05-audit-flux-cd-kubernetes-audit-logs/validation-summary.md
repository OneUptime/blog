# Validation Summary: How to Audit Flux CD Operations with Kubernetes Audit Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes audit logging
- Kubernetes audit policy API (`audit.k8s.io/v1`)
- Kubernetes API server audit log backend
- Flux CD controllers and custom resource groups
- Fluent Bit log forwarding
- `jq` audit log queries

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes API server flag reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes audit configuration API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Flux GitOps Toolkit components documentation: https://fluxcd.io/flux/components/
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux Kustomize controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux Kustomization impersonation documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Fluent Bit grep filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/grep

## Issues Found
- The description and introduction claimed audit logging can track "all operations" performed by Flux CD controllers. Kubernetes audit logs only cover requests that go through the Kubernetes API server and are subject to the configured audit policy, so the wording was narrowed to "Kubernetes API operations."
- A policy comment claimed a rule logs all create, update, and delete operations by Flux service accounts, but the rule also includes `patch` and is scoped to selected resources. The comment was updated to accurately describe the verbs and scope.
- The conclusion claimed Kubernetes audit logs provide "complete visibility" into Flux CD operations. This was corrected to say they provide visibility into Flux operations that go through the Kubernetes API server.

## Review Notes
- The audit policy uses the current `audit.k8s.io/v1` API, valid audit levels, valid wildcard resource matching, and valid API server audit flags.
- The examples correctly keep Secret access at `Metadata` level to avoid logging Secret request or response bodies.
- The Fluent Bit grep filter uses documented record accessor syntax for nested fields.
- Managed Kubernetes providers may expose audit logging through provider-specific configuration rather than direct kube-apiserver manifest edits.
