# Validation Summary: How to Generate Useful Negative and Boundary Tests from an OpenAPI Schema

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OpenAPI Specification 3.2.0 and 3.0 version differences
- OpenAPI Schema, Parameter, Request Body, Responses, and Discriminator Objects
- JSON Schema Draft 2020-12 validation and composition
- HTTP parameter serialization, media types, and percent-encoding
- Negative, boundary, property-based, and pairwise API testing
- Unicode string-length and numeric-boundary handling

## Sources Consulted

- [Latest published OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [OpenAPI 3.2.0 OpenAPI Object](https://spec.openapis.org/oas/v3.2.0.html#openapi-object) and [Info Object](https://spec.openapis.org/oas/v3.2.0.html#info-object)
- [OpenAPI 3.2.0 parsing and reference resolution](https://spec.openapis.org/oas/v3.2.0.html#parsing-documents)
- [OpenAPI 3.2.0 Schema Object](https://spec.openapis.org/oas/v3.2.0.html#schema-object) and [schema dialect selection](https://spec.openapis.org/oas/v3.2.0.html#specifying-schema-dialects)
- [OpenAPI 3.2.0 Parameter Object](https://spec.openapis.org/oas/v3.2.0.html#parameter-object)
- [OpenAPI 3.2.0 Request Body Object](https://spec.openapis.org/oas/v3.2.0.html#request-body-object) and [Responses Object](https://spec.openapis.org/oas/v3.2.0.html#responses-object)
- [OpenAPI 3.2.0 Discriminator Object](https://spec.openapis.org/oas/v3.2.0.html#discriminator-object) and [`readOnly`/`writeOnly` validation](https://spec.openapis.org/oas/v3.2.0.html#validating-readonly-and-writeonly)
- [OpenAPI 3.0.4 Schema Object](https://spec.openapis.org/oas/v3.0.4.html#schema-object)
- [JSON Schema Draft 2020-12 Core](https://json-schema.org/draft/2020-12/json-schema-core)
- [JSON Schema Draft 2020-12 Validation](https://json-schema.org/draft/2020-12/json-schema-validation)
- [RFC 8259: The JSON Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259.html)
- [RFC 3986: URI Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986.html) and [RFC 6570: URI Template](https://www.rfc-editor.org/rfc/rfc6570.html)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)

## Issues Found

- The OpenAPI YAML example omitted the required root `info` object. Added a minimal `title` and `version` so the example is a structurally valid OpenAPI 3.2 document.
- The integer-boundary guidance assumed that `minimum` and `maximum` are integers. JSON Schema permits non-integral numeric bounds for integer instances, so the guidance now distinguishes integral bounds and uses `ceil`/`floor` to select integer neighbors for non-integral bounds. It also clarifies that exact rational arithmetic is internal and emitted JSON numbers must be finite decimals.
- The `enum` and `uniqueItems` mutation rows could accidentally violate sibling constraints or array cardinality. Qualified the enum values against sibling constraints and made the duplicate mutation preserve cardinality.
- The `additionalProperties: false` row said that only declared properties are allowed, overlooking names matched by adjacent `patternProperties`. Corrected both the valid and negative cases to follow Draft 2020-12 evaluation rules.
- The composition guidance assumed every targeted instance is constructible. Qualified it with “where representable” because tautological, duplicate, contradictory, or unreachable branches can make a requested mutation impossible.
- The discriminator guidance did not account for its non-validating `allOf` form or for OAS 3.2 `defaultMapping`, which can handle otherwise unmapped values. Corrected the expected test behavior while preserving the rule that schemas determine validity.
- The parameter-serialization paragraph listed only four OAS parameter locations and overgeneralized the schema-mode fields. It now limits `style`, `explode`, and `allowReserved` to applicable `schema`-based serialization and covers OAS 3.2 `in: querystring`, which must use `content` for the whole query string.

## Review Notes

- OpenAPI 3.2.0 is the latest published OAS version as of 2026-08-24. The official latest-version page identifies it as published on 2025-09-19.
- The YAML and JSON examples are syntactically valid, and the JSON body satisfies the example request schema after the OpenAPI root metadata fix.
- The claims about full-document reference parsing, dialect precedence, type-specific keyword applicability, optional `format` assertion, Unicode code-point lengths, composition semantics, directional `readOnly` handling, media-type testing, and response-status contracts are accurate for the cited versions.
- All external documentation links in the post resolved to the intended official specification sections during review.
