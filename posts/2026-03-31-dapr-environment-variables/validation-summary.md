# Validation Summary: How to Configure Dapr Environment Variables

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, daprd)
- Kubernetes (annotations, ConfigMaps, Secrets, Deployments)
- Helm (Dapr Helm chart)
- Python (application code example)

## Sources Consulted
- Dapr Environment Variable Reference: https://docs.dapr.io/reference/environment/
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Injector Constants (source code): https://github.com/dapr/dapr/blob/master/pkg/injector/consts/consts.go
- Dapr Sidecar Patcher (source code): https://github.com/dapr/dapr/blob/master/pkg/injector/patcher/sidecar_patcher.go
- Dapr Sidecar Container (source code): https://github.com/dapr/dapr/blob/master/pkg/injector/patcher/sidecar_container.go
- Dapr Helm Chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr Logs Troubleshooting: https://docs.dapr.io/operations/troubleshooting/logs-troubleshooting/

## Issues Found

1. **`APP_ID` incorrectly listed as auto-injected on Kubernetes**: The original post claimed `APP_ID` is automatically set by the Dapr operator when injecting the sidecar. In reality, the Kubernetes sidecar injector only injects `DAPR_HTTP_PORT` and `DAPR_GRPC_PORT` into application containers. `APP_ID` is only set by `dapr run` in self-hosted mode. Fixed by restructuring the environment variable table to distinguish between Kubernetes-injected and self-hosted variables.

2. **`NAMESPACE` injection target was wrong**: The post implied `NAMESPACE` is injected into application containers. It is actually injected into the sidecar (daprd) container, not the application container. Fixed by moving it to a separate table for sidecar container variables.

3. **Wrong annotation name `dapr.io/sidecar-env`**: The annotation for injecting custom environment variables into the sidecar is `dapr.io/env`, not `dapr.io/sidecar-env`. The comma-separated `KEY=VALUE` format shown was correct. Fixed the annotation name.

4. **Non-existent `global.logLevel` Helm setting**: The Dapr Helm chart does not have a `global.logLevel` value. Log levels are configured per-component (e.g., `dapr_operator.logLevel`, `dapr_placement.logLevel`, `dapr_sidecar_injector.logLevel`). Fixed the Helm command to show per-component settings.

5. **Summary paragraph corrections**: Updated to accurately state which variables are injected where, and corrected the annotation name reference from `dapr.io/sidecar-env` to `dapr.io/env`.

6. **Python code example referenced `APP_ID`**: Removed the `APP_ID` usage from the Python example since it is not available in Kubernetes-injected app containers, which is the primary context of the post.

## Review Notes
- The `kubectl exec` command to inspect sidecar environment (`-c daprd`) is correct but will only show variables in the sidecar container. To inspect variables injected into the application container (like `DAPR_HTTP_PORT`), the user would need to target their app container name instead (e.g., `-c myapp`).
- The ConfigMap example hardcodes `DAPR_HTTP_PORT: "3500"` which is redundant since Dapr already injects this variable into application containers on Kubernetes. This is not incorrect but could be misleading.
