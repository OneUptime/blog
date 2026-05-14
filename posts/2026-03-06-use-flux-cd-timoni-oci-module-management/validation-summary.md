# Validation Summary: How to Use Flux CD with Timoni for OCI Module Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Timoni
- OCI artifacts and registries
- Kubernetes
- GitOps
- CUE
- GitHub Actions
- Cosign

## Sources Consulted
- Timoni Module Specification: https://timoni.sh/module/
- Timoni Get Started with Modules: https://timoni.sh/cue/module/initialization/
- Timoni Bundle documentation: https://timoni.sh/bundle/
- Timoni GitOps with Flux guide: https://timoni.sh/gitops-flux/
- Timoni CLI reference for `mod init`, `mod push`, `mod pull`, `mod vendor`, `bundle build`, `build`, and `registry login`: https://timoni.sh/cmd/timoni_mod_init/, https://timoni.sh/cmd/timoni_mod_push/, https://timoni.sh/cmd/timoni_mod_pull/, https://timoni.sh/cmd/timoni_mod_vendor/, https://timoni.sh/cmd/timoni_bundle_build/, https://timoni.sh/cmd/timoni_build/, https://timoni.sh/cmd/timoni_registry_login/
- Timoni GitHub Actions documentation: https://timoni.sh/github-actions/
- Timoni installation documentation: https://timoni.sh/install/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source-controller API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux `push artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `reconcile source oci` CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- CUE string length constraint documentation: https://cuelang.org/docs/howto/constrain-the-length-of-a-string/

## Issues Found
- The post implied that Flux can consume and render Timoni module OCI artifacts directly. Official Timoni documentation states that Timoni is currently used with Flux as a templating engine, and Flux should reconcile generated Kubernetes manifests. Updated the introduction, architecture diagram, Flux OCIRepository section, Kustomization, Cosign example, and CI flow to use generated manifest OCI artifacts.
- The manifest generation section used `timoni mod vendor` with module URL, version, and output flags to generate Kubernetes manifests. `timoni mod vendor` is for vendoring CUE schemas, not rendering modules. Replaced this with `timoni bundle build` and `timoni build`, which print Kubernetes resources to stdout.
- The `timoni bundle build --output` usage was incorrect; the command does not provide an `--output` directory flag. Changed the examples to redirect stdout into generated YAML files.
- The Flux Kustomization originally referenced a `GitRepository` source while the surrounding section described OCI consumption. Changed it to reference the `OCIRepository`, and set `path: ./` because the OCI artifact contains the pushed manifest directory contents at its root.
- The CI workflow used `flux push artifact` after edits but did not install the Flux CLI. Added a Flux CLI install step using the official installation script.
- The Flux artifact publishing examples used an incomplete revision value. Updated `--revision` to the documented `<branch|tag>@sha1:<commit-sha>` format.
- The CI workflow now passes registry credentials to `flux push artifact`, matching Flux CLI authentication options for private OCI registries.
- The Kubernetes prerequisite specified v1.25 or later, which is not generally correct for current Flux releases. Reworded it to require a Kubernetes cluster compatible with the installed Flux version.
- The Cosign verification example signed the Timoni module artifact while the Flux verification resource now consumes generated manifests. Updated it to sign the generated manifest OCI artifact.
- The best-practice item said to use `timoni mod vendor` to cache modules locally. Official Timoni docs describe `mod vendor` as schema vendoring and note that Timoni has a local cache. Updated the guidance accordingly.

## Review Notes
The post remains a high-level tutorial. The CUE module snippets are illustrative and assume the surrounding Timoni `config.cue` and `timoni.cue` entrypoint wire the shown values into the templates.
