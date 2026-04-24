# Validation Summary: How to Configure Certificate Chains in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer CE
- TLS / SSL
- X.509 certificate chains
- Intermediate certificate authorities
- OpenSSL
- Docker
- PKCS#12 / PFX

## Sources Consulted
- Portainer: Using your own SSL certificate with Portainer: https://docs.portainer.io/advanced/ssl
- Portainer: CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer: Deprecated and removed features: https://docs.portainer.io/advanced/deprecated
- Portainer: Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- OpenSSL: `verify`: https://docs.openssl.org/3.0/man1/openssl-verification-options/
- OpenSSL: `s_client`: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL: `pkcs12`: https://docs.openssl.org/3.3/man1/openssl-pkcs12/
- OpenSSL: `pkcs7`: https://docs.openssl.org/3.5/man1/openssl-pkcs7/
- OpenSSL: `crl2pkcs7`: https://docs.openssl.org/master/man1/openssl-crl2pkcs7/
- IETF RFC 5246, section 7.4.2: https://www.ietf.org/rfc/rfc5246.txt.pdf
- IETF RFC 8446, section 4.4.2: https://www.ietf.org/ietf-ftp/rfc/rfc8446.txt.pdf
- Local verification against OpenSSL 3.0.13 CLI help and `openssl s_client` output behavior

## Issues Found
- The Portainer launch example used the deprecated `--ssl` flag. I removed it because current Portainer releases enable HTTPS by default and Portainer lists `--ssl` as deprecated.
- The Portainer container image used `portainer/portainer-ce:latest`. I updated it to `portainer/portainer-ce:sts` to match Portainer’s current documented installation examples.
- The `openssl s_client -showcerts` example filtered for `subject|issuer`, which does not reliably show the full presented chain on current OpenSSL output. I changed it to inspect the certificate-chain lines that `s_client` actually prints.
- The remote verification example did not set SNI, did not verify the hostname, and did not validate against the provided root CA. I updated it to use `-servername`, `-verify_hostname`, and `-CAfile root.crt`, which is necessary for private PKI validation.
- The explanation for `unable to verify the first certificate` was too narrow. I corrected it to note that the error can indicate either a missing intermediate or a root CA that the client does not trust.
- The “self-signed certificate appearing in chain” check only printed the issuer, even though the text said to compare issuer and subject. I fixed the command to print both values.
- The PKCS#12 extraction example used `-nodes`, which is deprecated in current OpenSSL. I replaced it with `-noenc`.
- The PKCS#12 assembly step could imply concatenating a root CA into `fullchain.pem`. I clarified that the assembled chain should contain only the leaf certificate plus intermediate CA certificate(s), not the root.
- The trust-model wording in the overview, chain explanation, and conclusion was too absolute. I corrected it to reflect that clients must trust the root CA separately and that some clients may already have or fetch intermediates.

## Review Notes
- Portainer’s current SSL guide and CLI reference still document `--sslcert` and `--sslkey` for the server certificate path, and those are the commands this review validated against.
- The article remains intentionally generic and does not pin a Portainer release number. The command examples were aligned with the current Portainer documentation available on 2026-04-24.
