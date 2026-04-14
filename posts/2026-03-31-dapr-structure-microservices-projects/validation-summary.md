# Validation Summary: How to Structure Dapr Microservices Projects

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, components, resiliency, pub/sub subscriptions)
- Docker / Docker Compose
- Kubernetes (kubectl, Helm)
- Node.js / Go (test commands)
- Redis (state store component)
- Make (build automation)

## Sources Consulted
- Dapr Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr CLI components command reference: https://docs.dapr.io/reference/cli/dapr-components/
- Dapr daprd arguments and annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Resiliency spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Multi-App Run template: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr self-hosted initialization: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Docker Compose legacy versions: https://docs.docker.com/reference/compose-file/legacy-versions/
- Docker Hub daprio/daprd: https://hub.docker.com/r/daprio/daprd

## Issues Found

1. **Resiliency misclassified as Configuration CRD**: `resiliency.yaml` was listed under `config/` with a comment saying "Dapr Configuration CRDs". Resiliency in Dapr is a separate CRD (`kind: Resiliency`), not part of the Configuration CRD. Moved `resiliency.yaml` into its own `resiliency/` directory with an accurate comment.

2. **`dapr.yaml` mislabeled as "Local self-hosted Dapr config"**: In Dapr, `dapr.yaml` is the Multi-App Run template file (used with `dapr run -f`), not a self-hosted configuration file. The self-hosted config is `config.yaml` at `$HOME/.dapr/config.yaml`. Updated both occurrences of the comment to say "Multi-App Run template".

3. **daprd flags used single-dash format**: The docker-compose example used `-app-id`, `-app-port`, and `-components-path` (single dash). The official daprd CLI uses double-dash flags (`--app-id`, `--app-port`). Changed all flags to double-dash format.

4. **`--components-path` is deprecated**: The `--components-path` flag has been deprecated in favor of `--resources-path`. Replaced with the current flag name.

5. **`dapr components validate` command does not exist**: The Makefile included `dapr components validate ./dapr/components/production/`, but no such CLI command exists in Dapr. Replaced with `kubectl apply --dry-run=client -f ./dapr/components/production/` which performs server-side YAML validation against the Kubernetes API.

6. **Docker Compose `version: "3.9"` is deprecated**: The `version` field in docker-compose.yml is deprecated in Docker Compose V2 and is ignored. Removed the `version: "3.9"` line.

7. **`.PHONY` targets mismatched**: The `.PHONY` line listed `deploy` but the actual target was `deploy-staging`. Updated to list the correct targets: `dev test deploy-staging lint-components`.

## Review Notes
- The `daprio/daprd:1.13.0` image is valid but dated (released March 2024). Future readers may want to update to a newer Dapr runtime version.
- The Component YAML examples are correct and follow the official Dapr component schema.
- The overall project structure advice is sound and aligns with Dapr community best practices.
