# Validation Summary: How to Use Timoni flux-helm-release Module for Helm Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Timoni
- Flux
- Kubernetes
- Helm
- HelmRelease
- HelmRepository
- OCIRepository
- YAML

## Sources Consulted
- Timoni flux-aio documentation: https://timoni.sh/flux-aio/
- Timoni apply command documentation: https://timoni.sh/cmd/timoni_apply/
- Timoni build command documentation: https://timoni.sh/cmd/timoni_build/
- Timoni module command documentation: https://timoni.sh/cmd/timoni_mod/
- Timoni mod show config documentation: https://timoni.sh/cmd/timoni_mod_show_config/
- Timoni concepts documentation: https://timoni.sh/concepts/
- flux-helm-release module README: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-helm-release
- flux-helm-release module schema: https://raw.githubusercontent.com/stefanprodan/flux-aio/main/modules/flux-helm-release/templates/config.cue
- flux-helm-release HelmRelease template: https://raw.githubusercontent.com/stefanprodan/flux-aio/main/modules/flux-helm-release/templates/helmrelease.cue
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The module inspection command used `timoni mod values`, which is not a current Timoni command. Replaced it with `timoni mod pull` followed by `timoni mod show config` for inspecting the module schema.
- The Timoni values examples used unsupported module fields such as `repository.type`, `repository.interval`, and `release`. Updated the examples to use the module's actual `repository`, `chart`, `sync`, `helmValues`, `helmValuesFrom`, and `dependsOn` fields.
- The examples used Flux-style duration strings such as `"10m"` for module sync intervals, but the module schema expects integer minute values. Updated these to integer values.
- The post described configurable upgrade and rollback settings that the flux-helm-release module does not expose. Reframed the section around reconciliation retries, which the module supports through `sync.retries`.
- The post claimed the module encapsulates HelmRepository, HelmChart, and HelmRelease resources. Updated this to refer to Flux source resources and HelmRelease resources, because the module creates HelmRepository or OCIRepository objects and a HelmRelease, with chart handling depending on the source type.
- The external values example used `valuesFrom` under `release`; changed it to the module's `helmValuesFrom` field.
- The dependency example placed `dependsOn` under `release`; moved it to the module's top-level `dependsOn` field.

## Review Notes
YAML snippets were parsed successfully after the corrections. The local environment did not have `timoni` or `flux` installed, so CLI and schema validation were performed against official Timoni documentation and the upstream flux-helm-release module source.
