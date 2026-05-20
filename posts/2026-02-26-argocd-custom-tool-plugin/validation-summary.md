# Validation Summary: How to Build a Custom Tool Plugin for ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Config Management Plugins
- Kubernetes manifests
- CUE
- ytt
- Dhall
- Docker
- Python

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD releases: https://github.com/argoproj/argo-cd/releases
- CUE export command reference: https://cuelang.org/docs/reference/command/cue-help-export/
- CUE YAML encoding documentation: https://cuelang.org/docs/howto/encode-json-yaml-with-cue/
- CUE encoding/yaml package reference: https://pkg.go.dev/cuelang.org/go/pkg/encoding/yaml
- CUE mod tidy command reference: https://cuelang.org/docs/reference/command/cue-help-mod-tidy/
- Carvel ytt input documentation: https://carvel.dev/ytt/docs/v0.49.x/inputs/
- Dhall JSON/YAML generation documentation: https://docs.dhall-lang.org/tutorials/Getting-started_Generate-JSON-or-YAML.html

## Issues Found
- The Argo CD plugin name examples used `cue-manifests` even though the `ConfigManagementPlugin` set `spec.version: v1.0`. Argo CD requires the Application plugin name to be `<metadata.name>-<spec.version>` when a version is specified, so the examples now use `cue-manifests-v1.0`.
- The CUE generation command used `--out yaml` with `yaml.MarshalStream`, which would emit the YAML stream as an encoded YAML string rather than raw manifests. The command now uses `--out text` so the marshaled YAML stream is written directly to stdout.
- The sample CUE code referenced `service` without defining it. A Service definition was added so the sample can evaluate as shown.
- The Dockerfile used older base image tags and copied `argocd-cmp-server` from Argo CD `v2.10.0`. It now uses current base-image examples and copies from Argo CD `v3.4.1`, with a note to match the deployed Argo CD cluster version.
- The Argo CD environment variable example read `ENVIRONMENT` and `REPLICA_COUNT` directly. Argo CD prefixes user-supplied plugin environment variables with `ARGOCD_ENV_`, so the generate command now reads `ARGOCD_ENV_ENVIRONMENT` and `ARGOCD_ENV_REPLICA_COUNT` and quotes the injected values.
- The ytt discovery example used `glob: "**/#ytt"`, which looks for a file named `#ytt` rather than detecting ytt annotations. It now uses a discovery command that searches YAML files for ytt annotation lines beginning with `#@`.
- The local testing commands used the same incorrect CUE YAML output mode as the plugin. They now use `cue export --out text --expression objects --force`.
- The error-handling snippet checked only for `main.cue` or `cue.mod/module.cue`, which would reject the sample repository containing `deployment.cue` and `service.cue`. It now checks for CUE files outside `cue.mod`.
- The error-handling snippet used `set -euo pipefail` under `sh`; `pipefail` is not portable across `/bin/sh` implementations. It now uses `set -eu` and avoids relying on shell pipe failure semantics for the generation step.

## Review Notes
The Dockerfile pins an Argo CD image tag only as an example source for `argocd-cmp-server`; production plugins should copy the CMP server from the same Argo CD version deployed in the cluster. The `preserveFileMode: true` setting is technically valid but should be used only for trusted repositories because Argo CD documents the executable-file-mode risk.
