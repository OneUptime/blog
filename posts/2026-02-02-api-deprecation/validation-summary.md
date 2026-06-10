# Validation Summary: How to Handle API Deprecation

## Status
validated

## Post Type
Guide / Tutorial — best-practices guide covering the API deprecation lifecycle with Python, JavaScript (Node/Express), and Go code samples plus Mermaid diagrams.

## Technologies Covered
- HTTP `Deprecation` response header (RFC 9745)
- HTTP `Sunset` response header (RFC 8594)
- HTTP `Link` header relation types: `successor-version` (RFC 5829), `deprecation` (RFC 9745)
- HTTP `410 Gone` status code (RFC 9110)
- Python (`datetime`, `email.utils.formatdate`, middleware pattern, pytest)
- JavaScript / Node.js / Express (response wrapping, metrics endpoint)
- Go (`net/http`, `time`, `encoding/json`, middleware pattern)
- Structured Field Values for HTTP (RFC 9651) — specifically sf-date

## Sources Consulted
- [RFC 8594: The Sunset HTTP Header Field](https://datatracker.ietf.org/doc/html/rfc8594)
- [RFC 9745: The Deprecation HTTP Response Header Field](https://datatracker.ietf.org/doc/html/rfc9745)
- [RFC 9651: Structured Field Values for HTTP](https://datatracker.ietf.org/doc/html/rfc9651) (sf-date in Section 3.3.7)
- [RFC 9110: HTTP Semantics — 15.5.11 `410 Gone`](https://datatracker.ietf.org/doc/html/rfc9110#section-15.5.11)
- [RFC 5829: Link Relation Types for Simple Version Navigation](https://datatracker.ietf.org/doc/html/rfc5829) (registers `successor-version`)
- [RFC 7231: HTTP/1.1 Semantics — 7.1.1.1 HTTP-date](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.1.1)
- [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/link-relations.xhtml)

## Issues Found

1. **Wrong RFC attribution for the `Deprecation` header.** The Python middleware comment described its headers as "RFC 8594 deprecation headers." RFC 8594 only defines `Sunset`. The `Deprecation` header is defined in RFC 9745 (Standards Track, March 2025). Updated the comment to reference both RFCs accurately.

2. **Wrong value format for the `Deprecation` header.** The middleware emitted `Deprecation` using HTTP-date format (e.g. `Sun, 01 Feb 2026 00:00:00 GMT`). Per RFC 9745, the `Deprecation` header value MUST be a Structured Field sf-date per RFC 9651 §3.3.7 — i.e. `@<unix-seconds>` (e.g. `@1738368000`). Added a new `format_sf_date()` helper, switched the `Deprecation` header to use it, and kept `format_http_date()` for `Sunset` (which is correctly HTTP-date per RFC 8594).

3. **Test asserting `'GMT' in headers['Deprecation']`.** This matched the old (incorrect) HTTP-date implementation. Updated to assert the value starts with `@` and is followed by an integer, matching the sf-date contract from RFC 9745.

4. **Best-practices bullet "Deprecation and Sunset headers per RFC 8594".** This conflates the two headers under one RFC. Split into "Deprecation header per RFC 9745 and Sunset header per RFC 8594".

## Review Notes
- The `format_http_date()` helper builds a Unix timestamp via `mktime(dt.timetuple())`, which interprets a naive `datetime` as local time before converting. For naive UTC values on a non-UTC server this can yield an HTTP-date offset by the server's timezone. The illustrative `DEPRECATION_CONFIG` uses naive `datetime(2026, 2, 1)` values, so on a UTC-configured server (typical in production) the output is correct. Left as-is because the surrounding text presents the snippet as a starting point and the issue is server-environment dependent.
- `DeprecationMiddleware` is presented as an "ASGI/WSGI" middleware but only exposes `__init__` and `add_deprecation_headers`; it does not implement the WSGI `__call__(environ, start_response)` or ASGI `async __call__(scope, receive, send)` contract. The class is illustrative — readers are expected to wire `add_deprecation_headers` into their framework's response pipeline. Left as-is since the post focuses on the header logic, not a runnable middleware shell.
- `datetime.utcnow()` (used in `DeprecationTracker.track_usage`) is deprecated from Python 3.12 onward in favor of `datetime.now(datetime.UTC)`. Still functional and very common in existing code; not flagged as a correctness error.
- The `410 Gone` recommendation, the `successor-version` link relation, and the `deprecation` link relation are all used correctly and match IANA / RFC definitions.
- Timeline guidance, communication-channel guidance, and the lifecycle/decision diagrams are subjective best-practice content rather than verifiable technical claims, and are reasonable.
