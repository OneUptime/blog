# Validation Summary: How to Migrate from Docker Compose to Dapr Multi-App Run

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr (Multi-App Run feature)
- Dapr CLI (`dapr run`, `dapr stop`)
- Docker Compose
- daprd sidecar process

## Sources Consulted
- Dapr Multi-App Run overview: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-overview/
- Dapr Multi-App Run template reference: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference (`dapr stop`): https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr self-hosted with Docker: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr v1.10 release notes (Multi-App Run introduction)

## Issues Found

1. **Incorrect version for Multi-App Run introduction (line 13)**
   - **Was:** "introduced in Dapr 1.12"
   - **Changed to:** "introduced in Dapr CLI v1.10"
   - **Why:** Multi-App Run was introduced as a preview feature in Dapr v1.10, not v1.12. Dapr v1.12 added Windows support and updated quickstarts but did not introduce the feature.

2. **Deprecated `--components-path` flag in Docker Compose daprd examples (lines 34, 51)**
   - **Was:** `--components-path /components`
   - **Changed to:** `--resources-path /components`
   - **Why:** The `--components-path` flag for daprd is deprecated in favor of `--resources-path`. Even though this appears in the "Before" Docker Compose example, readers may copy it. Using the current flag avoids deprecation warnings.

3. **Incorrect startup order claim in comparison table (line 155)**
   - **Was:** "Sequential by default"
   - **Changed to:** "Simultaneous"
   - **Why:** The official Dapr documentation states that Multi-App Run starts and stops applications "simultaneously." There is no sequential startup ordering mechanism in Multi-App Run.

## Review Notes
- The `dapr stop -f` command is noted in Dapr docs as an alpha feature currently available only on Linux and macOS. The blog post does not mention this limitation, which could surprise Windows users.
- The Docker Compose example uses `daprio/daprd:latest` as the image tag. Official Dapr docs typically show `daprio/daprd:edge` for development. Both are valid, though `latest` may not always point to the most recent build depending on the image registry's tagging convention.
- The `dapr.yaml` field names (`appID`, `appDirPath`, `appPort`, `daprHTTPPort`, `command`, `env`) and the `common` section fields (`resourcesPath`, `logLevel`) are all correct per the current multi-app run template specification.
- The `resourcesPath` (singular) under `common` is correct. Note that the per-app equivalent is `resourcesPaths` (plural), but this post only uses the field under `common` so no issue.
