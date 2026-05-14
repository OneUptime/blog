# Validation Summary: How to Configure GitRepository with Custom CA Certificates in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller
- Flux GitRepository custom resources
- Kubernetes Secrets
- TLS and CA certificate bundles
- OpenSSL certificate inspection and verification
- SSH known_hosts

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI documentation for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI documentation for `flux create secret git`: https://v2-0.docs.fluxcd.io/flux/cmd/flux_create_secret_git/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.4/man1/openssl-s_client/
- OpenSSL `verify` documentation: https://docs.openssl.org/3.1/man1/openssl-verify/

## Issues Found
- The post stated that the CA key must be named `caFile` exactly and that `ca.crt` would not work. Flux documentation says GitRepository secrets can use `ca.crt` or `caFile`, and `ca.crt` takes precedence. Updated examples and troubleshooting to use `ca.crt` and mention `caFile` as supported.
- The OpenSSL example claimed to download the CA certificate from the server, but piping the first certificate from `openssl s_client -showcerts` into `openssl x509` usually extracts the leaf server certificate, not the issuing CA. Updated the commands to save the presented chain for inspection, use the leaf extraction only for self-signed certificates, and recommend the organization's PKI source for CA material.
- The certificate-chain section said certificate order matters for the CA bundle. For Flux's CA data, the key correctness issue is including the required CA certificates under the documented key. Replaced the order claim with the documented `ca.crt` / `caFile` precedence behavior.
- The verification command referenced `server-cert.pem` without clarifying that it must be the leaf certificate. Clarified that condition and added a live TLS verification example using `openssl s_client -CAfile ... -verify_return_error`.

## Review Notes
The Flux and Kubernetes YAML examples use current `source.toolkit.fluxcd.io/v1` GitRepository syntax and valid Secret manifest structure. The local environment did not have `flux` or `kubectl` installed, so CLI behavior was verified against official documentation rather than local `--help` output.
