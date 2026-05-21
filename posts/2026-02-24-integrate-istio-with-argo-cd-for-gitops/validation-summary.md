# Validation Summary: How to Integrate Istio with Argo CD for GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Helm

## Sources Consulted
- Argo CD Getting Started: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Istio Helm installation guide: https://istio.io/latest/docs/setup/install/helm/
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/

## Issues Found
- Updated the Argo CD install command to include `--server-side --force-conflicts`, matching current Argo CD installation guidance and avoiding client-side apply annotation size issues with Argo CD CRDs.
- Updated the local `argocd login` command to include `--insecure`, because the default port-forwarded Argo CD API server uses a self-signed certificate.
- Replaced the recommendation to manage a live Istio installation through an in-cluster `IstioOperator` resource. Istio deprecated the in-cluster operator in 1.23 and removed it in later releases, so the post now uses the official Istio Helm charts with Argo CD.
- Replaced the `IstioOperator` manifest example with Helm chart values and noted the `base.validationFailurePolicy=Fail` caveat when Argo CD server-side apply is enabled for Istio Helm chart rendering.

## Review Notes
The custom Argo CD health checks in the post intentionally mark several Istio configuration resources as healthy. This is syntactically valid Lua resource customization, but teams should replace always-healthy checks with resource-specific checks if they need health status to reflect controller status fields or analyzer output.
