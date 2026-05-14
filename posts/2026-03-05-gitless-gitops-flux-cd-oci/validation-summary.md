# Validation Summary: How Gitless GitOps Works with Flux CD and OCI

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux CLI
- Flux source-controller
- Flux kustomize-controller
- Flux helm-controller
- Kubernetes
- OCI artifacts
- Container registries
- Helm charts

## Sources Consulted
- Flux CLI documentation: `flux push artifact` - https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI documentation: `flux pull artifact` - https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI documentation: `flux tag artifact` - https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI documentation: `flux list artifacts` - https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux OCIRepository documentation - https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1 - https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation - https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide - https://fluxcd.io/flux/guides/helmreleases/

## Issues Found
- The `--revision` examples used `branch/commit`, but the Flux CLI documents the value as `<branch|tag>@sha1:<commit-sha>`. Updated all examples and the explanatory bullet to use `branch@sha1:commit`.
- The artifact listing command used `flux list artifact`, but the current Flux CLI command is `flux list artifacts`. Updated the command.
- The post described OCI artifacts as immutable without noting tag mutability. Updated the wording to state that artifacts can be addressed immutably by digest while tags are convenient version references.
- The Helm section implied that `OCIRepository` is only for raw Kubernetes manifests. Updated it to note that Flux also recommends `OCIRepository` for improved OCI Helm chart support.

## Review Notes
The `HelmRepository` `type: oci` example is still valid, but Flux documentation marks that type as maintenance mode and recommends `OCIRepository` for improved OCI Helm chart support. The post now includes that caveat without restructuring the section.
