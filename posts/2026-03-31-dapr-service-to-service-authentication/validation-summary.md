# Validation Summary: How to Implement Service-to-Service Authentication with Dapr

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Mutual TLS (mTLS)
- SPIFFE (Secure Production Identity Framework for Everyone)
- Dapr Sentry (Certificate Authority)
- Kubernetes
- Python / FastAPI
- X.509 certificates

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Configuration schema reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr access control list configuration: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr service invocation how-to: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- SPIFFE specification: https://spiffe.io/docs/latest/spiffe-about/overview/

## Issues Found

1. **SPIFFE identity format had incorrect `/app/` path segment** — The post listed the format as `spiffe://cluster.local/ns/{namespace}/app/{app-id}`. The correct Dapr SPIFFE ID format is `spiffe://<trustdomain>/ns/<namespace>/<appid>` with no `/app/` prefix before the app ID. Fixed to `spiffe://cluster.local/ns/{namespace}/{app-id}`.

2. **Unused `import ssl` in Python example** — The Python code imported the `ssl` module but never used it. Removed the unused import.

3. **Wrong service referenced for cert issuance logs** — The "Verifying mTLS Is Active" section directed readers to check `dapr-operator` logs for certificate issuance. Certificate issuance is handled by the Sentry service, not the operator. Changed `app=dapr-operator` to `app=dapr-sentry` and updated the comment.

4. **Inaccurate X-Forwarded-Client-Cert header comment** — The inline comment described the XFCC header format as `By=spiffe://...,Hash=...,Subject=...`, suggesting the SPIFFE URI is in the `By` field. In the standard XFCC format, the SPIFFE URI is in the `URI` field and fields are semicolon-separated. Updated the comment to `By=<proxy-URI>;Hash=<hash>;URI=spiffe://...`.

## Review Notes
- The X-Forwarded-Client-Cert header section describes reading SPIFFE identities from this header in application code. This is not well-documented in official Dapr sources. Dapr handles mTLS between sidecars, and the sidecar-to-app communication is over localhost. Whether the XFCC header is forwarded to the application depends on the Dapr version and configuration. Readers should verify this behavior in their specific Dapr deployment.
- The root certificate rotation section shows manual `kubectl delete secret` and restart approach. The Dapr CLI provides a safer method: `dapr mtls renew-certificate -k --valid-until <days> --restart`. The manual approach works but risks downtime if not done carefully.
- mTLS is enabled by default on Kubernetes Dapr deployments. The "Enabling mTLS" section is still valuable for showing how to customize `workloadCertTTL` and `allowedClockSkew`, but readers should know explicit enablement is not required for a default Kubernetes install.
- The access control policies configuration is correct. Readers may also want to know about the `operations` array for fine-grained per-method/verb control within policies.
