# Validation Summary: How to Install Timoni CLI for Flux Module Management

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Timoni CLI
- Flux
- Kubernetes
- CUE
- OCI registries
- Homebrew
- Scoop
- Shell completion

## Sources Consulted
- Timoni Installation Guide: https://timoni.sh/install/
- Timoni CLI reference: https://timoni.sh/cmd/timoni/
- Timoni `apply` command reference: https://timoni.sh/cmd/timoni_apply/
- Timoni `build` command reference: https://timoni.sh/cmd/timoni_build/
- Timoni `mod pull` command reference: https://timoni.sh/cmd/timoni_mod_pull/
- Timoni `registry login` command reference: https://timoni.sh/cmd/timoni_registry_login/
- Timoni Flux AIO Distribution docs: https://timoni.sh/flux-aio/
- Timoni GitOps with Flux docs: https://timoni.sh/gitops-flux/
- GitHub releases for `stefanprodan/timoni`: https://github.com/stefanprodan/timoni/releases
- `flux-git-sync` module README and CUE schema in `stefanprodan/flux-aio`: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-git-sync

## Issues Found
- The Linux download URLs used non-existent unversioned release asset names. Updated them to resolve the latest tag and download the versioned tarball names used by Timoni releases.
- The specific-version install command also used an incorrect release asset name. Updated it to `timoni_${TIMONI_VERSION}_linux_amd64.tar.gz`.
- The Windows Scoop example referenced a removed custom Scoop bucket. Updated it to the currently documented `scoop install timoni`.
- The expected `timoni --help` command list was outdated and included top-level `pull` and `push` commands that are not present. Updated the command list to match current Timoni CLI output.
- The post used `timoni mod values`, which is not a current Timoni command. Replaced it with inspecting the pulled module README configuration section.
- The sample `flux-git-sync` values used `git.ref.branch` and string duration fields that do not match the module's current schema. Updated the values file to use `git.ref: "refs/heads/main"`, integer minute intervals, and `sync.targetNamespace`.
- The registry authentication section suggested unsupported `TIMONI_REGISTRY_USERNAME` and `TIMONI_REGISTRY_PASSWORD` environment variables. Replaced it with the supported per-command `--creds` pattern.

## Review Notes
The corrected `timoni build` example was tested locally with Timoni v0.26.0 and generated Flux `GitRepository` and `Kustomization` manifests successfully. Applying the module was not tested against a live Kubernetes cluster.
