# Validation Summary: How to Use Git Tags for Production Release Gates in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes custom resources
- GitRepository and Kustomization resources
- Git tags and SemVer constraints
- Git CLI
- GitHub Actions

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference for `GitRepositoryRef`: https://fluxcd.io/flux/components/source/api/v1/
- Flux `flux create source git` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_source_git/
- Flux `flux get sources git` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux `flux get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux source watcher documentation for source revision format: https://fluxcd.io/flux/gitops-toolkit/source-watcher/
- Masterminds SemVer constraint documentation: https://github.com/Masterminds/semver#checking-version-constraints

## Issues Found
- The post described production as tracking tag patterns such as `v*`, but the Flux `GitRepository` examples use `.spec.ref.semver`, which selects the latest tag matching a SemVer constraint. I changed the wording to describe latest matching SemVer tag selection.
- The post said `.spec.ref.tag` accepts regex. Flux documents `.spec.ref.tag` as a specific tag checkout field, not a regex field. I changed the section to explain exact tag pinning and SemVer ranges.
- The sample `flux get sources git` output used `v1.5.0/abc123`. Flux documents Git source artifact revisions in the format `<branch|tag>@sha1:<commit>`, so I changed the sample to `v1.5.0@sha1:abc123`.

## Review Notes
The manifest API versions and fields shown for `GitRepository` and `Kustomization` match current Flux v1 APIs. The GitHub Actions example is syntactically valid for a manually dispatched workflow, assuming the workflow runs with permission to push tags to the repository.
