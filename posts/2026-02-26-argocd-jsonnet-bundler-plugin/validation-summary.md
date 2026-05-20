# Validation Summary: How to Use Jsonnet Bundler Plugin with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Config Management Plugins
- Jsonnet
- go-jsonnet
- jsonnet-bundler
- Kubernetes Application manifests
- Docker
- Git credentials for private dependencies

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Jsonnet Getting Started documentation, YAML stream output: https://jsonnet.org/learning/getting_started.html
- Jsonnet Tutorial, external variables and top-level arguments: https://jsonnet.org/learning/tutorial.html
- go-jsonnet README: https://github.com/google/go-jsonnet
- jsonnet-bundler README: https://github.com/jsonnet-bundler/jsonnet-bundler

## Issues Found
- Argo CD prefixes Application-supplied plugin environment variables with `ARGOCD_ENV_` before plugin commands receive them. Updated the plugin script to read `ARGOCD_ENV_JSONNET_MAIN`, `ARGOCD_ENV_JSONNET_JPATH`, `ARGOCD_ENV_JSONNET_EXT_STR_VARS`, and `ARGOCD_ENV_JSONNET_TLA_STR_VARS`, while keeping fallback support for direct sidecar environment variables.
- The Application example referenced a versioned Config Management Plugin as `jsonnet-bundler`, but Argo CD requires `<metadata.name>-<spec.version>` when `spec.version` is set and the plugin name is specified explicitly. Updated it to `jsonnet-bundler-v1.0`.
- The Jsonnet examples returned objects while the plugin invokes `jsonnet -y`. Jsonnet's YAML stream mode expects the top-level value to be an array. Updated the examples to return arrays for YAML stream output.
- The plugin snippets used `set -euo pipefail` with `sh`. Updated the CMP commands to use `bash`, matching the container image's installed shell and avoiding shell compatibility problems.
- The Dockerfile used `golang:1.21-alpine` with `go-jsonnet@latest`, while the current go-jsonnet README states Go 1.24+ is required. Updated the builder image to `golang:1.24-alpine`.
- The private Git dependency example used a `GIT_ASKPASS` script that returned a full credentials file for every prompt. Replaced it with a username/password prompt-aware script backed by Kubernetes Secret environment variables.

## Review Notes
- The Argo CD image version in the Dockerfile remains pinned to `v2.10.0`; the CMP sidecar pattern is still valid, but future updates should test against the Argo CD version deployed in production.
- The plugin builds command arguments with shell word splitting. This is acceptable for the simple comma- and colon-separated examples shown, but values containing spaces or shell metacharacters should be handled more defensively in production.
