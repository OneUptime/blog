# Validation Summary: How to Debug Dapr Applications with Remote Debugging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, service invocation)
- Go (Delve debugger, debug build flags)
- Node.js (built-in inspector protocol)
- Python (debugpy remote debugging)
- Docker (debug Dockerfiles)
- Kubernetes (kubectl port-forward)
- VS Code (launch.json debug configurations)

## Sources Consulted
- VS Code Go extension debugging docs: https://github.com/golang/vscode-go/blob/master/docs/debugging.md
- Delve documentation: https://github.com/go-delve/delve/tree/master/Documentation
- VS Code Python Debugger (debugpy) extension docs: https://github.com/microsoft/debugpy
- Node.js inspector documentation: https://nodejs.org/en/docs/guides/debugging-getting-started
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- kubectl port-forward documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found

### 1. Go VS Code launch.json used deprecated `remotePath` (fixed)
**What was wrong:** The Go debug configuration used `"remotePath": "/app"`, which is deprecated and not supported by the `dlv-dap` debug adapter (the default in the VS Code Go extension since v0.30.0). With `dlv-dap`, `remotePath` is silently ignored, which would cause breakpoints to not resolve correctly.

**What was changed:** Replaced `remotePath` with `substitutePath` array format (`[{ "from": "${workspaceFolder}", "to": "/app" }]`) and added `"debugAdapter": "dlv-dap"` to explicitly use the modern adapter. The `mode: "remote"` still defaults to the legacy adapter unless `dlv-dap` is explicitly specified.

**Why:** Without this fix, users following the tutorial with a current VS Code Go extension would find that breakpoints don't hit because path mapping is not applied.

### 2. Python VS Code launch.json used deprecated `"type": "python"` (fixed)
**What was wrong:** The Python debug configuration used `"type": "python"`, which is deprecated. The Python debugging functionality was separated into the standalone `ms-python.debugpy` extension, which uses `"type": "debugpy"`.

**What was changed:** Updated `"type": "python"` to `"type": "debugpy"`.

**Why:** While `"type": "python"` may still work as a compatibility shim, it generates deprecation warnings and may be removed in future VS Code Python extension versions.

## Review Notes
- The `dapr run ... -- docker run` pattern shown in the Go section is architecturally unusual. In practice, running a Docker container as the Dapr app process means the sidecar runs on the host while the app runs in a container, which creates networking challenges (the app cannot reach the sidecar via localhost). For production-like debugging, Docker Compose with Dapr sidecars as separate containers or Kubernetes is more practical. The pattern works for demonstrating the concept but readers should be aware of this limitation.
- The Delve headless command (`dlv --listen=:2345 --headless=true --api-version=2 --accept-multiclient exec ./server`) is compatible with both the legacy and dlv-dap adapters in VS Code. The `--api-version=2` flag is technically redundant in modern Delve (v2 is the default) but does no harm.
- The Node.js configuration is correct and uses current, non-deprecated settings. The `--inspect=0.0.0.0:9229` flag correctly binds to all interfaces for container use, and the VS Code `node` attach configuration is standard.
- All `kubectl port-forward` commands use correct syntax.
- Go compiler flags `-gcflags="all=-N -l"` are correct for disabling optimizations and inlining to preserve debug symbols.
