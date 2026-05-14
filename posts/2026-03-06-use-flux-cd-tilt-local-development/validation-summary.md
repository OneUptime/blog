# Validation Summary: How to Use Flux CD with Tilt for Local Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Tilt and Tiltfile APIs
- Kubernetes Deployments and Services
- kind local Kubernetes clusters
- Docker container builds
- Kustomize
- PostgreSQL and Redis development manifests

## Sources Consulted
- Tilt Install documentation: https://docs.tilt.dev/install.html
- Tilt Tiltfile API Reference: https://docs.tilt.dev/api.html
- Tilt Live Update Reference: https://docs.tilt.dev/live_update_reference.html
- Tilt CLI Reference for `tilt logs`: https://docs.tilt.dev/cli/tilt_logs.html
- Tilt CLI Reference for `tilt trigger`: https://docs.tilt.dev/cli/tilt_trigger.html
- Tilt local cluster and registry guidance: https://docs.tilt.dev/choosing_clusters.html
- Tilt registry configuration guidance: https://docs.tilt.dev/personal_registry.html
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- kind local registry documentation: https://kind.sigs.k8s.io/docs/user/local-registry/
- ctlptl project documentation for kind with registry: https://github.com/tilt-dev/ctlptl

## Issues Found
- The macOS Tilt install command used `brew install tilt-dev/tap/tilt`; the current official Tilt install documentation recommends `brew install tilt`. Updated the command.
- The frontend Live Update configured `run('npm install', trigger=['./apps/frontend/package.json'])`, but Tilt requires trigger files to also be included in a `sync` step for Live Update. Added a `sync()` step for `package.json`.
- The workflow said `kind create cluster --name dev` creates a kind cluster with a registry, but kind's official local registry setup requires additional registry configuration. Updated the comment and added a note that the local registry must be configured separately when using `default_registry('localhost:5000')`.
- The troubleshooting command `tilt logs --level=debug` used an unsupported log level. Tilt's `--level` option accepts `warn` or `error`; updated the example to `tilt logs --source=build` for build diagnostics.
- The troubleshooting command `tilt trigger --build frontend` used an unsupported `--build` flag. Tilt's documented `tilt trigger frontend` command forces a rebuild when no pending manual-trigger changes exist. Updated the command.

## Review Notes
The Flux Kustomization `apiVersion`, `patches`, `targetNamespace`, `sourceRef`, and pruning fields match current Flux documentation. Kubernetes Deployment and Service examples are syntactically valid. The `default_registry('localhost:5000')` example is valid only when a local registry is actually running and discoverable from the cluster; teams using ctlptl or kind's registry script should keep the registry port and Tiltfile setting aligned.
