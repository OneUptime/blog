# Validation Summary: How to Configure Dapr Sentry Service for Certificate Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry service (certificate authority)
- mTLS (mutual TLS)
- Kubernetes (kubectl, Helm)
- X.509 certificates
- OpenSSL

## Sources Consulted
- Dapr security concepts documentation (https://docs.dapr.io/concepts/security-concept/)
- Dapr mTLS configuration reference (https://docs.dapr.io/operations/security/mtls/)
- Dapr Configuration schema reference (https://docs.dapr.io/reference/resource-specs/configuration-schema/)
- Dapr Helm chart values.yaml (https://github.com/dapr/dapr/tree/master/charts/dapr)
- Dapr Sentry Helm template (dapr_sentry_deployment.yaml)
- Dapr sidecar annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr source code: pkg/security/consts/consts.go for trust bundle constant names

## Issues Found

1. **Incorrect Helm values path for certificate configuration**: The post used `dapr_sentry.config.workloadCertTTL` and `dapr_sentry.config.allowedClockSkew`, but these settings live under `global.mtls` in the Dapr Helm chart. Fixed to `global.mtls.workloadCertTTL` and `global.mtls.allowedClockSkew` in both the YAML snippet and the `helm upgrade` command.

2. **Wrong Configuration resource name**: The Dapr Configuration resource was named `default`, but the canonical name for the Dapr control plane Configuration is `daprsystem`. Fixed `name: default` to `name: daprsystem`.

3. **Wrong secret key for viewing CA certificate**: The command used `issuer.crt` to view the CA certificate, but `issuer.crt` is the issuer certificate, not the root CA. The trust bundle secret contains `ca.crt` for the root CA certificate. Fixed the jsonpath to use `ca.crt`.

4. **Misleading kubectl annotate command for debug logging**: The post used `kubectl annotate pod <pod-name> dapr.io/log-level=debug`, which is ineffective because Dapr sidecar annotations are read at pod creation time by the sidecar injector, not at runtime. Replaced with guidance to set the annotation in the deployment pod template and restart/redeploy the pod.

5. **Unnecessary Sentry replicaCount in HA configuration**: The post set `dapr_sentry.replicaCount=3` alongside `global.ha.enabled=true`, but when HA mode is enabled, the replica count is controlled by `global.ha.replicaCount` (which defaults to 3), not by `dapr_sentry.replicaCount`. Simplified the command to just `--set global.ha.enabled=true`.

## Review Notes
- The trust bundle exists as both a Secret (`dapr-trust-bundle`) and a ConfigMap (`dapr-trust-bundle`). The Secret contains `issuer.crt`, `issuer.key`, and `ca.crt`, while the ConfigMap contains only `ca.crt`. The post's commands to check both are valid.
- The default values (24h workload cert TTL, 15m allowed clock skew) are confirmed correct per official documentation.
- When `global.ha.enabled=true` is set, all Dapr control plane services (including Sentry, Operator, and Placement) run with the HA replica count (default 3), not just Sentry.
