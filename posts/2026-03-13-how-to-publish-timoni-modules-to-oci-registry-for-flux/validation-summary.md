# Validation Summary: How to Publish Timoni Modules to OCI Registry for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Timoni CLI
- Timoni modules
- OCI registries and OCI artifacts
- GitHub Container Registry
- Docker Hub
- AWS ECR
- Azure Container Registry
- GitHub Actions
- GitLab CI
- ORAS CLI
- Flux OCI artifacts
- Kubernetes registry credentials

## Sources Consulted
- Timoni module publishing documentation: https://timoni.sh/cue/module/publishing/
- Timoni `mod push` CLI reference: https://timoni.sh/cmd/timoni_mod_push/
- Timoni `mod pull` CLI reference: https://timoni.sh/cmd/timoni_mod_pull/
- Timoni `mod list` CLI reference: https://timoni.sh/cmd/timoni_mod_list/
- Timoni `mod show config` CLI reference: https://timoni.sh/cmd/timoni_mod_show_config/
- Timoni `build` CLI reference: https://timoni.sh/cmd/timoni_build/
- Timoni `apply` CLI reference: https://timoni.sh/cmd/timoni_apply/
- Timoni `registry login` CLI reference: https://timoni.sh/cmd/timoni_registry_login/
- Timoni GitOps with Flux guide: https://timoni.sh/gitops-flux/
- Flux OCI artifacts documentation: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux OCIRepository authentication documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- ORAS `repo tags` documentation: https://oras.land/docs/commands/oras_repo_tags/

## Issues Found
- `timoni mod push --source` is no longer a current flag. Replaced it with the OCI source annotation `--annotation "org.opencontainers.image.source=..."`, which is the supported way to override source metadata.
- The post suggested publishing a module with `--version latest`, but Timoni requires strict SemVer module versions and uses the separate `--latest` flag to tag the current stable version as `latest`. Updated the example to use `--version 1.0.0 --latest=true`.
- The GitHub Actions workflow used the removed `--source` flag. Updated it to use an OCI source annotation.
- The GitLab CI `timoni mod push` command was split across YAML list entries without a block scalar or shell continuations, which would not run as one command. Converted it to a block scalar with backslash continuations.
- The GitLab CI `rules:if` expression was left as an unquoted plain scalar. Quoted it to match GitLab CI examples and avoid YAML parsing ambiguity.
- The private registry access section created a Kubernetes image pull secret but then showed direct `timoni apply` CLI consumption. Timoni CLI uses local registry credentials or `--creds`, so the example now uses `timoni registry login` for Timoni consumers.
- `timoni mod values` is not a current Timoni command. Replaced it with pulling the module and running `timoni mod show config` against the local module to generate/update configuration documentation.
- The description implied direct consumption across Flux-managed clusters. Adjusted the wording to avoid implying Flux directly reconciles Timoni module packages; official Timoni Flux guidance uses Timoni to render manifests and Flux to consume rendered OCI artifacts.
- The introduction described OCI registry storage as inherently immutable. Adjusted the wording because tag immutability depends on registry configuration; Timoni recommends avoiding overwrites, but immutability is not guaranteed by default.

## Review Notes
Timoni modules are valid OCI artifacts, but Flux's documented OCI workflow reconciles rendered Kubernetes manifests from Flux OCI artifacts. For a future Flux-focused article, add a separate rendering step with `timoni build` piped into `flux push artifact`, plus an `OCIRepository` and `Kustomization` example.
