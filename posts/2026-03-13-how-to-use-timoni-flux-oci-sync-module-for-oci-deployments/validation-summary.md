# Validation Summary: How to Use Timoni flux-oci-sync Module for OCI Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Timoni
- Flux CD
- Kubernetes
- OCIRepository
- Kustomization
- OCI registries
- CUE

## Sources Consulted
- Timoni `flux-oci-sync` module README: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-oci-sync/README.md
- Timoni `flux-oci-sync` module schema: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-oci-sync/templates/config.cue
- Timoni `flux-oci-sync` OCIRepository template: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-oci-sync/templates/ocirepository.cue
- Timoni `flux-oci-sync` Kustomization template: https://github.com/stefanprodan/flux-aio/blob/main/modules/flux-oci-sync/templates/kustomization.cue
- Timoni CLI `build` documentation: https://timoni.sh/cmd/timoni_build/
- Timoni CLI `apply` documentation: https://timoni.sh/cmd/timoni_apply/
- Timoni CLI `status` documentation: https://timoni.sh/cmd/timoni_status/
- Timoni CLI `mod pull` documentation: https://timoni.sh/cmd/timoni_mod_pull/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get sources oci` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_oci/

## Issues Found
- The post used `timoni mod values`, which is not a current documented Timoni command. Replaced it with `timoni mod pull` and directed readers to inspect the pulled module README and CUE schema.
- The values examples used `values.oci`, but the module schema uses `values.artifact` for OCI artifact settings and `values.auth` for authentication. Updated all examples accordingly.
- The examples used duration strings for module fields such as `artifact.interval` and `sync.timeout`, but the module schema expects integer minute values. Updated these examples to use integers.
- The basic example included `sync.interval`, which is not a module value. Removed it and updated the generated Kustomization output to match the module's fixed `60m` reconcile interval with default retry interval and timeout.
- The private registry example used an external `secretRef` and `kubectl create secret docker-registry`, but the module accepts `auth.credentials` and generates a pull secret referenced by the OCIRepository. Updated the example and explanation.
- The cloud provider example placed `provider` under OCI settings, but the module expects it under `auth.provider`. Updated the example.
- The version pinning section claimed digest support, but the module supports tag and semver range selection. Updated the wording.
- The substitution example placed `postBuild` under `sync`, but the module accepts top-level `substitute` and `substituteFrom` fields and renders them into Flux `spec.postBuild`. Updated the example.
- The health checks wording implied configurable Flux health check entries, but the module example only used readiness waiting with `wait` and `timeout`. Updated the section title and text.

## Review Notes
The module currently renders Flux `source.toolkit.fluxcd.io/v1` OCIRepository and `kustomize.toolkit.fluxcd.io/v1` Kustomization resources, which are current Flux API versions. Timoni and Flux CLIs were not installed in the local environment, so CLI behavior was verified against official command documentation and module source rather than by executing the examples.
