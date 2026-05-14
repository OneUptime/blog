# Validation Summary: How to Troubleshoot HelmChart Pull Errors in Flux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes
- Helm
- HelmChart and HelmRepository custom resources
- OCI Helm repositories
- TLS and Kubernetes Secrets

## Sources Consulted
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Flux CLI documentation for `flux get sources chart`: https://fluxcd.io/flux/cmd/flux_get_sources_chart/
- Flux CLI documentation for `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Flux CLI documentation for `flux reconcile source chart`: https://fluxcd.io/flux/cmd/flux_reconcile_source_chart/
- Flux CLI documentation for `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Helm CLI documentation for `helm repo add`: https://helm.sh/docs/v3/helm/helm_repo_add/
- Helm CLI documentation for `helm search repo`: https://helm.sh/docs/helm/helm_search_repo/
- Kubernetes kubectl documentation for `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl documentation for `kubectl run`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl documentation for `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/

## Issues Found
- The "failed to fetch chart" log command comment said it checked whether the source-controller pod could reach the repository URL, but the command only reads source-controller logs. Updated the comment to accurately describe the command.
- The OCI authentication section created a Docker registry secret but did not show that Flux requires the secret to be referenced by an OCI `HelmRepository` with `spec.type: oci` and an `oci://` URL. Added a minimal OCI HelmRepository example.
- The debug logging patch replaced the full source-controller argument list, which could remove existing controller flags such as storage or runtime options. Replaced it with a JSON patch that appends `--log-level=debug` only when the deployment does not already define a log-level argument.

## Review Notes
The remaining Flux `HelmChart` and `HelmRepository` API examples use the current `source.toolkit.fluxcd.io/v1` API and current field names. The CLI examples for `flux get sources`, `flux reconcile source`, Helm repository search, Kubernetes logs, temporary curl pod creation, and registry secret creation align with current official documentation.
