# Validation Summary: How to Use Remote Kustomize Bases with Flux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux kustomize-controller
- GitRepository
- OCIRepository
- Kustomize
- Kubernetes manifests
- Flux CLI

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux create secret git` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux reconcile source git` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Kubernetes `kubectl kustomize` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The original GitRepository strategy implied that Flux can mount a remote GitRepository source into a local Kustomize overlay through a Flux Kustomization. Flux Kustomizations reference a single source artifact; combining repository artifacts is done with `GitRepository.spec.include`. Updated the section to define a local `GitRepository` that includes the remote base artifact, then points the Flux Kustomization at the local overlay.
- The original `dependsOn` example described local customizations as if they were Kustomize overlays patching the remote base. `dependsOn` only orders reconciliation between Kustomizations. Updated the explanation and example path to describe separate add-on resources that depend on the base, not overlay patches.
- The `flux push artifact` example used `--revision="v1.2.0"`, but the Flux CLI documents the revision format as `<branch|tag>@sha1:<commit-sha>`. Updated the example to `--revision="v1.2.0@sha1:$(git rev-parse HEAD)"`.

## Review Notes
- The local environment did not have the `flux` CLI installed, so CLI flags were verified against the official Flux CLI documentation instead of local `--help` output.
- The Flux API versions used in the post (`source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1`) are current in the official Flux documentation.
