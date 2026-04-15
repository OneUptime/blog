# Validation Summary: How to Bring Your Own CA Certificate for Dapr Sentry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Sentry service, mTLS, sidecars)
- Kubernetes (Secrets, Helm, kubectl)
- step-cli (Smallstep CLI for certificate management)
- OpenSSL (certificate and key generation)
- PKI (Certificate Authority, certificate chains)

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Sentry documentation: https://docs.dapr.io/operations/security/sentry/
- Dapr Helm chart values (dapr_sentry subchart and root chart): https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Smallstep step-cli reference for `step certificate create`: https://smallstep.com/docs/step-cli/reference/certificate/create/
- Helm CLI documentation for `helm install` and `helm upgrade`: https://helm.sh/docs/helm/helm_install/ and https://helm.sh/docs/helm/helm_upgrade/

## Issues Found

1. **Incorrect Helm values path for `allowedClockSkew` and `workloadCertTTL`**: The post placed these settings under `dapr_sentry.config.allowedClockSkew` and `dapr_sentry.config.workloadCertTTL`. In the Dapr Helm chart, these values belong under `global.mtls.allowedClockSkew` and `global.mtls.workloadCertTTL`. Fixed by moving them to the correct `global.mtls` path in the YAML snippet.

2. **Invalid `--reuse-values` flag on `helm install`**: The post used `helm install dapr dapr/dapr ... --reuse-values`. The `--reuse-values` flag is only valid for `helm upgrade`, not `helm install`. Fixed by changing the command to `helm upgrade --install dapr dapr/dapr ... --reuse-values`, which supports both install and upgrade scenarios and accepts the `--reuse-values` flag.

## Review Notes
- The `step certificate create` command uses `--no-password --insecure` which is fine for demonstration purposes but should not be used for production CA keys. The post could benefit from a note about this, but it is not technically incorrect.
- The verification command using `openssl s_client -connect localhost:50001` assumes the daprd sidecar container has openssl installed, which may not be the case with all Dapr sidecar images. This is a practical caveat but not a technical error in the post.
- The secret name `dapr-trust-bundle`, secret keys (`ca.crt`, `issuer.crt`, `issuer.key`), Sentry pod label (`app=dapr-sentry`), and default gRPC port (50001) were all verified as correct.
