# Validation Summary: How to Use the argocd.argoproj.io/sync-wave Annotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync waves and hooks
- Kubernetes manifests
- Kubernetes Deployments, StatefulSets, Services, Ingress, Jobs, Secrets, PVCs, and HPA
- Prometheus Operator ServiceMonitor
- PostgreSQL container configuration
- Argo CD CLI

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Docker PostgreSQL official image documentation: https://hub.docker.com/_/postgres
- Prometheus Operator ServiceMonitor API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction said Argo CD applies all resources simultaneously without sync waves. Updated it to match Argo CD's documented ordering by phase, wave, kind, and name.
- The wave processing explanation implied Argo CD simply waits for each numeric wave in sequence. Updated it to say waves must become in-sync and healthy before later waves proceed.
- The full-stack example used `postgres:16` without setting the required PostgreSQL password. Added a Secret and wired `POSTGRES_PASSWORD` and `POSTGRES_DB` into the StatefulSet.
- The migration Job used an invalid PostgreSQL URL format and did not define the referenced credentials. Updated it to read a proper connection URL from the Secret.
- The Ingress referenced `api-server` and `web-frontend` Services that were not defined. Added the missing Services.
- The ServiceMonitor referenced a `metrics` Service port that was not defined. Updated it to scrape the defined `http` port on the API Service.
- The health-check summary overstated built-in health behavior for StatefulSets, Jobs, Services, and ConfigMaps/Secrets. Updated those bullets to align with Argo CD's resource health documentation.
- The debugging command used `argocd app resources --output json`, but current Argo CD docs list only tree output for that command. Changed it to `argocd app get --output json`.

## Review Notes
YAML code blocks were parsed successfully after the edits. The manifest remains an illustrative example; production use should replace placeholder credentials and verify application-specific readiness and metrics endpoints.
