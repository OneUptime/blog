# Validation Summary: How to Enable mTLS Between Dapr Sidecars

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, Sentry service)
- Kubernetes (deployments, annotations, secrets, kubectl)
- mTLS / TLS certificate management
- OpenSSL (certificate inspection)
- tcpdump / network debugging

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Sentry service overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr security concepts: https://docs.dapr.io/concepts/security-concept/

## Issues Found
1. **Sentry port incorrect in log output (line 74)**: The simulated log output showed `url=dapr-sentry.dapr-system.svc.cluster.local:443`, but the Dapr Sentry service runs its gRPC server on port 50001, not HTTPS port 443. Fixed to `url=dapr-sentry.dapr-system.svc.cluster.local:50001`.

## Review Notes
- The post states mTLS "Encrypts all sidecar-to-sidecar traffic (service invocation)" — the parenthetical "(service invocation)" is slightly narrow since Dapr mTLS covers all inter-sidecar gRPC communication, not only the service invocation building block. However, in practice service invocation is the primary sidecar-to-sidecar path (pub/sub goes through a broker), so the phrasing is defensible.
- All Dapr Configuration fields (`spec.mtls.enabled`, `spec.mtls.workloadCertTTL`, `spec.mtls.allowedClockSkew`) are correct with accurate default values (24h and 15m respectively).
- The Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/config`) are all correct.
- The trust bundle secret name (`dapr-trust-bundle`) and its keys (`issuer.crt`, `issuer.key`, `ca.crt`) are accurate.
- The `kubectl debug` command for tcpdump and port 50001 for gRPC traffic capture are appropriate.
