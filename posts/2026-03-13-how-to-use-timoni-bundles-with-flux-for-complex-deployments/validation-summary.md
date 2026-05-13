# Validation Summary: How to Use Timoni Bundles with Flux for Complex Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Timoni bundles
- Timoni runtime values
- Flux CD
- Flux AIO `flux-helm-release` module
- Flux AIO `flux-git-sync` module
- Kubernetes
- CUE
- Helm charts

## Sources Consulted
- Timoni Bundle documentation: https://timoni.sh/bundle/
- Timoni Bundle Runtime documentation: https://timoni.sh/bundle-runtime/
- Timoni CLI reference for bundle commands: https://timoni.sh/cmd/timoni_bundle/
- Flux AIO `flux-helm-release` module README: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-helm-release
- Flux AIO `flux-git-sync` module README: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-git-sync
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The `flux-helm-release` examples used a `release` block with nested `values`, but the current module schema uses `sync` for reconcile settings and `helmValues` for chart values. Updated all Helm release bundle examples accordingly.
- The Helm release examples used string intervals such as `"10m"`, but the current module schema expects `sync.interval` as an integer number of minutes. Changed the examples to `interval: 10`.
- The `flux-git-sync` runtime example nested substitution under `sync.postBuild.substitute`, but the module exposes this as top-level `substitute`. Moved the substitution map to the current module field.
- The runtime environment variable example omitted the required `--runtime-from-env` flag. Added it to the `timoni bundle apply` command.
- The first bundle example placed `dependsOn` under `sync` for `flux-git-sync`, which is not part of the module's `sync` schema and was not valid for the shown HelmRelease dependencies. Removed the invalid field and adjusted the text to describe Timoni's documented ordered application.
- The post described bundle application as dependency-order based. Timoni documents that bundles apply instances in definition order and wait for readiness by default, so the wording was corrected.
- The status/listing commands were imprecise. Replaced `timoni list -A` with `timoni bundle status -f bundle.cue` for status, and used `timoni list --bundle my-app-stack -A` when listing instances for the bundle.

## Review Notes
The examples still use `version: "latest"` for Timoni modules, which Timoni supports but does not recommend for production unless a digest is also specified. The post is acceptable as a tutorial, but production guidance should pin module versions or digests in a future revision.
