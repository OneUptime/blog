# Validation Summary: How to Convert Certificates to PEM Format for Portainer - Certs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- TLS/SSL certificates
- PEM, DER, PKCS#12/PFX, PKCS#7, and JKS formats
- OpenSSL CLI
- Java `keytool`
- Docker

## Sources Consulted
- Portainer Documentation: Using your own SSL certificate with Portainer https://docs.portainer.io/advanced/ssl
- Portainer Documentation: CLI configuration options https://docs.portainer.io/sts/advanced/cli
- OpenSSL Documentation: `openssl x509` https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL Documentation: `openssl pkey` https://docs.openssl.org/3.5/man1/openssl-pkey/
- OpenSSL Documentation: `openssl pkcs12` https://docs.openssl.org/3.3/man1/openssl-pkcs12/
- OpenSSL Documentation: `openssl pkcs7` https://docs.openssl.org/3.5/man1/openssl-pkcs7/
- OpenSSL Documentation: `openssl verify` https://docs.openssl.org/master/man1/openssl-verify/
- Oracle Java Documentation: `keytool` https://docs.oracle.com/en/java/javase/24/docs/specs/man/keytool.html
- RFC 7468: Textual Encodings of PKIX, PKCS, and CMS Structures https://www.rfc-editor.org/rfc/rfc7468
- Docker Documentation: Bind mounts https://docs.docker.com/engine/storage/bind-mounts/

## Issues Found
- The DER private-key conversion used `openssl rsa`, which only handles RSA keys. I changed it to `openssl pkey` so the example works for other private key types as well.
- The PKCS#12 extraction examples used `-nodes`, which is deprecated in current OpenSSL. I replaced those uses with `-noenc`.
- The JKS conversion example omitted `-srcstoretype JKS`, used a hard-coded alias, and did not set `-destkeypass`. I added `-srcstoretype JKS`, changed the alias to `your-alias`, and set `-destkeypass` to match `-deststorepass` for PKCS#12 compatibility.
- The certificate and private-key verification example compared RSA moduli, which does not work for non-RSA keys. I replaced it with a public-key comparison using `openssl x509 -pubkey` and `openssl pkey -pubout`.
- The certificate chain verification example treated `chain.pem` as the trust store. I changed it to use `root-ca.pem` as the trust anchor with `chain.pem` passed via `-untrusted`, which matches OpenSSL’s verification model more closely.
- The Portainer deployment example copied files into `/data/certs/cert.pem` and `/data/certs/key.pem`, which does not match Portainer’s documented HTTPS certificate configuration for the UI/API. I replaced it with the documented standalone deployment pattern using a bind mount plus `--sslcert` and `--sslkey`.

## Review Notes
- Portainer’s standalone documentation requires the certificate passed to `--sslcert` to include the full chain. The post already assembled `fullchain.pem`, and the deployment example now uses that file directly.
- The deployment example now uses `portainer/portainer-ce:sts`, which matches the current Portainer documentation as of 2026-04-24.
