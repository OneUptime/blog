# Validation Summary: How to Push Kustomize Bases to OCI for ArgoCD Consumption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Flux CLI
- Kustomize
- OCI registries
- ORAS
- GitHub Actions
- Kubernetes manifests

## Sources Consulted
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/oci/
- Argo CD multiple sources user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD config management plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Flux CLI `push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `pull artifact` documentation: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI `tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI `list artifacts` documentation: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux OCI artifacts documentation: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- ORAS pushing and pulling guide: https://oras.land/docs/how_to_guides/pushing_and_pulling/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post used `flux login`, but the Flux CLI does not provide that command. Replaced the examples with `docker login`, which Flux can use through Docker registry credentials.
- Flux `--revision` examples used only a raw commit SHA, while Flux documents the format as `<branch|tag>@sha1:<commit-sha>`. Updated the examples accordingly.
- The post implied Flux artifacts work with Argo CD OCI support by default. Argo CD only accepts selected layer media types by default, while Flux uses `application/vnd.cncf.flux.content.v1.tar+gzip`. Added the required Argo CD repo-server media type caveat.
- The ORAS example used custom Kustomize media types that Argo CD does not accept by default. Replaced it with an ORAS directory push that uses Argo CD's default OCI layer media type behavior.
- The GitHub Actions workflow used `flux login` and included a `paths` filter on tag pushes. Replaced login with `docker login`, fixed the source URL context, fixed the revision string, and removed the misleading path filter because GitHub does not evaluate path filters for tag pushes.
- The Argo CD OCI Application examples omitted the required `oci://` scheme and `path: .`. Added both fields.
- The multi-source example incorrectly used `$base` as a Kustomize resource reference. Argo CD `$ref` source variables are documented for Helm value files, not Kustomize resources. Reworked the example to describe Argo CD's actual multi-source behavior and added the caveat for patching OCI base resources from a Git overlay.
- The config management plugin example pulled OCI artifacts but left Kustomize with unresolved `oci://` resources. Updated the plugin convention so it pulls URLs from `oci-bases.txt` into local paths that Kustomize can reference.
- The repository credential example used Helm OCI settings for a native OCI source. Changed it to `type: oci` with an OCI repository URL.
- The versioning guidance suggested a wildcard `targetRevision`. Argo CD OCI sources document `targetRevision` as a tag or digest, so the example now recommends exact pins and warns against floating tags.

## Review Notes
Argo CD's native OCI support requires a single-layer artifact and an accepted layer media type. Flux remains useful for publishing OCI artifacts, but direct Argo CD consumption requires repo-server media type configuration unless artifacts are pushed with a default Argo CD-compatible layer media type such as the ORAS example.
