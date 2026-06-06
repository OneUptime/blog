# Validation Summary: How to Implement API Versioning in Express

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Node.js
- Express.js (v4/v5)
- HTTP standards: Sunset header (RFC 8594), Deprecation header (IETF draft), Link header (RFC 8288), Warning header
- supertest / Jest (testing)
- REST API design patterns (URL, header, query versioning)

## Sources Consulted
- Express.js official documentation: https://expressjs.com/en/api.html (Router, res.redirect, res.json, res.set, req.headers, req.path, req.baseUrl)
- Express routing guide: https://expressjs.com/en/guide/routing.html
- RFC 8594 — The Sunset HTTP Header Field: https://datatracker.ietf.org/doc/html/rfc8594
- draft-ietf-httpapi-deprecation-header — The Deprecation HTTP Response Header Field: https://datatracker.ietf.org/doc/draft-ietf-httpapi-deprecation-header/
- RFC 8288 — Web Linking (Link header and rel registry, including "successor-version"): https://datatracker.ietf.org/doc/html/rfc8288
- RFC 9111 — HTTP Caching (obsoletes Warning header)
- Node.js HTTP module (lowercase header normalization): https://nodejs.org/api/http.html
- supertest documentation: https://github.com/ladjs/supertest
- Jest matchers: https://jestjs.io/docs/expect

## Issues Found
- **Summary table — RFC attribution**: The original "Deprecation | RFC 8594 headers | All APIs" row conflated two distinct standards. RFC 8594 specifies only the `Sunset` header; the `Deprecation` header is defined in a separate IETF Internet Draft (draft-ietf-httpapi-deprecation-header). Changed the implementation cell to "Sunset/Deprecation headers" to accurately reflect what is used in the post without misattributing a specification.

## Review Notes
- The `Warning` header used in `deprecationMiddleware` (`Warning: 299 - "..."`) is technically obsoleted by RFC 9111 (which obsoletes RFC 7234). It is still widely used in API deprecation patterns in practice, so leaving it in place is reasonable, but future readers should be aware it is no longer part of the current HTTP caching specification.
- The `Deprecation` and `Sunset` header values in the examples use ISO-style date strings (e.g., `'2024-01-01'`). The current IETF draft for `Deprecation` expects a Structured Field `@date` (Unix timestamp) value, and RFC 8594 specifies an IMF-fixdate (HTTP-date) format for `Sunset`. The illustrative date strings convey the pattern but would not strictly conform to either specification in a real deployment.
- The `parseInt(req.params.id)` calls omit the radix argument. Since ES5, `parseInt` defaults to base 10 for strings not starting with `0x`/`0X`, so this is not a bug, just stylistically loose.
- The version regex `/\/v(\d+)\//` in `VersionResolver.resolve` requires a trailing slash after the version segment, so a path like `/v1` (no further segments) would not match. Acceptable for typical use cases shown.
- The "Testing Versioned APIs" section mixes tests that target the URL-versioned routes (`/api/v1/users`) with tests that target a header-driven `/api/users` endpoint. The "Complete Application" code mounts only `/api/v1/users` and `/api/v2/users`, so the header-versioning test on `/api/users` would currently hit the 404 handler. The tests are presented as illustrative of the patterns rather than as a runnable suite against the exact `app.js` shown.
- The "Header | Clean URLs, follows REST" pros entry reflects a common opinion, but REST itself does not mandate any versioning strategy — this is presentational, not a technical error.
