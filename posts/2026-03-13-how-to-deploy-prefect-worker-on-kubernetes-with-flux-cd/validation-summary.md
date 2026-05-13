# Validation Summary: How to Deploy Prefect Worker on Kubernetes with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prefect workers and Kubernetes work pools
- Prefect Helm chart
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes Secrets, Jobs, ServiceAccounts, Roles, and RoleBindings
- Python Prefect client SDK
- SOPS-managed Kubernetes Secrets

## Sources Consulted
- Prefect Kubernetes deployment guide: https://docs.prefect.io/v3/how-to-guides/deployment_infra/kubernetes
- Prefect work pool CLI reference: https://docs.prefect.io/v3/api-ref/cli/work-pool
- Prefect REST API work pool creation reference: https://docs.prefect.io/v3/api-ref/rest-api/server/work-pools/create-work-pool
- Prefect Kubernetes worker SDK reference: https://reference.prefect.io/prefect_kubernetes/worker/
- Prefect Helm chart README and values: https://github.com/PrefectHQ/prefect-helm/tree/main/charts/prefect-worker
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The HelmRelease used `spec.createNamespace`, which is not a valid Flux HelmRelease field. Changed it to `spec.install.createNamespace`.
- The Prefect Helm values used an ignored `worker.image.tag` value and an outdated Prefect 2 image tag. Updated the chart example to use `worker.image.prefectTag: "3-python3.11-kubernetes"` and a current `2026.x` chart constraint.
- The worker RBAC value was shown as `worker.rbac.create`, but the current chart uses top-level `role` and `rolebinding` values. Removed the invalid value and provided explicit cross-namespace RBAC for the flow-job namespace.
- The worker was configured to submit flow jobs into `prefect-flows`, but the Helm chart's default RoleBinding only covers the worker namespace. Replaced the invalid ClusterRoleBinding example with a Role and RoleBinding in `prefect-flows` that binds to the worker service account in `prefect`.
- The base job template used `job` instead of the Prefect Kubernetes worker's `job_manifest` field and placed `ttlSecondsAfterFinished` under the pod template. Updated the template to match the Kubernetes Job manifest structure used by Prefect.
- The Python work pool setup example did not instantiate Prefect's `WorkPoolCreate` schema or call the async function. Updated the script to create a `WorkPoolCreate` object and run it with `asyncio.run`.
- The post advised updating the worker image when flow dependencies change. Updated this to recommend changing the flow image in the work pool base job template or deployment job variables.

## Review Notes
- The Prefect Helm chart and Prefect Kubernetes worker are version-sensitive. The post now targets the current Prefect 3 chart shape, but future chart releases may add or rename values.
- The base job template is intentionally concise for a blog post. In production, start from `prefect work-pool get-default-base-job-template --type kubernetes` and make minimal edits so all default worker placeholders remain available.
