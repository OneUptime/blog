# Validation Summary: How to Implement API Documentation Testing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenAPI 3.0.3
- JSON Schema validation
- Ajv and ajv-formats
- Schemathesis and Hypothesis
- Express middleware
- Supertest integration tests
- Redocly CLI
- GitHub Actions
- wait-on

## Sources Consulted
- OpenAPI Specification v3.0.3: https://spec.openapis.org/oas/v3.0.3.html
- Swagger OpenAPI 3.0 parameter documentation: https://swagger.io/docs/specification/v3_0/describing-parameters/
- Ajv API reference: https://ajv.js.org/api.html
- Ajv combining schemas and `$ref` documentation: https://ajv.js.org/guide/combining-schemas.html
- Ajv strict mode / unknown formats documentation: https://ajv.js.org/strict-mode.html
- ajv-formats documentation: https://ajv.js.org/packages/ajv-formats.html
- Schemathesis Python API reference: https://schemathesis.readthedocs.io/en/stable/reference/python/
- openapi-backend response validation documentation: https://openapistack.co/docs/openapi-backend/response-validation/
- Redocly CLI lint command documentation: https://redocly.com/docs/cli/commands/lint
- wait-on package documentation: https://www.npmjs.com/package/wait-on
- actions/upload-artifact documentation: https://github.com/actions/upload-artifact

## Issues Found
- The "Response Validation with openapi-backend" section imported `OpenAPIBackend` but did not use `openapi-backend` APIs. The official openapi-backend documentation validates responses through `validateResponse` in a `postResponseHandler`; the article's code manually validates with Ajv. Changed the heading to "Response Validation with Ajv" and removed the unused import.
- The first TypeScript sample had unused variables (`foundPath`, plus destructured `path` and `method`) that could fail in TypeScript projects with `noUnusedLocals` enabled. Removed those unused variables while preserving the operation lookup behavior.
- The Schemathesis example used the outdated top-level `schemathesis.from_path(..., base_url=...)` pattern. Current Schemathesis documentation loads OpenAPI files with `schemathesis.openapi.from_path(...)`; updated the example and used `case.call_and_validate(base_url=...)`.
- The Express middleware compiled schemas containing `$ref` values without registering component schemas in Ajv, which would fail for request and response schemas like `#/components/schemas/Product`. Registered component schemas with Ajv using their OpenAPI reference keys.
- The Express middleware used Ajv without `strict: false`, while the example OpenAPI schemas include OpenAPI formats such as `float`. Ajv documentation notes that unknown formats can throw during compilation in strict mode, so the middleware now matches the earlier sample by configuring `strict: false`.
- The request validation middleware only checked required query parameter presence, despite the surrounding text saying it validates requests against documented schemas. Updated the query validation to compile an object schema from documented query parameter schemas, so values such as `limit=invalid` are rejected by the middleware.

## Review Notes
The examples are still intentionally simplified. Production-grade OpenAPI request validation should also handle referenced parameters, path/header/cookie parameters, content negotiation, requestBody media types beyond `application/json`, escaped path regex generation, and OpenAPI-specific schema features through a purpose-built validator when needed.
