# Validation Summary: How to Convert Certificates to PEM Format for Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSL (DER, PEM, PKCS#12, PKCS#7 conversion)
- Portainer (HTTPS/SSL configuration)
- Docker (container restart)
- Bash shell

## Sources Consulted
- OpenSSL 3.0.13 local `--help` output for `openssl x509`, `openssl rsa`, `openssl pkey`, `openssl pkcs12`, and `openssl pkcs7`
- OpenSSL official documentation: https://docs.openssl.org/3.0/man1/openssl-pkcs12/
- OpenSSL official documentation: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL official documentation: https://docs.openssl.org/3.0/man1/openssl-pkcs7/
- Portainer documentation for SSL flags (`--sslcert`, `--sslkey`): https://docs.portainer.io/

## Issues Found
No technical issues found.

All commands and flags verified as correct:
- `openssl x509 -inform der ...` correctly converts DER-encoded certificates to PEM (default outform is PEM).
- `openssl rsa -inform der ...` correctly converts DER private keys to PEM.
- `openssl pkcs12 -nokeys` / `-nocerts` / `-nodes` flags are valid for extracting certificates and keys from PFX/P12 bundles.
- `openssl pkcs7 -print_certs` correctly converts PKCS#7 bundles to PEM certificate output.
- `openssl x509 -in <combined> -out <cert>` correctly extracts the first certificate from a combined PEM (the leaf certificate).
- `openssl pkey -in <combined>` correctly extracts the private key block.
- The modulus comparison via `openssl x509 -modulus` and `openssl rsa -modulus` is a valid technique for matching an RSA key to its certificate.
- The `cat` concatenation for fullchain assembly is the standard idiom.
- Portainer's `--sslcert` flag is the correct CLI argument.

## Review Notes
- The `-nodes` flag is deprecated in OpenSSL 3.x in favor of `-noenc`, but `-nodes` is still accepted and remains widely used in documentation. No change required.
- The modulus-comparison technique only works for RSA keys; ECDSA/Ed25519 key matching would need a different approach (e.g., comparing public-key SPKI fingerprints). The post implicitly targets RSA, which is reasonable for a Portainer-focused PFX/P12 conversion guide.
- The `openssl x509 -in combined.pem -out certificate.pem` step extracts only the first certificate block; if the PFX contained intermediates, they would not be carried through. This matches the post's later "Create a PEM with Full Chain" section, which addresses exactly this scenario.
- The example deployment path `/opt/portainer/certs/` is a host-side convention rather than a Portainer default; users may need to adjust based on how their Portainer container mounts certificates.
