# Validation Summary: How to use Vault Transit secrets engine for encryption as a service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault Transit secrets engine
- Vault CLI and Vault policy syntax
- Vault Kubernetes auth method
- Go with github.com/hashicorp/vault/api
- Python with hvac
- Kubernetes service account authentication
- Transit key rotation, rewrap, convergent encryption, signing, and HMACs

## Sources Consulted
- HashiCorp Vault Transit secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault Transit secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/transit
- HashiCorp Vault encryption as a service Transit tutorial: https://developer.hashicorp.com/vault/tutorials/encryption-as-a-service/eaas-transit
- HashiCorp Vault Kubernetes auth method API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault policy concepts documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- hvac Transit documentation: https://python-hvac.org/en/stable/usage/secrets_engines/transit.html
- hvac Kubernetes auth documentation: https://python-hvac.org/en/stable/usage/auth_methods/kubernetes.html
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil
- HashiCorp Vault Go API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api

## Issues Found
- The post said Transit supports "key rotation with automatic re-encryption." Vault rotates key versions, but existing ciphertext is not automatically re-encrypted; it must be rewrapped. Changed the wording to mention key rotation and rewrapping ciphertext to newer key versions.
- The Kubernetes auth role example used `policies` and `ttl`, which are deprecated role parameters in the current API. Updated the command to use `token_policies` and `token_ttl`.
- The Transit admin policy used `*` in the middle of policy paths for `rotate` and `config`. Vault only supports `*` as a glob suffix; updated those paths to use the single-segment `+` wildcard.
- The Go example imported `context` without using it, which would prevent compilation. Removed the unused import.
- The Go example used the deprecated `io/ioutil` package. Replaced `ioutil.ReadFile` with `os.ReadFile`.
- The rewrap Go example referenced an undefined `extractVersion` helper and used `json.Number` without showing the required import or handling conversion errors. Added an `extractVersion` helper and changed latest-version parsing to return errors cleanly.
- The signing example used an ECDSA-looking placeholder signature for an Ed25519 key. Replaced it with a generic Transit signature placeholder.
- The HMAC section created a key with `type=aes256-gcm96` while describing it as an HMAC key. Although Vault supports HMAC operations for all key types, an HMAC-only key should use `type=hmac`; updated the command and label accordingly.

## Review Notes
The Vault CLI binary was not installed in the local workspace, so CLI behavior was verified against HashiCorp's current official Vault documentation rather than local `vault --help` output. The base64 examples follow HashiCorp's documentation style using `echo`; using `echo -n` may be preferable when callers do not want the trailing newline included in the encrypted plaintext.
