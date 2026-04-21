# Validation Summary: How to Test SSL/TLS Certificate Expiry with Command-Line Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSL `s_client`, `x509`, and `ocsp`
- curl command-line TLS inspection
- Bash scripting
- SSL/TLS and X.509 certificates
- OCSP revocation checks
- Nagios/Check_MK-style monitoring checks

## Sources Consulted
- OpenSSL `x509` official documentation: https://docs.openssl.org/3.6/man1/openssl-x509/
- OpenSSL `s_client` official documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL `ocsp` official documentation: https://docs.openssl.org/3.6/man1/openssl-ocsp/
- curl official man page for `--head`, `--verbose`, and `--write-out` variables: https://curl.se/docs/manpage.html
- Nagios Plugin Development Guidelines for plugin return codes: https://nagios-plugins.org/doc/guidelines.html
- Local command help/output for OpenSSL 3.0.13 and curl 8.5.0

## Issues Found
- The sample `example.com` certificate dates were stale. Updated the output example to match the certificate observed during validation on 2026-04-21.
- A comment said the first OpenSSL pipeline retrieved a Unix timestamp, but it retrieved the `notAfter` date string. Updated the comments so the timestamp conversion is described accurately.
- A local certificate comment said "Days remaining" while the command only printed the expiry date. Updated the comment to match the command.
- The batch script did not handle a failed date parse after trying GNU and BSD/macOS `date` syntax. Added an error message and `continue` so it does not compute days from an empty timestamp.
- The curl example used `%{ssl_certificate_expiry}`, which is not a documented curl `--write-out` variable and is rejected by curl. Replaced it with `%{certs}`, filtered for subject/issuer/expiry lines, and corrected the version note to curl 7.88.0+ with a supported TLS backend.
- The Nagios-compatible script did not return `UNKNOWN` for certificate retrieval or expiry date parsing failures. Added `exit 3` handling for those failure cases.
- The OCSP snippet parsed `openssl x509 -text` output and produced values like `URI:http://...` instead of a bare URL. Replaced it with `openssl x509 -ocsp_uri`, added SNI to the `s_client` call, and used `-no_nonce` with case-insensitive status filtering.

## Review Notes
- The standalone `date -d` examples are GNU/Linux-oriented. The batch script includes a BSD/macOS fallback, but a production monitoring plugin should add similar portability handling if it must run outside GNU environments.
- For production Nagios plugins, consider adding a timeout and full option parsing. The example now uses the correct basic return codes, but it is still intentionally minimal.
