# Validation Summary: Configure Nocalhost for One-Click Kubernetes Development Environment Setup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nocalhost
- Nocalhost Server
- nhctl CLI
- Kubernetes
- Helm
- VS Code
- Node.js
- Python
- Go
- Istio / service mesh concepts

## Sources Consulted
- Nocalhost introduction: https://nocalhost.dev/docs/introduction/
- Nocalhost installation guide: https://nocalhost.dev/docs/installation/
- Nocalhost Server deployment guide: https://nocalhost.dev/docs/server/deploy-server/
- Nocalhost deployment config quick start: https://nocalhost.dev/docs/config/config-deployment-quickstart/
- Nocalhost config specs: https://nocalhost.dev/docs/reference/nh-config/
- Nocalhost dev container configuration: https://nocalhost.dev/docs/config/config-dev-container-en/
- Nocalhost enhance configuration: https://nocalhost.dev/docs/config/config-enhance/
- Nocalhost `nhctl install` CLI reference: https://nocalhost.dev/docs/cli/cli-install/
- Nocalhost `nhctl dev` CLI reference: https://nocalhost.dev/docs/cli/cli-dev/
- Nocalhost `nhctl profile` CLI reference: https://nocalhost.dev/docs/cli/cli-profile/
- Nocalhost VS Code remote debugging guide: https://nocalhost.dev/docs/guides/debug/vscode-debug/
- Nocalhost DevMode Mesh guide: https://nocalhost.dev/docs/guides/develop-service-dup-mesh/
- Nocalhost GitHub repository and release artifacts: https://github.com/nocalhost/nocalhost
- Air for Go official package documentation: https://pkg.go.dev/github.com/air-verse/air

## Issues Found
- Corrected the architecture description. Nocalhost does not require a server component for basic use; the server is optional and used for managing clusters, applications, users, and DevSpaces.
- Replaced the Helm repository URL with the official Nocalhost Helm repository URL and added `helm repo update`.
- Removed the explicit MariaDB persistence override from the default server install command. The official server install creates the MariaDB PVC by default and documents `mariadb.primary.persistence.enabled=false` only as the no-PVC option.
- Replaced the service URL lookup with the officially documented `kubectl port-forward service/nocalhost-web 8080:80` flow.
- Replaced the invalid pod wait selector with rollout checks for the Nocalhost API, web deployment, and MariaDB StatefulSet.
- Fixed the Nocalhost deploy config structure by moving `name`, `manifestType`, and `resourcePath` under `application`.
- Changed `manifestType: helm` to `manifestType: helmGit`, matching the documented application type values.
- Corrected `helmValues` from a values file entry to documented key/value overrides.
- Replaced the non-documented `https://nocalhost.dev/install.sh` CLI installer with a GitHub release download flow for `nhctl`.
- Fixed `nhctl install --config` usage. The flag expects a config name relative to `.nocalhost`, not `.nocalhost/config.yaml`.
- Replaced unsupported Nocalhost VS Code workspace settings with the documented Nocalhost `launch.json` debug configuration.
- Corrected `sidecarImage` from a list to a single image string and changed patch examples to documented patch string syntax.
- Removed the invalid `nhctl connect` command from the team-space script output.
- Updated the Go hot reload command from the old `github.com/cosmtrek/air` module path to the current `github.com/air-verse/air` module path.
- Replaced the unsupported `profiles` config and `nhctl dev start --profile` commands with documented `nhctl profile get` / `nhctl profile set` usage.

## Review Notes
Nocalhost's official documentation is still largely dated 2022, but the current public docs and repository remain the authoritative sources available. Some examples remain illustrative placeholders, such as `myorg/myapp`, Kubernetes user identity strings, and storage class names; these must be adapted to the target cluster and repository layout.
