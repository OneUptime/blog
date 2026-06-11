# Validation Summary: How to Implement HAL Format for APIs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HAL (Hypertext Application Language)
- REST / HATEOAS
- JSON Hypermedia APIs
- Node.js
- Express
- FastAPI
- Pydantic
- URI Templates (RFC 6570)
- IANA link relations

## Sources Consulted
- HAL Internet-Draft: https://www.ietf.org/archive/id/draft-kelly-json-hal-11.html
- RFC 6570 URI Template: https://datatracker.ietf.org/doc/html/rfc6570
- IANA Link Relation Types registry: https://www.iana.org/assignments/link-relations/link-relations.xhtml
- RFC 8288 Web Linking: https://httpwg.org/specs/rfc8288.html
- Express 5.x API Reference: https://expressjs.com/en/api/
- Node.js CommonJS modules documentation: https://nodejs.org/api/modules.html
- FastAPI custom response documentation: https://fastapi.tiangolo.com/advanced/custom-response/
- Pydantic configuration documentation: https://pydantic.dev/docs/validation/latest/api/pydantic/config/
- Pydantic migration guide: https://pydantic.dev/docs/validation/latest/get-started/migration/

## Issues Found
- The Node.js middleware example used `require('./hal-builder')` from `middleware/hal.js`, but the preceding file layout places `hal-builder.js` one directory above the middleware. Changed it to `require('../hal-builder')`.
- The Express app example called `app.listen()` unconditionally and did not export `app`, which made the later Supertest example using `require('../app')` fail or start a server during tests. Wrapped `app.listen()` in `if (require.main === module)` and added `module.exports = app`.
- The HAL builder comment described `method` as a HAL spec attribute. HAL link objects define standard attributes such as `href`, `templated`, `type`, `deprecation`, `name`, `profile`, `title`, and `hreflang`; `method` is application-specific metadata. Updated the comment to distinguish standard HAL attributes from the `method` extension.
- The Pydantic examples used class-based `Config` and `populate_by_name`, which are deprecated or no longer recommended in current Pydantic v2 guidance. Updated the model configuration to use `ConfigDict` with `validate_by_name`, `validate_by_alias`, and `serialize_by_alias`.
- The link relation table described `self` as required for every resource. HAL defines `_links` as optional, though `self` is a strong best practice. Changed this to "Recommended for every resource."
- The link relation table presented `delete` alongside standard IANA relations even though `delete` is not an IANA-registered relation. Marked it as an application-specific deletion action and clarified that non-registered action relations should use URL-prefixed relation names to avoid conflicts.
- The JavaScript URI template expansion example did not correctly expand RFC 6570 form-style query expressions with multiple variables, such as `{?status,userId,from,to}`. Replaced it with a small implementation that handles the demonstrated simple path variables and form-style query variables.

## Review Notes
The examples still use application-specific action metadata such as `method` and short custom relation names like `pay` and `cancel`. That can be acceptable for an API-specific convention, but production APIs should document those relation semantics or use URI-valued relation names for non-IANA relations.
