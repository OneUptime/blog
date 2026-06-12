# Validation Summary: How to Create API Deprecation Headers

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HTTP response headers
- API deprecation and sunset lifecycle
- RFC 9745 Deprecation header
- RFC 8594 Sunset header
- RFC 8288 Link header
- Express.js / Node.js
- Flask / Python
- Go net/http
- Fetch API browser clients
- pytest

## Sources Consulted
- RFC 9745: The Deprecation HTTP Response Header Field - https://datatracker.ietf.org/doc/rfc9745/
- RFC 8594: The Sunset HTTP Header Field - https://www.rfc-editor.org/info/rfc8594/
- RFC 8288: Web Linking - https://www.rfc-editor.org/rfc/rfc8288
- IANA Link Relation Types - https://www.iana.org/assignments/link-relations/
- Express 5.x API Reference - https://expressjs.com/en/api/
- Flask 3.1 API Documentation - https://flask.palletsprojects.com/en/stable/api/
- Go net/http package documentation - https://pkg.go.dev/net/http
- MDN Access-Control-Expose-Headers - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers
- MDN HTTP 410 Gone status - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
- Python datetime documentation - https://docs.python.org/3/library/datetime.html
- Python email.utils documentation - https://docs.python.org/3/library/email.utils.html

## Issues Found
- The post incorrectly stated that both `Deprecation` and `Sunset` are defined in RFC 8594. Updated the text to state that `Deprecation` is defined in RFC 9745 and `Sunset` is defined in RFC 8594.
- The `Deprecation` examples and middleware used boolean or HTTP-date values. RFC 9745 defines `Deprecation` as a structured field date, so the examples and Node.js, Flask, and Go middleware now emit values such as `@1767225600`.
- The browser Fetch example read `Deprecation`, `Sunset`, and `Link` headers, but cross-origin browser clients cannot read non-safelisted response headers unless they are exposed. Added `Access-Control-Expose-Headers: Deprecation, Sunset, Link` to the server middleware examples.
- The Flask date formatting used `mktime()` with naive datetimes, which can interpret dates in the local timezone before formatting them as GMT. Replaced it with timezone-aware UTC handling and `email.utils.format_datetime(..., usegmt=True)`.
- Several example sunset dates were already in the past as of the validation date, which made the included "sunset date is in the future" test inaccurate. Updated the example sunset dates and timeline to 2027.
- The pytest example compared an aware parsed HTTP date with `datetime.utcnow()`, which can raise a naive/aware datetime comparison error. Updated the test to compare against `datetime.now(timezone.utc)`.
- The timeline example used `datetime.utcnow()` and naive datetimes. Updated it to use timezone-aware UTC datetimes.

## Review Notes
The examples still use placeholder helper functions such as `getUserById`, `fetch_user_from_database`, and `fetchUserFromDatabase`; that is acceptable for a blog tutorial, but a runnable sample repository would need stub implementations or fixtures.
