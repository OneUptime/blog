# Validation Summary: How to Test mTLS Configuration Correctness

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Mutual TLS (mTLS)
- Kubernetes
- Envoy sidecars
- Prometheus metrics
- `istioctl`
- `kubectl`
- Bash and curl

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `istioctl describe` diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The Prometheus examples used `connection_security_policy` without filtering on `reporter="destination"`. Istio documents that this label is reliably populated as `mutual_tls` on destination-side telemetry, while source-side telemetry may report `unknown`. Updated the single-service and mesh-wide queries to filter on destination-side telemetry.
- The `istioctl x authz check` section said it showed both authorization and authentication policies. The command is for AuthorizationPolicy checks, so the text now directs readers to `istioctl x describe` for mTLS and PeerAuthentication status.
- The workload certificate extraction used `.dynamicActiveSecrets[0]`, which may select the wrong secret depending on ordering. Updated the `jq` expression to select the `default` secret, matching Istio troubleshooting examples.
- The automated script checked for `RESULT="056"` even though `curl -w "%{http_code}"` reports failed HTTP transactions as `000`; curl exit code 56 appears as a process exit status or kubectl stderr, not as the `http_code` value. Updated the script to check for `000`.
- The port-level mTLS section omitted an important Istio constraint: `portLevelMtls` keys refer to workload/container ports and only apply when the port is bound by a Service. Added a short clarification.

## Review Notes
The examples assume Istio sidecar mode. In ambient mode, validation uses ztunnel/HBONE-specific commands and metrics, so a future update could add ambient-specific equivalents if the post intends to cover both deployment modes.
