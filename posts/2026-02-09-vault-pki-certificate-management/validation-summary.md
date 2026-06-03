# Validation Summary: How to configure Vault PKI secrets engine for certificate management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault PKI secrets engine
- Vault CLI
- Vault Kubernetes authentication
- Vault Agent Injector and templates
- Kubernetes Deployments and TLS Secrets
- Go
- OpenSSL
- jq

## Sources Consulted
- HashiCorp Vault PKI secrets engine API: https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault PKI secrets engine setup documentation: https://developer.hashicorp.com/vault/docs/secrets/pki/setup
- HashiCorp Vault Agent template documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Kubernetes auth method API: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Kubernetes auto-auth method: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/kubernetes
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Go crypto/x509 package documentation: https://pkg.go.dev/crypto/x509
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil

## Issues Found
- Corrected PKI role domain constraints. The application, service mesh, and development roles now use base domains with `allow_subdomains=true` instead of putting wildcard names directly in `allowed_domains`, which better matches Vault role semantics for subdomain and wildcard issuance.
- Updated the Kubernetes auth role command from deprecated `policies` and legacy `ttl` style fields to `token_policies` and `token_ttl`, matching current Vault auth role parameters.
- Fixed the Vault Agent Injector example. The original template issued the certificate, private key, and CA through separate `secret` calls, which could create mismatched cert/key material. It now uses `pkiCert` and `writeToFile` from one issuance, and sets `secret-volume-path` so files are rendered under `/etc/nginx/ssl`.
- Removed the manually declared `emptyDir` TLS mount from the injector example because Vault Agent Injector manages the rendered secrets volume.
- Fixed the Go certificate rotation sample by adding the missing `crypto/x509` import, replacing deprecated `io/ioutil` calls with `os.ReadFile` and `os.WriteFile`, importing `fmt`, checking missing Vault response data, and handling authentication/issuance errors in `main`.
- Renamed the CRL section from "Configuring CRL and OCSP" to "Configuring CRL" because the commands only configure CRLs.
- Fixed the CRL download command to write `crl.pem`, matching the subsequent `openssl crl -in crl.pem` verification command.

## Review Notes
The examples remain intentionally simplified for a tutorial. Production deployments should also account for Vault auth method setup, Vault TLS verification, app reload behavior after certificate rotation, CA trust distribution, and stricter Vault ACL separation for privileged PKI operations such as signing intermediates and revocation.
