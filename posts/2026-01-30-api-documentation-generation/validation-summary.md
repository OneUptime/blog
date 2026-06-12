# Validation Summary: How to Implement API Documentation Generation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenAPI 3.0.3
- Express.js
- swagger-jsdoc
- Swagger UI / swagger-ui-express
- FastAPI
- Pydantic
- Faker.js
- Redoc
- oasdiff
- Redocly CLI
- AJV and ajv-formats
- GitHub Actions
- OpenAPI Generator
- Docker
- npm and PyPI package publishing

## Sources Consulted
- OpenAPI Specification 3.0.3: https://spec.openapis.org/oas/v3.0.3.html
- swagger-jsdoc README and concepts: https://github.com/Surnet/swagger-jsdoc
- swagger-ui-express npm package README and package source: https://www.npmjs.com/package/swagger-ui-express
- Swagger UI configuration and request snippets docs: https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/ and https://swagger.io/docs/open-source-tools/swagger-ui/customization/plug-points/
- FastAPI query parameter reference and validation docs: https://fastapi.tiangolo.com/reference/parameters/ and https://fastapi.tiangolo.com/tutorial/query-params-str-validations/
- FastAPI schema example docs: https://fastapi.tiangolo.com/tutorial/schema-extra-example/
- Pydantic Field and migration docs: https://pydantic.dev/docs/concepts/fields/ and https://pydantic.dev/articles/pydantic-v2
- Redoc configuration docs: https://redocly.com/docs/redoc/config
- AJV JSON Schema and options docs: https://ajv.js.org/json-schema.html and https://ajv.js.org/options.html
- oasdiff CLI documentation: https://www.oasdiff.com/docs/getting-started and https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md
- OpenAPI Generator installation and Docker image docs: https://openapi-generator.tech/docs/installation/ and https://hub.docker.com/r/openapitools/openapi-generator-cli
- GitHub Actions official action READMEs for actions/checkout, actions/setup-node, actions/upload-artifact, and peaceiris/actions-gh-pages
- npm package metadata for @faker-js/faker, @redocly/cli, randexp, swagger-jsdoc, swagger-ui-express, and deep-diff

## Issues Found
- The Express route sample referenced `router`, `authenticate`, `requireAdmin`, and `userService` without declaring them. Added minimal imports, router creation, and `module.exports = router`.
- The FastAPI/Pydantic sample used deprecated `Field(example=...)` extra keyword usage and `Query(regex=...)`. Updated field examples to `json_schema_extra`, changed `regex` to `pattern`, added `ConfigDict`, and removed unused FastAPI imports.
- The FastAPI route sample referenced Pydantic models and `user_service` without imports. Added the missing imports.
- The example generator called an undefined `generateFromPattern()` method and did not propagate recursion depth through `$ref` resolution. Added `randexp` usage and passed depth through `generateForSchema()`.
- The versioned documentation deprecation middleware was registered after the versioned routes and matched `/v.../` instead of the documented `/docs/<version>` routes. Moved it before the routes and updated the path match.
- The changelog generator called missing `compareResponses()`, `compareSchemas()`, and `compareSecuritySchemes()` methods. Added those methods.
- The changelog generator imported unused packages and used `deep-diff`, whose npm package is deprecated. Replaced it with Node's built-in `isDeepStrictEqual`.
- The changelog generator comment said removed required parameters are breaking, but the code classified all removed parameters as modifications. Updated the classification to treat removed required parameters as breaking.
- The GitHub Actions workflow used `npx oasdiff`, but `oasdiff` is not published as an npm package under that name. Replaced it with the documented Docker-based CLI invocation.
- The example validation script only checked singular `example` fields and skipped named OpenAPI `examples`. Added helper functions that validate both forms.
- The SDK generation workflow passed release tags directly into package versions, which can fail for tags like `v1.2.3`. Added shell normalization to strip a leading `v`.

## Review Notes
- JavaScript fenced snippets were syntax-checked with `node --check`.
- Python fenced snippets were syntax-checked with `python3 -m py_compile`.
- Some snippets still assume project-specific files such as middleware, services, npm scripts, and OpenAPI specs exist, which is appropriate for a guide but should be adapted in a real project.
