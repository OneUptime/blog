# Validation Summary: How to Monitor Dapr Certificate Expiration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, Sentry service)
- Kubernetes (secrets, kubectl, CronJobs)
- OpenSSL (certificate inspection and generation)
- Prometheus (metrics and alerting rules)

## Sources Consulted
- Dapr official docs — Setup & configure mTLS certificates: https://docs.dapr.io/operations/security/mtls/
- Dapr official docs — Security concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr official docs — Sentry service overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr official docs — dapr mtls renew-certificate CLI reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-renew-certificate/
- Dapr GitHub source — pkg/security/consts/consts.go (trust bundle secret name, control plane cert paths)
- Dapr GitHub source — pkg/sentry/monitoring/metrics.go (Prometheus metric definitions)
- Dapr GitHub source — pkg/injector/patcher/sidecar_container.go (sidecar trust anchor injection via env var)

## Issues Found

1. **Workload certificate monitoring command used incorrect file path**: The original command used `kubectl exec` to read `/var/run/secrets/dapr.io/tls/tls.crt` inside the daprd sidecar container. This path is only mounted in Dapr control plane pods (sentry, operator, injector, placement), not in application sidecar containers. In Kubernetes mode, the daprd sidecar receives trust anchors via the `DAPR_TRUST_ANCHORS` environment variable, and workload certificates are obtained from Sentry via gRPC and held in memory — they are never written to disk. Replaced with commands to check Sentry pod availability and `dapr mtls expiry` CLI command.

2. **CA rotation procedure was incomplete and potentially destructive**: The original rotation section only generated a new CA cert/key and updated `ca.crt` in the `dapr-trust-bundle` secret. This secret contains three keys: `ca.crt`, `issuer.crt`, and `issuer.key`. Using `kubectl create secret generic --from-file=ca.crt=... --dry-run=client -o yaml | kubectl apply -f -` with only `ca.crt` would replace the entire secret, removing the issuer cert and key that Sentry needs to sign workload certificates. Fixed by adding issuer cert/key generation, including all three files in the secret update, and adding a rolling restart step for application sidecars.

## Review Notes
- The Dapr CLI command `dapr mtls renew-certificate` provides a simpler and safer alternative to the manual rotation procedure shown. It handles generating all required certificates and can restart the control plane automatically with the `--restart` flag. A future revision could mention this as the preferred approach.
- The Prometheus metric `dapr_sentry_issuercert_expiry_timestamp` and alert rules are correct. The metric is defined in Dapr's sentry monitoring package and exported with the `dapr_` prefix via OpenCensus-to-Prometheus.
- The shell script correctly handles both GNU date (`-d` flag) and BSD date (`-j -f` flags) for cross-platform compatibility.
- The 24-hour default workload certificate TTL and the description of auto-rotation behavior are accurate per the official Dapr configuration reference.
