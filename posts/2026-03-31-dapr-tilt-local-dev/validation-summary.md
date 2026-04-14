# Validation Summary: How to Use Dapr with Tilt for Local Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Tilt (local Kubernetes development tool)
- Dapr (Distributed Application Runtime)
- Kubernetes (container orchestration)
- Docker (container builds)
- Redis (used as Dapr state store component)
- Node.js (application runtime in examples)

## Sources Consulted
- Tilt API Reference: https://docs.tilt.dev/api.html
- Tilt `local_resource` docs: https://docs.tilt.dev/local_resource.html
- Tilt Live Update Reference: https://docs.tilt.dev/live_update_reference.html
- Tilt CLI docs (`tilt up`, `tilt logs`, `tilt trigger`): https://docs.tilt.dev/cli/tilt_up.html
- Tilt install docs: https://docs.tilt.dev/install.html
- Tilt `restart_process` extension: https://github.com/tilt-dev/tilt-extensions/tree/master/restart_process
- Dapr CLI `init` reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI `status` reference: https://docs.dapr.io/reference/cli/dapr-status/
- Dapr Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found

### 1. `k8s_yaml()` called with a directory path
- **What was wrong:** `k8s_yaml('k8s/components/')` was passed a directory path. The `k8s_yaml` function accepts file paths or Blob objects, not directory paths.
- **What was changed:** Replaced with `k8s_yaml(listdir('k8s/components/'))` which uses Tilt's `listdir()` function to enumerate files in the directory.
- **Why:** Per the Tilt API reference, `k8s_yaml` accepts `Union[str, List[str], Blob]` where strings are file paths. The `listdir()` function is the documented way to load all manifests from a directory.

### 2. `restart_container()` used in Kubernetes context (two occurrences)
- **What was wrong:** `restart_container()` was used as a `live_update` step in both the Basic Tiltfile and Multi-Service Tiltfile examples. The Tilt API documentation states that `restart_container()` is "For use with Docker Compose resources only" and does not work with Kubernetes resources.
- **What was changed:** Replaced `docker_build` with `docker_build_with_restart` from the `restart_process` Tilt extension (`load('ext://restart_process', 'docker_build_with_restart')`). Removed `restart_container()` from the `live_update` steps and added an `entrypoint` parameter as required by the extension.
- **Why:** The `restart_process` extension is the officially recommended way to restart processes in Kubernetes containers after a live update sync. It wraps the container entrypoint to enable process restart without a full container restart.

## Review Notes
- The `brew install tilt-dev/tap/tilt` command works but the canonical installation command per Tilt's official install page is `brew install tilt`. Both are valid since `tilt-dev/tap/tilt` is the underlying tap. Not changed as both work correctly.
- The `entrypoint` values (`['node', 'src/index.js']`) added in the fix are illustrative defaults for the Node.js examples shown. Users will need to adjust the entrypoint to match their actual application entry point.
- All Dapr CLI commands (`dapr init --kubernetes --wait`, `dapr status -k`, `dapr init -k`), annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`), and the Redis state store component spec were verified as correct.
- All Tilt CLI commands (`tilt up`, `tilt logs`, `tilt trigger`) and the dashboard URL (`localhost:10350`) were verified as correct.
