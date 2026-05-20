# Validation Summary: How to Convert Between SSL Certificate Formats (PEM, DER, PFX) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- OpenSSL
- X.509 certificates
- PEM, DER, PKCS#12/PFX, and PKCS#7 certificate formats
- Java KeyStore and keytool
- Bash scripting

## Sources Consulted
- OpenSSL 3.0 `openssl-x509` documentation: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL 3.0 `openssl-pkcs12` documentation: https://docs.openssl.org/3.0/man1/openssl-pkcs12/
- OpenSSL 3.0 `openssl-pkcs7` documentation: https://docs.openssl.org/3.0/man1/openssl-pkcs7/
- OpenSSL 3.0 `openssl-crl2pkcs7` documentation: https://docs.openssl.org/3.0/man1/openssl-crl2pkcs7/
- OpenSSL 3.0 `openssl-rsa` documentation: https://docs.openssl.org/3.0/man1/openssl-rsa/
- OpenSSL 3.0 `openssl-pkcs8` documentation: https://docs.openssl.org/3.0/man1/openssl-pkcs8/
- Oracle `keytool` command documentation: https://docs.oracle.com/en/java/javase/22/docs/specs/man/keytool.html
- Local OpenSSL 3.0.13 command help for `x509`, `pkcs12`, `pkcs7`, `crl2pkcs7`, `rsa`, `pkcs8`, and `verify`.

## Issues Found
- The PEM description implied that all PEM files use certificate headers even though private keys and other PEM objects use their own labels. Updated the wording to describe PEM as base64-encoded DER data with certificate headers as the certificate-specific example.
- The PKCS#12 extraction examples used `-nodes`, which OpenSSL 3.0 deprecates in favor of `-noenc`. Replaced `-nodes` with `-noenc` and updated the explanatory comment.
- The "extract only the certificate" PKCS#12 command used `-nokeys` without `-clcerts`, which can output all certificates including CA certificates. Added `-clcerts` so the command matches the stated behavior.
- The PKCS#8 to traditional RSA conversion command did not force traditional output on OpenSSL 3.0. Added `-traditional` to produce the format described.

## Review Notes
The corrected OpenSSL examples were smoke-tested with a temporary self-signed certificate, private key, DER conversion, PKCS#12 export/import, PKCS#7 conversion, and private-key format conversion. `keytool` was not installed in the local environment, so the Java KeyStore commands were checked against Oracle's official `keytool` documentation instead.
