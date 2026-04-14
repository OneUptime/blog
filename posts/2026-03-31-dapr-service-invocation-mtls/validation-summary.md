# Validation Summary: How to Use Dapr Service Invocation with mTLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry (certificate authority component)
- Mutual TLS (mTLS)
- SPIFFE/X.509 certificates
- Kubernetes
- Helm
- OpenSSL
- Dapr CLI
- daprd (Dapr sidecar runtime)

## Sources Consulted
- Dapr mTLS setup documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Sentry service overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr CLI `mtls` command reference: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr CLI `mtls expiry` command reference: https://docs.dapr.io/reference/cli/dapr-mtls/dapr-mtls-expiry/
- Dapr access control list configuration: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr sidecar overview: https://docs.dapr.io/concepts/dapr-services/sidecar/

## Issues Found

### 1. Incorrect Helm chart values for custom CA certificates
**What was wrong:** The Helm `--set-string` values used `dapr_sentry.trustAnchorsFile=ca.crt`, `dapr_sentry.issuerCertFile=issuer.crt`, and `dapr_sentry.issuerKeyFile=issuer.key`. These are not valid Dapr Helm chart values, and they pass file names instead of PEM content.
**What was changed:** Updated to the correct Helm values: `dapr_sentry.tls.root.certPEM="$(cat ca.crt)"`, `dapr_sentry.tls.issuer.certPEM="$(cat issuer.crt)"`, and `dapr_sentry.tls.issuer.keyPEM="$(cat issuer.key)"`. These use `$(cat ...)` to pass actual PEM content as Helm expects.
**Why:** The Dapr Helm chart expects PEM-encoded certificate content under the `dapr_sentry.tls.*` value hierarchy, not file path references.

### 2. Redundant manual Kubernetes secret creation removed
**What was wrong:** The post included a `kubectl create secret generic dapr-trust-bundle` step before the Helm install. When using `helm upgrade --install` with `--set-string` for PEM content, Helm automatically creates and manages the `dapr-trust-bundle` secret. Manually creating it first causes conflicts.
**What was changed:** Removed the manual `kubectl create secret` step. The Helm command now handles secret creation automatically.
**Why:** The two approaches (manual secret + Helm set-string) conflict. The Helm approach is the standard documented method and is self-contained.

### 3. Incorrect port in tcpdump example for verifying encrypted traffic
**What was wrong:** The tcpdump command captured traffic on port 3500, which is the Dapr HTTP API port used for app-to-sidecar communication, not sidecar-to-sidecar communication.
**What was changed:** Updated to port 50002, which is the default Dapr internal gRPC port used for sidecar-to-sidecar (inter-sidecar) communication where mTLS encryption is applied.
**Why:** Port 3500 is the HTTP API endpoint where apps call their local sidecar. The actual mTLS-encrypted inter-sidecar traffic flows over the internal gRPC port (default 50002).

## Review Notes
- The claim that sidecars renew certificates "30 minutes before expiry" could not be precisely verified against official documentation. The renewal mechanism exists but the exact timing threshold may vary by implementation. The general claim is reasonable but readers should consult their specific Dapr version's behavior.
- The `daprd` flags for self-hosted mode (`--trust-anchors-file`, `--cert-chain-file`, `--cert-key-file`) match one documented approach, but some Dapr versions also support environment variables (`DAPR_TRUST_ANCHORS`, `DAPR_CERT_CHAIN`, `DAPR_CERT_KEY`) as an alternative. Both approaches are valid.
- The openssl commands for generating CA and issuer certificates are syntactically correct and follow standard practices.
- The Configuration CRD examples (disabling mTLS, mTLS config with `workloadCertTTL` and `allowedClockSkew`, access control policies) are all structurally correct per the Dapr Configuration spec.
- The mermaid sequence diagram accurately represents the certificate issuance and mTLS handshake flow.
