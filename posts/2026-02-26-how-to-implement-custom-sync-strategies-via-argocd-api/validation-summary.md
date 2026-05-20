# Validation Summary: How to Implement Custom Sync Strategies via ArgoCD API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD REST API
- Argo CD sync operations, sync strategies, sync options, selective sync, sync hooks, and sync waves
- Kubernetes resources and deployment patterns
- Python
- Prometheus HTTP API and PromQL
- Bash / curl

## Sources Consulted
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD selective sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/selective_sync/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD sync operation documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-kubectl/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The post said a standard Argo CD sync applies all out-of-sync resources. Argo CD's default sync applies desired manifests, while the `ApplyOutOfSyncOnly=true` selective sync option limits sync to out-of-sync resources. Updated the wording.
- The selective sync section omitted the documented caveats that selective sync operations are not recorded in application history and hooks do not run. Added a short note.
- The canary PromQL error-rate query divided vectors with mismatched label semantics and could produce incorrect values. Changed it to aggregate numerator and denominator with `sum(rate(...))`.
- The Prometheus request did not check HTTP or API-level errors. Added `raise_for_status()` and a response status check.
- The blue-green example claimed to determine the active environment but always deployed green. Added a small placeholder detector based on a routing application annotation and made the inactive app selection use that result.
- The canary restore path silently did nothing when no previous full sync revision existed. Added a message for that condition.

## Review Notes
The snippets are illustrative and still require environment-specific details such as TLS verification, concrete blue-green traffic switching manifests, real smoke tests, RBAC-scoped Argo CD tokens, and a Prometheus metric name/label schema that matches the target application.
