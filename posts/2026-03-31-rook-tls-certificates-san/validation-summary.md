# Validation Summary: How to Configure TLS Certificates with SANs for Rook Object Store

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Gateway (RGW)
- OpenSSL (certificate generation)
- Kubernetes Secrets (TLS type)
- cert-manager (automated certificate management)
- TLS / X.509 certificates with Subject Alternative Names (SANs)

## Sources Consulted
- OpenSSL `req` command documentation: https://www.openssl.org/docs/man3.0/man1/openssl-req.html
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/reference/api-docs/#cert-manager.io/v1.Certificate
- Kubernetes TLS Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets

## Issues Found
1. **Misleading description of OpenSSL command**: The text described the `openssl req -x509` command as creating a "certificate signing request (CSR)", but the `-x509` flag causes it to generate a self-signed certificate directly, not a CSR. Changed the description to "Create a self-signed certificate with the required SANs."
2. **Missing `-extensions v3_req` flag**: The `openssl req -x509` command was missing the `-extensions v3_req` flag. While some OpenSSL versions automatically apply `req_extensions` to self-signed certificates, others do not. Without this flag, the SANs from the `[v3_req]` section may be silently omitted from the generated certificate, which would defeat the entire purpose of the tutorial. Added `-extensions v3_req` to the command.

## Review Notes
- The CephObjectStore `hosting` field with `advertiseEndpoint` and `dnsNames` is available in Rook v1.12+. The post does not specify a minimum Rook version, which could cause confusion for users on older versions.
- The cert-manager example correctly uses the `v1` API and a `ClusterIssuer` reference. Note that Let's Encrypt wildcard certificates require DNS-01 challenge validation, which is not mentioned in the post but would be important for users to know.
- The self-signed certificate uses RSA 2048-bit keys, which is acceptable but RSA 4096 or ECDSA P-256 would be stronger choices for production use.
