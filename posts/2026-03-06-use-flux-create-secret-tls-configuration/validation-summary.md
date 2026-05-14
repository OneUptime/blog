# Validation Summary: How to Use flux create secret tls for TLS Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux source-controller GitRepository, HelmRepository, and OCIRepository resources
- Flux notification-controller Provider TLS configuration
- Kubernetes Secrets
- TLS, mTLS, and X.509 certificates
- OpenSSL
- cert-manager
- SOPS

## Sources Consulted
- Flux CLI documentation for `flux create secret tls`: https://fluxcd.io/flux/cmd/flux_create_secret_tls/
- Flux CLI documentation for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux notification-controller Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- OpenSSL command documentation: https://docs.openssl.org/3.5/man1/

## Issues Found
- The post used older `flux create secret tls` flags (`--cert-file`, `--key-file`, and `--ca-file`). Updated all examples to the current Flux CLI flags (`--tls-crt-file`, `--tls-key-file`, and `--ca-crt-file`) and changed the prerequisite to Flux CLI v2.6 or later, where these flags are documented.
- The GitRepository example used `.spec.certSecretRef`, which is not a current GitRepository field. Updated the example to use `.spec.secretRef` for the TLS secret and clarified that Git credentials and TLS data must be placed in the same `secretRef` secret when authentication is also required.
- The "Combining TLS with Other Secrets" section described separate Git auth and TLS secrets with `certSecretRef`. Reworked it to use one `flux create secret git` command with `--ca-crt-file`, matching the current GitRepository API.
- The Notification Controller section described webhook receivers using a server certificate/key secret. Updated it to refer to notification providers calling HTTPS endpoints with self-signed certificates and to create a CA-only TLS secret.
- The verification examples use `jq`, but it was missing from prerequisites. Added `jq` to the prerequisites.
- The private-key matching example mixed a non-portable `md5` command with OpenSSL output. Updated it to use `openssl md5` consistently.
- The best-practices section recommended separating CA and client certificates even when a Flux resource only has one secret reference. Updated it to recommend separation only where the Flux API supports it.

## Review Notes
The HelmRepository and OCIRepository `certSecretRef` examples are valid for current Flux source-controller APIs. The cert-manager Certificate example is syntactically valid; in a real deployment, issuer availability and policy controls still need to match the target cluster.
