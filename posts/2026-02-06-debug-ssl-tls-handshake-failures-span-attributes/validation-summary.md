# Validation Summary: How to Debug SSL/TLS Handshake Failures Using OpenTelemetry HTTP Connection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python `ssl` and `socket`
- OpenTelemetry Python tracing API
- TLS / SSL handshakes
- X.509 certificates
- Mutual TLS (mTLS)
- `cryptography` X.509 certificate parsing

## Sources Consulted
- Python `ssl` documentation: https://docs.python.org/3/library/ssl.html
- OpenTelemetry Python Span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry semantic conventions for errors and general attributes: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/ and https://opentelemetry.io/docs/specs/semconv/general/attributes/
- OpenTelemetry network attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/
- RFC 8446, The Transport Layer Security (TLS) Protocol Version 1.3: https://www.rfc-editor.org/info/rfc8446
- OpenSSL verification error documentation: https://docs.openssl.org/3.6/man3/X509_STORE_CTX_get_error/
- `cryptography` X.509 reference: https://cryptography.io/en/44.0.1/x509/reference/

## Issues Found
- Replaced the deprecated OpenTelemetry-style `net.peer.ip` attribute with `network.peer.address`, which is the current network peer address semantic convention.
- Replaced boolean `error = true` attributes with `set_status(StatusCode.ERROR)`, `record_exception(e)`, and `error.type`, matching current OpenTelemetry error recording guidance.
- Guarded optional `ssl.SSLError.reason` and `ssl.SSLError.library` attributes before setting them, because OpenTelemetry discourages `None` attribute values.
- Replaced manual parsing of `getpeercert()["notAfter"]` with `ssl.cert_time_to_seconds()` and timezone-aware datetime arithmetic, which matches Python's documented certificate time format handling.
- Removed certificate subject/expiry fields from the certificate-verification failure signatures because this implementation only calls `getpeercert()` after a successful verified handshake.
- Updated the mTLS example to import `datetime` and use `cert.not_valid_after_utc`, because `cryptography` deprecates the naive `not_valid_after` property.

## Review Notes
The code examples are illustrative manual instrumentation snippets rather than built-in OpenTelemetry HTTP instrumentation. TLS-specific span attribute names such as `tls.error.verify_code` and `tls.cert.days_until_expiry` are custom attributes, not official OpenTelemetry semantic convention keys.
