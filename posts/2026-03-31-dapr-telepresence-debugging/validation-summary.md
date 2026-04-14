# Validation Summary: How to Use Dapr with Telepresence for Remote Debugging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (CLI and HTTP API)
- Telepresence v2
- Kubernetes
- Node.js debugging (V8 inspector)
- VS Code launch configuration
- Redis (as Dapr state store)

## Sources Consulted
- Telepresence official documentation — https://telepresence.io/docs/install/client (client installation)
- Telepresence CLI reference — https://telepresence.io/docs/reference/cli/telepresence_intercept (intercept command and flags)
- Telepresence environment variables — https://telepresence.io/docs/2.21/reference/environment (env-file format)
- Telepresence Traffic Manager install — https://telepresence.io/docs/install/manager
- Dapr CLI reference — https://docs.dapr.io/reference/cli/dapr-run/ (dapr run flags)
- Dapr service invocation API — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr pub/sub API — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Redis state store component — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr name resolution (mDNS) — https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-mdns/
- VS Code Node.js debugging — https://code.visualstudio.com/docs/nodejs/nodejs-debugging

## Issues Found

1. **Outdated Telepresence Linux install URL**: The URL `https://app.getambassador.io/download/tel2/linux/amd64/latest/telepresence` is outdated. Changed to `https://github.com/telepresenceio/telepresence/releases/latest/download/telepresence-linux-amd64`, which is the current recommended download location per official docs.

2. **Environment variables not exported to child processes**: `source .env.cluster` sets shell variables but does not export them. Telepresence writes env files in `KEY=VALUE` format without `export` prefix (Docker-style). The `dapr run` child process would not inherit these variables. Changed to `set -a; source .env.cluster; set +a` which auto-exports all sourced variables.

3. **Deprecated `--components-path` flag**: The Dapr CLI flag `--components-path` is deprecated in favor of `--resources-path`. Updated both `dapr run` commands to use the current flag.

4. **Incorrect VS Code debug configuration for local process**: The launch.json included `localRoot: "${workspaceFolder}"` and `remoteRoot: "/app"`, which are used for path mapping when debugging a remote/containerized process. Since the node process runs locally (not in a container), these properties are unnecessary and the `remoteRoot: "/app"` would cause incorrect source map path translation. Removed both properties.

5. **Missing `--resources-path` in debug `dapr run` command**: The second `dapr run` command (in the "Attaching a Debugger" section) was missing the `--resources-path ./components/cluster` flag, which is needed to load cluster-pointing Dapr components. Added the flag to match the first command.

6. **Misleading comment in testing section**: The comment "This goes through the Dapr sidecar in the cluster to your local service" was incorrect. The `curl` command at `localhost:3500` hits the local Dapr sidecar, not the cluster one. Updated comments to accurately describe the traffic flow.

## Review Notes
- The `--inspect=0.0.0.0:9229` Node.js flag binds the debugger to all network interfaces. For local-only debugging, `--inspect=9229` (which binds to 127.0.0.1) would be more secure. This is not incorrect but could be tightened in a future revision.
- The Telepresence macOS Homebrew tap (`datawire/blackbird/telepresence`) is still valid but the project has been migrating install instructions toward GitHub releases. Worth monitoring for future changes.
- The Dapr component YAML uses `apiVersion: dapr.io/v1alpha1` which is current. If Dapr introduces a v2alpha1 or v1 stable API version in the future, this may need updating.
- The testing section demonstrates local Dapr sidecar invocations. To fully test the Telepresence intercept (cluster traffic redirected to local), one would invoke the service from another pod in the cluster. This is implicit from context but could be made more explicit in a future update.
