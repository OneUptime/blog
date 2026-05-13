# Validation Summary: How to Create Custom Timoni Modules for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Timoni
- CUE
- Flux
- Kubernetes custom resources
- GitOps

## Sources Consulted
- Timoni module specification: https://timoni.sh/module/
- Timoni module initialization guide: https://timoni.sh/cue/module/initialization/
- Timoni custom resources guide: https://timoni.sh/cue/module/custom-resources/
- Timoni `mod init` CLI reference: https://timoni.sh/cmd/timoni_mod_init/
- Timoni `build` CLI reference: https://timoni.sh/cmd/timoni_build/
- Timoni `mod vet` CLI reference: https://timoni.sh/cmd/timoni_mod_vet/
- Timoni `mod vendor crd` CLI reference: https://timoni.sh/cmd/timoni_mod_vendor_crd/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- CUE strings package documentation: https://pkg.go.dev/cuelang.org/go/pkg/strings

## Issues Found
- The Flux CRD schemas were imported in the CUE templates, but the post did not vendor the Flux CRDs first. Added `timoni mod vendor crd -f https://github.com/fluxcd/flux2/releases/latest/download/install.yaml` and updated the generated module tree to include `cue.mod/gen`.
- The generated module structure omitted files and directories created by current Timoni modules, including `timoni.ignore`, `LICENSE`, and `cue.mod/gen`. Updated the structure.
- Several CUE fields were unintentionally required, including `sync.dependsOn`, `healthChecks`, and `commonLabels`. Added safe defaults so the supplied test values can build.
- `postBuild.substitute` and `postBuild.substituteFrom` were required whenever `postBuild` was set, but Flux treats both as optional fields. Marked both optional and added the supported `optional` field for `substituteFrom` entries.
- The Flux resource templates used hidden `_config` fields across package boundaries and did not define `apiVersion` or `kind` explicitly. Reworked them to use the local `#config` pattern from Timoni examples and added explicit Flux API versions and kinds.
- The Timoni entry point exported top-level `objects`, but current Timoni modules should expose resources through `timoni.apply`. Added a `templates.#Instance` definition and updated `timoni.cue` to build `timoni.apply.app` from the instance objects.
- The local build command used an instance name that did not match the sample app name. Updated it to `timoni build my-service`.
- The validation step used a standalone `cue vet` test that would not validate generated Kubernetes resources the way Timoni expects. Replaced it with `timoni mod vet` using the same values file.

## Review Notes
Could not execute `timoni` or `cue` locally because neither CLI is installed in the workspace environment. The corrections were validated against official Timoni, Flux, and CUE documentation.
