# Validation Summary: How to Use Dapr with RISC-V Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (runtime, sidecar, Helm chart)
- RISC-V (riscv64 architecture)
- Go cross-compilation (GOOS/GOARCH)
- Docker / Docker Buildx (multi-arch container builds)
- k3s (lightweight Kubernetes)
- Helm (Dapr deployment)

## Sources Consulted
- Dapr Helm chart values.yaml (https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml) — verified `global.registry` and `global.tag` are the correct keys for overriding all component images
- Dapr Helm chart README (https://github.com/dapr/dapr/blob/master/charts/dapr/README.md) — confirmed per-component image value structure
- Dapr runtime source: cmd/daprd/options/options.go (https://github.com/dapr/dapr/blob/master/cmd/daprd/options/options.go) — verified `--components-path` is deprecated in favor of `--resources-path`
- Dapr runtime source: cmd/daprd/ directory (https://github.com/dapr/dapr/tree/master/cmd/daprd) — confirmed directory structure for build target
- Docker Hub riscv64/ubuntu repository (https://hub.docker.com/r/riscv64/ubuntu) — confirmed `riscv64/ubuntu:22.04` is a valid, active image
- Go documentation on GOARCH=riscv64 support

## Issues Found

1. **Incorrect Helm chart values for image overrides (significant):** The post used per-component `--set dapr_operator.image.name=myrepo/dapr-operator --set dapr_operator.image.tag=riscv64 --set dapr_sidecar_injector.image.name=myrepo/daprd --set dapr_sidecar_injector.image.tag=riscv64`. This had multiple problems: (a) it only overrode 2 of 5+ required Dapr components, leaving placement, sentry, and scheduler pulling from the default registry where RISC-V images don't exist; (b) it conflated the sidecar injector service with the daprd sidecar image; (c) `image.tag` is not a per-component key — tags come from `global.tag`. **Fixed to:** `--set global.registry=myrepo --set global.tag=riscv64 --create-namespace`, which correctly overrides all component images at once.

2. **Deprecated `--components-path` flag (moderate):** The self-hosted mode example used `--components-path`, which is deprecated in current Dapr versions (marked deprecated in source with message "use --resources-path"). **Fixed to:** `--resources-path`.

3. **Go build target not idiomatic (minor):** The cross-compile command used `./cmd/daprd/main.go` (single file). While this works today since main.go is the only .go file in that directory, building the package `./cmd/daprd/` is more idiomatic and robust — it automatically includes any additional .go files added to the directory in the future. **Fixed to:** `./cmd/daprd/`.

## Review Notes
- The `riscv64/ubuntu:22.04` Docker image was verified as valid and actively maintained on Docker Hub (last pushed 2026-04-02). No change needed.
- The `state.in-memory` component type and `apiVersion: dapr.io/v1alpha1` are correct for current Dapr versions.
- The claim that Go, Python, and JavaScript SDKs run on riscv64 is broadly correct — Go compiles natively for riscv64, and Python/Node.js both have riscv64 support (though Node.js riscv64 may be experimental).
- The `file` command output showing "ELF 64-bit LSB executable, UCB RISC-V" is a reasonable representation of actual output.
- Users following this guide will need to cross-compile ALL Dapr components (daprd, operator, injector, placement, sentry, scheduler) and push them to their registry, not just daprd. The post could be clearer about this requirement but it is implied.
