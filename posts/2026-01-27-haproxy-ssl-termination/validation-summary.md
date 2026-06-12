# Validation Summary: How to Configure HAProxy SSL Termination

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- HAProxy SSL/TLS termination
- TLS 1.2 and TLS 1.3 cipher configuration
- SNI-based certificate selection and routing
- OCSP stapling
- OpenSSL certificate inspection and validation commands
- Let's Encrypt and Certbot renewal
- HTTP security headers
- HAProxy stats and Prometheus exporter

## Sources Consulted
- HAProxy Configuration Manual 3.3: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy TLS basics tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/basics-enable-tls/
- HAProxy OCSP stapling tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/ocsp-stapling/
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Let's Encrypt Integration Guide: https://letsencrypt.org/docs/integration-guide/
- OpenSSL 3.0 command documentation: https://docs.openssl.org/3.0/man1/
- MDN X-XSS-Protection reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection

## Issues Found
- The certificate bundle example included the root CA certificate in the served PEM chain. Changed the example to combine the leaf certificate, intermediate certificate(s), and private key, which matches normal TLS chain deployment practice.
- The SNI certificate section implied HAProxy matches certificates by filename. Updated the wording and comments to state that HAProxy matches SNI against certificate CN/SAN values; filenames can be descriptive but are not the matching source.
- The OCSP examples used `ocsp-update on` directly on `bind` lines and used older `tune.ssl.ocsp-update.*` directive names without a version note. Updated the examples to HAProxy 3.0+ global OCSP update directives, removed unsupported `bind` options, and added a HAProxy 2.8/2.9 caveat.
- The production TLS example also used the unsupported `bind ... ocsp-update on` form. Replaced it with `ocsp-update.mode on` in the global section.
- The TLS 1.3 cipher-suite comment incorrectly said the listed three suites are the only TLS 1.3 ciphers. Updated it to describe them as widely supported AEAD suites.
- The security headers example recommended enabling the legacy `X-XSS-Protection` browser filter. Updated it to `X-XSS-Protection: 0`, consistent with current guidance that the header is deprecated and legacy filtering should be disabled if the header is sent.

## Review Notes
HAProxy was not installed in the local environment, so I could not run `haproxy -c` against generated test configs. The review was performed against official HAProxy documentation and supporting authoritative references. The Certbot renewal script is workable as a manual deployment pattern, but a future improvement would be to use Certbot deploy hooks so HAProxy reloads only after a certificate is actually renewed.
