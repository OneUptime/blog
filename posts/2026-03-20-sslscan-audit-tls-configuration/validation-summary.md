# Validation Summary: How to Use sslscan to Audit TLS Configuration on a Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- sslscan
- TLS/SSL protocols
- Cipher suites
- X.509 certificates
- Linux and macOS package managers
- Shell scripting

## Sources Consulted
- sslscan upstream README: https://github.com/rbsec/sslscan
- sslscan manual page: https://manpages.debian.org/testing/sslscan/sslscan.1.en.html
- Ubuntu Server TLS/SSL troubleshooting documentation: https://ubuntu.com/server/docs/explanation/crypto/troubleshooting-tls-ssl/
- Fedora sslscan package page: https://packages.fedoraproject.org/pkgs/sslscan/sslscan/
- Homebrew sslscan formula: https://formulae.brew.sh/formula/sslscan.html
- RFC 8996, Deprecating TLS 1.0 and TLS 1.1: https://www.rfc-editor.org/rfc/rfc8996
- RFC 6797, HTTP Strict Transport Security: https://datatracker.ietf.org/doc/html/rfc6797

## Issues Found
- Clarified the RHEL/CentOS installation note to mention EPEL, because Fedora documents sslscan packages in Fedora and EPEL repositories.
- Changed the "Show only failed (weak) results" comment to "Filter for enabled, weak, or export findings" because the grep example is a text filter and does not show only failed results.
- Corrected the certificate expiry grep pattern from `Not After` to `Not valid after`, matching common sslscan certificate output labels.
- Updated the certificate-details comment to use sslscan-style fields: `Altnames/SANs`, `Not valid before/after`, and `RSA key strength`.
- Replaced the HSTS table row with a weak certificate signature / short RSA key finding. HSTS is an HTTP response-header policy defined by RFC 6797, while sslscan does not report HTTP headers.
- Broadened the final cipher recommendation from AES-GCM only to AEAD ciphers such as AES-GCM or ChaCha20-Poly1305.

## Review Notes
The tutorial is technically relevant and the corrected commands align with sslscan's documented options. `--show-certificates` may be useful in a future expansion if the post needs to cover full certificate-chain inspection.
