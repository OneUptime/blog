# Validation Summary: How to Version REST APIs Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- REST API versioning
- HTTP headers and content negotiation
- Flask
- Express
- Go net/http
- JavaScript Fetch API
- pytest
- OpenAPI 3.0
- Semantic Versioning

## Sources Consulted
- Flask documentation: https://flask.palletsprojects.com/en/stable/api/
- Flask blueprints documentation: https://flask.palletsprojects.com/en/stable/blueprints/
- Express routing documentation: https://expressjs.com/en/guide/routing/
- Go net/http documentation: https://pkg.go.dev/net/http
- RFC 8594, The Sunset HTTP Header Field: https://datatracker.ietf.org/doc/html/rfc8594
- RFC 9745, The Deprecation HTTP Response Header Field: https://datatracker.ietf.org/doc/html/rfc9745
- RFC 6838, Media Type Specifications and Registration Procedures: https://datatracker.ietf.org/doc/html/rfc6838
- RFC 9110, HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110
- GitHub REST API versioning documentation: https://docs.github.com/en/rest/about-the-rest-api/api-versions
- Stripe API versioning documentation: https://docs.stripe.com/api/versioning
- Microsoft Graph REST API v1.0 endpoint documentation: https://learn.microsoft.com/en-us/graph/api/overview?view=graph-rest-1.0
- Azure REST API reference example for api-version query parameter: https://learn.microsoft.com/en-us/rest/api/resources/resources/list?view=rest-resources-2021-04-01
- OpenAPI Specification 3.0.3: https://spec.openapis.org/oas/v3.0.3.html
- Semantic Versioning 2.0.0: https://semver.org/

## Issues Found
- The Express example reused `const router` twice in one JavaScript code block. Even though the comments describe separate files, the combined snippet was syntactically invalid as written. Renamed the routers to `usersV1Router` and `usersV2Router`.
- The Go query-parameter example described `/api/users/123?version=2` but fetched the user ID from `r.URL.Query().Get("id")`. Updated the example to use Go's `r.PathValue("id")` with a matching `http.HandleFunc("GET /api/users/{id}", getUserHandler)` registration comment.
- The strategy comparison diagram misclassified real-world examples. Updated it so Microsoft Graph/Twitter are listed under path versioning, Azure Resource Manager under query-parameter versioning, and GitHub REST API/Stripe under header versioning.
- The deprecation header example incorrectly said both `Deprecation` and `Sunset` are defined by RFC 8594. Updated the text to cite RFC 9745 for `Deprecation` and RFC 8594 for `Sunset`.
- The deprecation example used `Deprecation: true` and a `Sunset` value formatted as `YYYY-MM-DD`, which do not match the current RFC formats. Updated `Deprecation` to an RFC 9745 structured date value and `Sunset` to an HTTP-date value.
- The pytest example still expected `Deprecation: true`. Updated the assertion to match the corrected deprecation header value.
- The Flask version-router example used `jsonify` without importing it. Updated the import to include `jsonify` and removed unused imports from that snippet.

## Review Notes
The post is technically sound after the fixes. Some examples are intentionally illustrative and still rely on placeholder functions such as `fetch_user_from_database`, `fetchUserFromDatabase`, and model objects such as `User`; that is acceptable for this guide. For browser clients calling cross-origin APIs, custom response headers such as `X-API-Version` may also need to be exposed with CORS headers before `response.headers.get()` can read them.
