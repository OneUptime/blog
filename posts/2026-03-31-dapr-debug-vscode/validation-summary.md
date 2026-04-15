# Validation Summary: How to Debug Dapr Applications in Visual Studio Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (CLI, sidecar, multi-app run, metadata API)
- Visual Studio Code (launch.json, compound configurations, debugger)
- Node.js debugging (launch and attach modes, `--inspect` flag)
- Python debugging (debugpy)
- Go debugging (delve via VS Code Go extension)
- Dapr VS Code Extension (ms-azuretools.vscode-dapr)

## Sources Consulted
- Dapr CLI `run` command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr multi-app run template reference: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr VS Code extension marketplace page: https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-dapr
- VS Code debugging documentation: https://code.visualstudio.com/docs/editor/debugging
- VS Code Node.js debugging documentation: https://code.visualstudio.com/docs/nodejs/nodejs-debugging
- VS Code Python debugging documentation: https://code.visualstudio.com/docs/python/debugging
- VS Code Go debugging wiki: https://github.com/golang/vscode-go/wiki/debugging
- Flask changelog (deprecation of FLASK_ENV): https://flask.palletsprojects.com/en/stable/changes/

## Issues Found
1. **`FLASK_ENV` deprecated/removed**: The Python launch.json example used `"FLASK_ENV": "development"`. `FLASK_ENV` was deprecated in Flask 2.2 (August 2022) and removed in Flask 2.3 (April 2023). Changed to `"FLASK_DEBUG": "1"`, which is the current replacement.
2. **Redundant `--inspect` in runtimeArgs**: The Approach 1 Node.js launch configuration included `"runtimeArgs": ["--inspect"]`. When using `"request": "launch"` with `"type": "node"`, VS Code's Node.js debugger automatically injects the necessary inspect flags. The explicit `--inspect` was redundant and could mislead readers into thinking it is required. Removed it.

## Review Notes
- The Dapr VS Code extension (`ms-azuretools.vscode-dapr`) is currently in Preview status (v0.8.0). Its feature set or availability may change.
- All Dapr CLI flags (`--app-id`, `--app-port`, `--dapr-http-port`, `--dapr-grpc-port`), the multi-app run YAML format, and the metadata API endpoint (`/v1.0/metadata` with `appConnectionProperties`) were verified as correct against current Dapr documentation.
- The compound launch configuration format (`configurations` array + `stopAll` boolean) is correct per VS Code documentation.
- The `debugpy` type for Python and `go` type with `mode: "debug"` for Go are both current and correct.
