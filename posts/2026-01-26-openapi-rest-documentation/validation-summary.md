# Validation Summary: How to Document REST APIs with OpenAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenAPI 3.0.3
- Swagger UI
- ReDoc / Redoc CE
- Redocly CLI
- Node.js and Express
- @apidevtools/swagger-parser
- OpenAPI Generator CLI
- TypeScript, Python, and Go client generation
- YAML, JSON, and Mermaid diagrams

## Sources Consulted
- OpenAPI Specification v3.0.3: https://spec.openapis.org/oas/v3.0.3.html
- Swagger UI configuration documentation: https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/
- Redoc CE HTML element documentation: https://redocly.com/docs/redoc/deployment/html
- Redocly migration guide from swagger-cli: https://redocly.com/docs/cli/guides/migrate-from-swagger-cli
- APIDevTools swagger-cli repository deprecation notice: https://github.com/APIDevTools/swagger-cli
- @apidevtools/swagger-parser package documentation: https://www.npmjs.com/package/@apidevtools/swagger-parser
- OpenAPI Generator CLI installation documentation: https://openapi-generator.tech/docs/installation/
- OpenAPI Generator usage documentation: https://openapi-generator.tech/docs/usage/
- OpenAPI Generator typescript-fetch generator documentation: https://openapi-generator.tech/docs/generators/typescript-fetch/

## Issues Found
- The validation section used `@apidevtools/swagger-cli`, which is deprecated by its maintainers. Replaced the install, validation, and bundle commands with the recommended Redocly CLI equivalents: `npm install -g @redocly/cli`, `redocly lint --extends=minimal openapi.yaml`, and `redocly bundle openapi.yaml --output bundled-openapi.yaml`.

## Review Notes
- The OpenAPI examples use OpenAPI 3.0.3 syntax, so `nullable: true` is appropriate. In OpenAPI 3.1, nullable values are represented with JSON Schema type unions instead.
- The generated TypeScript client example is representative of OpenAPI Generator's `typescript-fetch` output, but exact request parameter names can vary with generator version and spec details.
