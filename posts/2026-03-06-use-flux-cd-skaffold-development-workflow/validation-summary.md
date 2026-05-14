# Validation Summary: How to Use Flux CD with Skaffold for Development Workflow

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skaffold
- Flux CD
- Kubernetes
- Kustomize
- Docker
- GitHub Actions
- GitOps workflows

## Sources Consulted
- Skaffold installation documentation: https://skaffold.dev/docs/install/
- Skaffold Kustomize renderer documentation: https://skaffold.dev/docs/renderers/kustomize/
- Skaffold CLI reference: https://skaffold.dev/docs/references/cli/
- Skaffold file sync documentation: https://skaffold.dev/docs/filesync/
- Skaffold debug workflow documentation: https://skaffold.dev/docs/workflows/debug/
- Skaffold port forwarding documentation: https://skaffold.dev/docs/port-forwarding/
- Skaffold v2.19.0 CLI schema output for `skaffold/v4beta14`
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize project site: https://kustomize.io/

## Issues Found
- The Skaffold examples used `apiVersion: skaffold/v4beta11`, which is older than the current schema supported by the latest Skaffold release. Updated the examples to `skaffold/v4beta14` and validated them with the Skaffold v2.19.0 CLI schema.
- The Skaffold Kustomize examples used `deploy.kustomize.paths`. Current Skaffold v4 configuration uses `manifests.kustomize.paths` for Kustomize rendering, with `deploy.kubectl` handling the apply step. Updated the single-service, render profile, and multi-service examples.
- The post used Kustomize rendering but did not list the standalone Kustomize CLI as a prerequisite. Added it to the prerequisites and added a Kustomize install step to the GitHub Actions example because Skaffold calls the Kustomize CLI for this renderer.
- The development and production overlays set `namespace` but did not include Namespace manifests. Added `namespace.yaml` files to the project structure and overlay resources so the examples can create the `development` and `production` namespaces when applied.
- The Flux Kustomization example set `wait: true` and also listed `healthChecks`. Flux ignores `healthChecks` when `wait` is enabled, so the explicit health check block was removed.

## Review Notes
- Skaffold `debug` port descriptions, file sync configuration, port forwarding flags, and `skaffold build --file-output` / `skaffold render --build-artifacts` flags were checked against official Skaffold documentation and the current CLI.
- The Flux `Kustomization` API version, `path`, `prune`, `sourceRef`, `wait`, and `timeout` fields are valid for `kustomize.toolkit.fluxcd.io/v1`.
