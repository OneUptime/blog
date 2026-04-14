# Validation Summary: How to Use Dapr for Government Digital Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar model, building blocks)
- Kubernetes (namespace isolation, deployment)
- HashiCorp Vault (secret store)
- Dapr Python SDK (get_secret, publish_event)
- Dapr mTLS configuration
- Dapr pub/sub for audit logging
- Dapr access control policies
- Zipkin / OpenTelemetry tracing

## Sources Consulted
- Dapr HashiCorp Vault secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Configuration overview (mTLS and tracing spec): https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Python SDK client source (get_secret, publish_event): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK GetSecretResponse: https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/_response.py
- Dapr access control policies: https://docs.dapr.io/operations/configuration/invoke-allowlist/

## Issues Found
1. **Invalid Vault component metadata fields `tlsClientCert` and `tlsClientKey`**: The Dapr HashiCorp Vault secret store component does not support `tlsClientCert` or `tlsClientKey` metadata fields. The documented TLS-related fields are `caCert`, `caPath`, `caPem`, `skipVerify`, and `tlsServerName`. Replaced `tlsClientCert`/`tlsClientKey` with `caCert` (path to CA certificate for verifying the Vault server's TLS certificate) and `skipVerify: "false"` (explicitly disabling TLS skip, appropriate for a government security context). Token-based authentication via `vaultTokenMountPath` was already correctly configured and retained.

## Review Notes
- The audit logging example uses a hardcoded timestamp (`"2026-03-31T12:00:00Z"`). This is acceptable for illustration purposes but a production implementation would use dynamic timestamps. Not changed since this is clearly a simplified example.
- The Python SDK import style in the first code block (`import dapr.clients as dapr_client`) is unconventional but syntactically valid. The second code block uses the more idiomatic `from dapr.clients import DaprClient`.
- All access control policy field names (`accessControl`, `defaultAction`, `trustDomain`, `policies`, `appId`, `namespace`, `operations`, `name`, `httpVerb`, `action`) are correct per Dapr documentation.
- The mTLS Configuration resource fields (`mtls.enabled`, `mtls.workloadCertTTL`, `mtls.allowedClockSkew`) and tracing fields (`tracing.samplingRate`, `tracing.zipkin.endpointAddress`) are all correct.
