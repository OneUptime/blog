# Validation Summary: How to Use Timoni flux-git-sync Module for Git Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Timoni
- Flux
- Kubernetes
- GitRepository
- Kustomization
- GitOps
- YAML configuration

## Sources Consulted
- Timoni Flux AIO documentation: https://timoni.sh/flux-aio/
- Timoni apply CLI reference: https://timoni.sh/cmd/timoni_apply/
- Timoni build CLI reference: https://timoni.sh/cmd/timoni_build/
- Timoni mod pull CLI reference: https://timoni.sh/cmd/timoni_mod_pull/
- Timoni list/status/delete CLI references: https://timoni.sh/cmd/timoni_list/, https://timoni.sh/cmd/timoni_status/, https://timoni.sh/cmd/timoni_delete/
- flux-git-sync module README: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-git-sync/README.md
- flux-git-sync module CUE schema and templates: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-git-sync/templates
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post used `timoni mod values`, which is not present in the current Timoni CLI reference. Replaced it with `timoni mod pull` followed by inspection of `templates/config.cue`.
- The examples used Flux-style nested `git.ref.branch`, `git.ref.tag`, and `git.ref.semver` values. The flux-git-sync module schema expects `git.ref` to be a string and renders it as `spec.ref.name`, so examples now use refs such as `refs/heads/main` and `refs/tags/v1.5.0`.
- The post claimed SSH authentication was supported by this module and used `ssh://` URLs plus `secretRef`. The module schema only accepts HTTPS URLs and supports token or GitHub App authentication, so the SSH section was changed to GitHub App authentication.
- The HTTPS token example created a Kubernetes Secret manually and referenced it with `git.secretRef`, but the module has no `secretRef` value. Updated the example to use `git.token`, which causes the module to generate the Flux Secret.
- Several examples used duration strings such as `"5m"` and `"10m"` for module fields that are defined as integer minute values. Updated intervals and timeouts to integers.
- `sync.interval` was shown, but the module has no such field. Removed it.
- `sync.dependsOn` was shown under `sync`, but the module defines `dependsOn` as a top-level value. Moved it to the correct location.
- `sync.postBuild.substitute` and `sync.postBuild.substituteFrom` were shown, but the module defines `substitute` and `substituteFrom` as top-level values and maps them to Flux `postBuild`. Moved them to the correct location.
- The post claimed semver range tracking for this module. Flux supports `spec.ref.semver`, but this module only exposes a string `git.ref` rendered as `spec.ref.name`; removed the semver range example.

## Review Notes
The examples were reviewed against current official documentation and upstream module source. The Timoni, Flux, and kubectl CLIs were not installed in the local environment, so commands could not be executed locally.
