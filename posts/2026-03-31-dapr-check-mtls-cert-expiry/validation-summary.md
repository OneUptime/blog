# Validation Summary: How to Check mTLS Certificate Expiry in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (mTLS, Sentry service)
- Kubernetes (kubectl, Secrets, CronJobs)
- OpenSSL (certificate inspection)
- Prometheus (alerting rules)

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr CLI mtls command reference: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Sentry metrics documentation
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Incorrect Dapr CLI command (`dapr mtls check -k`)**: The `check` subcommand does not exist. The correct command to check certificate expiry is `dapr mtls expiry`. Updated the command and its expected output format to match the actual CLI behavior.

2. **Incorrect workload certificate file path**: The post claimed workload certs are available at `/var/run/secrets/dapr.io/tls/tls.crt`. In reality, workload certificates are held in sidecar memory (obtained via gRPC from Sentry) and are not written to disk. Only trust anchors (root CA) are mounted at `/var/run/secrets/dapr.io/tls/ca.crt`. Rewrote the section to show how to check the mounted trust anchors and sidecar logs instead.

3. **Incorrect metadata API claim**: The post suggested that `GET /v1.0/metadata` returns certificate information in the `extended` field. The metadata API returns runtime configuration, component metadata, and app connectivity info — not certificate data. Removed this incorrect command.

4. **Summary referenced wrong CLI command**: The summary section mentioned `dapr mtls check` which was corrected to `dapr mtls expiry`.

## Review Notes
- The kubectl commands for checking root CA and issuer cert expiry from the `dapr-trust-bundle` secret are correct — the secret keys `ca.crt` and `issuer.crt` are accurate.
- The Prometheus metric `dapr_sentry_issuercert_expiry_timestamp` is correct.
- The shell script and CronJob use `date -d` which is Linux-specific (GNU coreutils). This is noted in the post as "(Linux)" which is appropriate, but macOS users would need `date -j -f` instead. Not changed since the post already notes this.
- The certificate default TTLs (24h workload, 1 year root/issuer) and auto-renewal behavior are accurate.
- The Prometheus alerting rule syntax and logic are correct.
