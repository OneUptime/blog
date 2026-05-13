# Validation Summary: How to Configure Timoni Module Values for Flux Sync

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Timoni
- Flux
- Kubernetes
- CUE
- YAML
- GitOps

## Sources Consulted
- Timoni apply CLI reference: https://timoni.sh/cmd/timoni_apply/
- Timoni build CLI reference: https://timoni.sh/cmd/timoni_build/
- Timoni mod pull CLI reference: https://timoni.sh/cmd/timoni_mod_pull/
- Timoni mod show config CLI reference: https://timoni.sh/cmd/timoni_mod_show_config/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- flux-aio `flux-git-sync` module schema: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-git-sync

## Issues Found
- The post used `timoni mod values` to inspect the module schema, but current Timoni documents `timoni mod show config` for displaying a local module's `#Config`. Updated the command to pull the module with `timoni mod pull --output` and then run `timoni mod show config`.
- The schema example used `#Values`, `git.branch`, string duration values, and an HTTPS-or-SSH URL regex. Updated it to match the current `flux-git-sync` `#Config` schema, including `git.ref`, integer minute values, required `git.url`, and the module's HTTPS URL constraint.
- The YAML and CUE values examples used unsupported fields for this module: `git.branch`, `git.secretRef`, `sync.interval`, `sync.postBuild`, nested `sync.dependsOn`, and string durations such as `"10m"`. Replaced them with supported fields such as `git.ref`, `git.token`, top-level `substitute`, top-level `substituteFrom`, top-level `dependsOn`, and integer minute values.
- The health check example used `sync.healthChecks`, which Flux supports on Kustomization resources but the `flux-git-sync` Timoni module does not expose directly. Reworked that section to configure readiness behavior through `wait`, `timeout`, and `retryInterval`.
- The values reference and example validation error used outdated field names and constraints. Updated the reference to match the module schema.

## Review Notes
The post is technically relevant and remains a valid tutorial after correction. Timoni was not installed in the local workspace, so CLI behavior was verified against official Timoni CLI documentation and the upstream module source rather than local `--help` output.
