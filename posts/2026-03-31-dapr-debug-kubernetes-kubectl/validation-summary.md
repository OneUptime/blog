# Validation Summary: How to Debug Dapr Applications on Kubernetes with kubectl

## Status
validated

## Post Type
Tutorial / Debugging Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- kubectl CLI
- Dapr CLI
- Dapr HTTP API (healthz, metadata, service invocation)

## Sources Consulted
- Dapr CLI Reference: https://docs.dapr.io/reference/cli/
- Dapr CLI `dapr logs` command: https://docs.dapr.io/reference/cli/dapr-logs/
- Dapr Health API: https://docs.dapr.io/reference/api/health_api/
- Dapr Metadata API: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Kubernetes deployment: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart source (dapr/dapr GitHub repository) for placement service labels

## Issues Found
1. **Incorrect label selector for Dapr placement service** (line 79): The command `kubectl logs -n dapr-system -l app=dapr-placement` used an incorrect label. The Dapr placement service StatefulSet and its pods use the label `app: dapr-placement-server` (not `app: dapr-placement`), as defined in the Dapr Helm chart (`dapr_placement_statefulset.yaml`). Changed to `kubectl logs -n dapr-system -l app=dapr-placement-server`.

## Review Notes
- The `dapr logs -k` command is valid but is Kubernetes-only. The `-k` flag defaults to `true` for this command, so it is technically optional but acceptable to include explicitly.
- The `kubectl get components` and `kubectl describe component` commands work because Kubernetes resolves the singular/plural forms to the `components.dapr.io` CRD. In clusters with other operators that register similarly-named resources, using the fully qualified form `components.dapr.io` would be safer.
- The post does not mention `dapr-sidecar-injector` as a system service to check. In Dapr versions prior to 1.14, this was a separate service; in 1.14+ it was merged into the operator. Since the post doesn't specify a Dapr version, this is acceptable.
- All Dapr HTTP API endpoints (`/v1.0/healthz`, `/v1.0/metadata`, `/v1.0/invoke/{appId}/method/{method}`) and the default port 3500 are correct.
