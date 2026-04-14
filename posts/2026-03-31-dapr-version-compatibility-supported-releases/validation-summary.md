# Validation Summary: How to Check Dapr Version Compatibility and Supported Releases

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (runtime, CLI, SDKs, dashboard, sidecar)
- Kubernetes
- Python (httpx library)
- JavaScript/npm
- Go
- .NET

## Sources Consulted
- Dapr release support policy: https://docs.dapr.io/operations/support/support-release-policy/
- Dapr metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr CLI reference (dapr upgrade, dapr status): https://docs.dapr.io/reference/cli/
- Dapr SDK compatibility: https://docs.dapr.io/developing-applications/sdks/
- Dapr Kubernetes upgrade guide: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- kubectl version command documentation: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **Incorrect metadata API response field path (line 68)**: The code used `response.json().get("runtimeMetadata", {}).get("runtimeVersion")` to extract the runtime version from the Dapr metadata API. The `/v1.0/metadata` endpoint returns `runtimeVersion` as a top-level field, not nested under `runtimeMetadata`. Fixed to `response.json().get("runtimeVersion")`.

2. **Deprecated kubectl flag (line 78)**: The command `kubectl version --short` used the `--short` flag which was deprecated in kubectl v1.28 and removed in v1.30+. Modern kubectl versions output a concise format by default. Fixed to `kubectl version`.

3. **Incorrect Dapr CLI command for Kubernetes runtime version (line 93)**: The command `dapr version -k` is not a valid way to check the Dapr runtime version in Kubernetes. The `-k` flag is not supported by `dapr version`. The correct command is `dapr status -k`, which lists all Dapr control plane services and their versions. Fixed accordingly.

## Review Notes
- The N-2 support policy description is accurate and clearly explained.
- All kubectl jsonpath expressions for extracting container images are syntactically correct.
- The SDK package names (`dapr` for Python, `@dapr/dapr` for JS, `dapr/go-sdk` for Go, `Dapr` for .NET) are all correct.
- The upgrade path advice (single minor version increments only) is correct per Dapr documentation.
- The `dapr upgrade --runtime-version X.Y.Z -k` command syntax is correct.
- Referenced documentation URLs follow the correct Dapr docs URL structure.
