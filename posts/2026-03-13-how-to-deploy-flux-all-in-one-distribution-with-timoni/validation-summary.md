# Validation Summary: How to Deploy Flux All-In-One Distribution with Timoni

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Flux CD
- Flux AIO distribution
- Timoni
- Kubernetes
- GitOps
- YAML configuration

## Sources Consulted
- Timoni Flux AIO Distribution documentation: https://timoni.sh/flux-aio/
- Flux AIO module README and configuration schema: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-aio/README.md
- Flux Git sync module README and configuration schema: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-git-sync/README.md
- Flux tenant module README and configuration schema: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-tenant/README.md
- Timoni apply CLI reference: https://timoni.sh/cmd/timoni_apply/
- Timoni mod pull CLI reference: https://timoni.sh/cmd/timoni_mod_pull/
- Timoni mod list CLI reference: https://timoni.sh/cmd/timoni_mod_list/
- Timoni mod show config CLI reference: https://timoni.sh/cmd/timoni_mod_show_config/
- Timoni status and delete CLI references: https://timoni.sh/cmd/timoni_status/ and https://timoni.sh/cmd/timoni_delete/
- Flux v2.8 announcement and supported Kubernetes versions: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/

## Issues Found
- The post used `timoni mod values`, which is not a current Timoni command. Replaced it with `timoni mod list` for available module versions and `timoni mod show config` after pulling the module locally.
- The prerequisites listed Kubernetes v1.28 and Timoni v0.20. Updated the Kubernetes requirement to be version-specific for the installed Flux AIO release, using Flux v2.8's supported Kubernetes versions as the current example, and removed the unsupported Timoni version requirement.
- The post described Flux AIO as installing all Flux components and used unsupported image automation controller keys. Corrected the description to Flux core components and replaced the image automation example with supported source-watcher configuration.
- Several values examples used unsupported Flux AIO fields such as `controllers.source: true`, `watchAllNamespaces`, `networkPolicy`, `controllerArgs`, and top-level per-controller `resources`. Reworked the examples to use supported `controllers.<name>.enabled`, `controllers.<name>.resources`, `persistence`, `reconcile`, `securityProfile`, and `podSecurityProfile` fields.
- The production section claimed high availability and monitoring settings that the shown Flux AIO values did not configure. Reworded it to describe supported production-oriented settings: restricted security, persistent cache storage, and reconciliation concurrency.
- The multi-tenant section used unsupported `multitenancy` and controller flag values. Replaced it with the supported `securityProfile: "restricted"` configuration and noted that tenant onboarding uses the companion `flux-tenant` and `flux-git-sync` modules.
- The upgrade example used `--version 2.4.0`, but Flux AIO versions include a distribution release suffix such as `2.8.0-0`. Updated the example to `2.8.0-0`.
- The initial sync example incorrectly placed Git sync under the Flux AIO module. Replaced it with the supported `flux-git-sync` module values and apply command.
- The conclusion still implied AIO covered image automation and the entire Flux installation spectrum. Reworded it to scope AIO to Flux core controllers and reference companion modules for Git sync and tenancy.

## Review Notes
Timoni and Flux CLIs were not installed in the local environment, so CLI behavior was verified against official command reference documentation instead of local `--help` output.
