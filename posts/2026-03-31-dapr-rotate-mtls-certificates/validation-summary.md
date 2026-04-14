# Validation Summary: How to Rotate Dapr mTLS Certificates Automatically

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (mTLS, Sentry service)
- Kubernetes (secrets, deployments, rollout management)
- OpenSSL (certificate generation)
- Bash scripting (monitoring script)

## Sources Consulted
- Dapr mTLS setup and configuration: https://docs.dapr.io/operations/security/mtls/
- Dapr security concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr Configuration spec reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr CLI mtls expiry reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-expiry/
- Dapr CLI mtls export reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-export/
- Dapr CLI mtls renew-certificate reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-renew-certificate/
- Dapr debugging docs: https://docs.dapr.io/developing-applications/debugging/debug-k8s/debug-dapr-services/
- Dapr source code (security constants): https://github.com/dapr/dapr/blob/master/pkg/security/consts/consts.go

## Issues Found

1. **`dapr mtls expiry -k` — incorrect flag**: The `-k` flag does not belong on the `expiry` subcommand. The `expiry` command is Kubernetes-only by default and has no `-k` flag. Fixed to `dapr mtls expiry`.

2. **`dapr mtls expiry --output json` — non-existent feature**: The `expiry` command does not support JSON output. The monitoring script was using `--output json` and parsing a `.issuers[0].expiry` JSON field that doesn't exist. Rewrote the monitoring script to parse the plain-text output using `grep` and `sed` instead.

3. **`dapr mtls export -k` — incorrect flag**: The `export` subcommand is Kubernetes-only and does not accept a `-k` flag. Fixed to `dapr mtls export -o ./old-certs`.

4. **`--ca-issuer-certificate` flag — wrong name**: The correct flag for `dapr mtls renew-certificate` is `--issuer-public-certificate`, not `--ca-issuer-certificate`. Fixed.

5. **`--ca-issuer-key` flag — wrong name**: The correct flag is `--issuer-private-key`, not `--ca-issuer-key`. Fixed.

6. **`--valid-until 8760h` — wrong format**: The `--valid-until` flag takes an integer number of days, not a duration string. Changed from `8760h` to `365`.

7. **Workload certificate file path `/var/run/secrets/dapr.io/tls/cert.pem` — incorrect**: Dapr workload certificates are obtained dynamically via gRPC from Sentry and held in memory, not mounted as files in the sidecar container. The verification command using `openssl x509 -in /var/run/secrets/dapr.io/tls/cert.pem` would not work. Replaced the verification step with `dapr mtls expiry` which is the documented way to verify certificate status.

## Review Notes
- The monitoring script uses `date -d` which is a GNU coreutils feature and will not work on macOS (which uses BSD date). This is acceptable since the script is intended to run on Linux servers/Kubernetes nodes, but readers on macOS would need to adapt it.
- The blog correctly separates the manual openssl certificate generation approach from the simpler `dapr mtls renew-certificate` CLI approach, giving readers both options.
