# Validation Summary: How to Implement mTLS Between Services with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- HashiCorp `tls` provider (`tls_private_key`, `tls_self_signed_cert`, `tls_cert_request`, `tls_locally_signed_cert`)
- AWS Secrets Manager (`aws_secretsmanager_secret_version`)
- Kubernetes (`kubernetes_secret`, `kubernetes_config_map`, `kubernetes_manifest`)
- Envoy proxy (`DownstreamTlsContext` v3 transport socket)
- Istio (`PeerAuthentication` CRD, STRICT mTLS mode)
- ECDSA (P-384 for CA, P-256 for leaf certs)
- Mutual TLS (mTLS) / X.509 PKI

## Sources Consulted
- HashiCorp `tls` provider docs (self_signed_cert, locally_signed_cert, cert_request, private_key) — https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/
- Istio PeerAuthentication reference — https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Envoy `DownstreamTlsContext` proto reference (`envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext`)
- Kubernetes Secret API reference

## Issues Found
- **Outdated Istio API version.** The `PeerAuthentication` manifest used `security.istio.io/v1beta1`. Istio promoted `PeerAuthentication` to GA `security.istio.io/v1` in Istio 1.22 (May 2024), and the current official documentation uses `v1`. Updated the manifest's `apiVersion` to `security.istio.io/v1`. The v1beta1 alias is still backwards-compatible but v1 is the current recommended version.

## Review Notes
- All `allowed_uses` values used in the post (`cert_signing`, `crl_signing`, `digital_signature`, `key_encipherment`, `client_auth`, `server_auth`) are valid per the `tls` provider's enum.
- All `subject` block fields used (`common_name`, `organization`, `organizational_unit`) are valid.
- `tls_self_signed_cert` correctly uses `is_ca_certificate = true` together with `cert_signing`/`crl_signing` for the CA.
- The Envoy config correctly uses `DownstreamTlsContext` with `require_client_certificate = true` to enforce mTLS, and `validation_context.trusted_ca` to validate client certs against the CA — this is the canonical Envoy mTLS pattern.
- The `aws_secretsmanager_secret_version` block references `aws_secretsmanager_secret.ca_cert` which is not declared inline. This is a typical blog-snippet omission rather than a technical error; readers will understand the parent secret resource is required.
- Conceptual note (left as-is): Step 2 issues service certs from a custom CA and mounts them into pods, while Step 4 enables Istio STRICT mTLS, which causes istiod to issue and rotate its own SPIFFE-based workload certs — the per-service certs from Step 2 would not be used by Istio sidecars in that mode. The post presents these as alternative approaches, which is reasonable for an introductory guide.
- The Kubernetes Secret defaults to `Opaque` (no `type` set). For pure TLS, `kubernetes.io/tls` with `tls.crt`/`tls.key` is conventional, but Opaque is acceptable here because the secret also bundles `ca.crt`.
- `tls_self_signed_cert` with `validity_period_hours = 87600` (10 years) for the CA and `8760` (1 year) for leaf certs are sensible choices and the math is correct.
