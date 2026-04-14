# Validation Summary: How to Test Dapr Upgrades in Staging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (runtime, sidecar, control plane)
- Kubernetes (kubectl, namespaces, deployments, rollouts)
- Helm 3 (upgrade, rollback, history)
- Python (pytest, httpx)
- Bash scripting
- jq (JSON processing)

## Sources Consulted
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Helm upgrade/rollback documentation: https://helm.sh/docs/helm/helm_upgrade/ and https://helm.sh/docs/helm/helm_rollback/

## Issues Found
1. **Incorrect metadata API field name in `test_metadata_api`**: The test asserted `"runtimeMetadata" in metadata`, but the Dapr metadata API response does not contain a `runtimeMetadata` field. The correct top-level field is `runtimeVersion` (a string like `"1.14.0"`). Changed to `assert "runtimeVersion" in metadata`.

## Review Notes
- The `test_service_invocation` test includes a `dapr-app-id: caller-service` header when using the `/v1.0/invoke/<app-id>/method/<method>` URL. This header is unnecessary because the target app ID is already specified in the URL path. The header is silently ignored and does not cause a failure, but it could be confusing to readers since the `dapr-app-id` header is intended for Dapr's proxy-style invocation (where the URL does not include the invoke path). Consider removing it in a future revision.
- The upgrade script checks rollout status for `dapr-operator` and `dapr-sentry` but omits `dapr-sidecar-injector` and `dapr-placement`. For a more thorough validation, all four control plane deployments could be checked.
- The `--set global.tag` value in the Helm upgrade command matches the chart `--version`, which is typical for Dapr but worth noting: the chart version and image tag are independent values that happen to align for official releases.
