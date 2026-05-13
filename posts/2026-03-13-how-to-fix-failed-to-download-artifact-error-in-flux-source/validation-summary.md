# Validation Summary: How to Fix failed to download artifact Error in Flux Source

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux source-controller
- Flux GitRepository, HelmRepository, and OCIRepository APIs
- Flux CLI
- Kubernetes kubectl
- Kubernetes Secrets for registry authentication
- OCI registries and Helm chart artifacts
- go-containerregistry crane CLI

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Helm release guide, OCIRepository chart source examples: https://fluxcd.io/flux/guides/helmreleases/
- Flux CLI documentation for `flux get sources all`: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux CLI documentation for `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- go-containerregistry crane command documentation: https://pkg.go.dev/github.com/google/go-containerregistry/cmd/crane

## Issues Found
- The OCIRepository example used a Helm chart-like OCI path but did not select the Helm chart content layer. Current Flux Helm release guidance says an OCIRepository used for Helm charts should set `layerSelector` with the Helm chart content media type and `operation: copy`. Added the `layerSelector` block to the OCIRepository credentials example so it works for the Helm chart scenario described by the post.

## Review Notes
- Local `flux`, `kubectl`, and `crane` binaries were not installed in the review environment, so command validation was performed against official command documentation rather than local `--help` output.
- The `flux get sources all` command is documented by Flux as preview and under development, so future Flux releases could change it.
- The network test command assumes the source-controller container image includes `wget`; in minimal images, using a separate debug pod may be necessary.
