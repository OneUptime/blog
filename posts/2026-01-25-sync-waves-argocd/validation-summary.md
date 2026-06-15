# Validation Summary: How to Implement Sync Waves in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync waves and sync hooks
- Argo CD sync options
- Kubernetes manifests
- Kubernetes CustomResourceDefinitions
- Kubernetes StatefulSets, Services, Deployments, Jobs, and health probes
- Helm templates
- Kustomize patches
- Argo CD CLI

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Helm chart template documentation: https://helm.sh/docs/topics/charts/
- Docker Postgres official image documentation: https://hub.docker.com/_/postgres

## Issues Found
- The introduction said Kubernetes applies resources in parallel by default. I changed this to say Kubernetes controllers reconcile resources independently, which is more accurate and avoids implying a specific apply order.
- The Mermaid diagram used subgraph labels as edge identifiers, which is not valid Mermaid flowchart syntax. I added explicit subgraph IDs and updated the edges.
- The `apiextensions.k8s.io/v1` CRD example omitted the required `spec.versions[*].schema.openAPIV3Schema`. I added a minimal structural schema.
- The infrastructure example used a PostgreSQL connection string pointing at `db` without defining a matching Service. I changed the host to `postgres` and added a `Service` for the StatefulSet.
- The PostgreSQL container examples omitted `POSTGRES_PASSWORD`, which is required by the official Postgres image for a new database. I added a simple example password to keep the snippets runnable.
- The migration Job used `argocd.argoproj.io/hook-delete-policy` without declaring the Job as an Argo CD hook. I added `argocd.argoproj.io/hook: Sync` so the delete policy applies correctly.
- The "Skip Health Check" section incorrectly described `SkipDryRunOnMissingResource=true` as a health-check bypass. I renamed it to "Skip Dry Run for Missing Resources" and changed the example to a custom resource scenario.
- The Replace sync option description implied forced replacement. I clarified that `Replace=true` uses replace/create instead of client-side apply.
- The Kustomize JSON patch examples added a nested annotation path that fails if `metadata.annotations` does not already exist. I changed them to inline strategic merge patches with explicit targets.
- The debugging command `argocd app resources myapp --orphaned=false` is not the documented form for listing resources and does not show sync-wave annotations. I replaced it with `argocd app manifests myapp | grep -B 5 "argocd.argoproj.io/sync-wave"` and updated the preceding comment.
- The `argocd app get` comment claimed it shows the currently syncing wave. I updated the comment and added `--show-operation`, which is the documented way to include operation details.

## Review Notes
The examples are still intentionally simplified and use placeholder images, commands, passwords, and partial manifests in a few places. For production guidance, the post could later mention Secrets for credentials and stronger database readiness checks, but those are outside the narrow sync-wave correctness fixes.
