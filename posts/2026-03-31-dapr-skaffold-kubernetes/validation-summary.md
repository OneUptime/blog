# Validation Summary: How to Use Dapr with Skaffold for Kubernetes Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Skaffold (v4beta6 API)
- Dapr (sidecar annotations for Kubernetes)
- Kubernetes (Deployments, kubectl)
- Docker (BuildKit)
- Helm (Skaffold Helm deployer)

## Sources Consulted
- Skaffold YAML Reference: https://skaffold.dev/docs/references/yaml/
- Skaffold Helm Deployer docs: https://skaffold.dev/docs/deployers/helm/
- Skaffold Lifecycle Hooks docs: https://skaffold.dev/docs/pipeline-stages/lifecycle-hooks/
- Skaffold Port Forwarding docs: https://skaffold.dev/docs/pipeline-stages/port-forwarding/
- Skaffold File Sync docs: https://skaffold.dev/docs/filesync/
- Skaffold CLI Reference (skaffold run): https://skaffold.dev/docs/references/cli/#skaffold-run
- Dapr Kubernetes annotations: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-annotations/

## Issues Found

1. **Sync hooks incorrectly placed as build hooks (lines 138-141)**: The `hooks` block with a `container` type was placed as a sibling of `sync` at the artifact level, making it a build lifecycle hook. Build hooks only support host commands (`command`), not `container` hooks. Moved `hooks` inside the `sync` block so it becomes a sync hook, which correctly supports `container` type for running commands inside the container after file sync.

2. **Helm `setValues` used with Go template syntax (lines 168-169)**: The `setValues` field was used with `{{.IMAGE_TAG}}`, but `setValues` only accepts literal string values and does not expand Go templates. Changed `setValues` to `setValueTemplates` for the `image.tag` entry, which supports Go template expansion (e.g., referencing environment variables). Separated the static `dapr.enabled` value into its own `setValues` field with a properly quoted string value.

## Review Notes
- The Skaffold API version `skaffold/v4beta6` is valid but not the latest (v4beta13 is current as of this review). The post does not claim to use the latest, so this is acceptable.
- The `{{.IMAGE_TAG}}` template variable in the Helm section relies on an environment variable named `IMAGE_TAG` being set. This is a reasonable CI pattern but readers should be aware they need to export this variable. Skaffold also provides built-in artifact-specific variables like `{{.IMAGE_TAG_<artifact_name>}}` which could be used instead.
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`, `dapr.io/log-as-json`) are correct and current.
- All Skaffold CLI commands and flags (`skaffold dev`, `skaffold run`, `skaffold delete`, `--profile`, `--filename`, `--tag`, `--namespace`) are valid.
- The port forwarding `address: "0.0.0.0"` field is valid and correctly documented.
