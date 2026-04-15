# Validation Summary: How to Debug Dapr Pods on Kubernetes

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar architecture, annotations, metadata API, dashboard CLI)
- Kubernetes (kubectl logs, exec, port-forward, JSON patch)
- curl / jq for API inspection

## Sources Consulted
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr health API: https://docs.dapr.io/reference/api/health_api/
- Dapr metadata API: https://docs.dapr.io/reference/api/metadata_api/
- Dapr state API: https://docs.dapr.io/reference/api/state_api/
- Dapr sidecar concepts: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Dapr dashboard CLI reference: https://docs.dapr.io/reference/cli/dapr-dashboard/
- Dapr Helm chart templates (GitHub): https://github.com/dapr/dapr/tree/master/charts/dapr
- Kubernetes JSON Patch / RFC 6901 (JSON Pointer `~1` encoding)

## Issues Found

1. **Exec into daprd container would fail** — The post originally instructed readers to run `kubectl exec -it $POD -c daprd -- /bin/sh` and use `wget` and `nslookup` inside the sidecar container. The `daprd` container uses a distroless base image (`gcr.io/distroless/static`) which contains no shell and no networking utilities. Fixed by changing the section to exec into the application container instead and noting the distroless limitation.

2. **Non-existent Dapr service in DNS lookup example** — The original `nslookup dapr-api.dapr-system.svc.cluster.local` references a service that does not exist in the Dapr control plane. The actual Dapr services are `dapr-operator`, `dapr-sentry`, `dapr-placement-server`, `dapr-sidecar-injector`, and `dapr-dashboard`. Fixed by changing to `dapr-sentry.dapr-system.svc.cluster.local`.

3. **Replaced Redis connectivity check with sidecar health check** — The original `wget -O- http://redis-master:6379` is misleading because Redis uses a binary protocol, not HTTP. Replaced with a more useful example: checking sidecar health via `wget -O- http://localhost:3500/v1.0/healthz`.

## Review Notes
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`, `dapr.io/log-as-json`, `dapr.io/enable-api-logging`) are verified correct.
- The sidecar HTTP API endpoints (`/v1.0/healthz`, `/v1.0/metadata`, `/v1.0/state/<store>/<key>`) are all correct with proper field names (`components`, `subscriptions`) in the metadata response.
- The `daprd` sidecar container name, default HTTP port 3500, control plane labels (`app=dapr-operator`, `app=dapr-sentry`), and `dapr-system` namespace are all accurate.
- The `dapr dashboard -k -p 9999` command with flags is correct (`-k` for Kubernetes mode, `-p` for port).
- The JSON Pointer `~1` encoding for `/` in the kubectl patch path is correct per RFC 6901.
