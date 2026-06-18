# Validation Summary: How to Implement API Design-First Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenAPI 3.1
- Redocly CLI
- OpenAPI Generator CLI
- Stoplight Prism CLI
- Docker Compose
- Express
- express-openapi-validator
- Supertest
- GitHub Actions
- Redoc

## Sources Consulted
- OpenAPI Specification 3.1.0: https://spec.openapis.org/oas/v3.1.0.html
- OpenAPI Initiative overview: https://www.openapis.org/
- Redocly CLI documentation: https://redocly.com/docs/cli
- Redocly CLI configuration documentation: https://redocly.com/docs/cli/configuration
- Redocly built-in rules documentation: https://redocly.com/docs/cli/rules/built-in-rules
- Redocly build-docs command documentation: https://redocly.com/docs/cli/commands/build-docs
- Redocly Redoc CE CLI deployment documentation: https://redocly.com/docs/redoc/deployment/cli
- express-openapi-validator standard guide: https://cdimascio.github.io/express-openapi-validator-documentation/guide-standard/
- OpenAPI Generator typescript-fetch documentation: https://openapi-generator.tech/docs/generators/typescript-fetch/
- Stoplight Prism CLI documentation: https://docs.stoplight.io/docs/prism/beeaad4dc0227-prism-cli

## Issues Found
- The Redocly configuration filename was shown as `.redocly.yaml`, but current Redocly documentation uses `redocly.yaml` as the default project configuration file. Updated the filename in text and the snippet comment.
- The Redocly `preview-docs` command is not present in the current Redocly CLI command list. Replaced those examples with the current `build-docs` command.
- The contract testing example used the older `OpenAPIValidator.install(app, ...)` API and implied the validator could be attached after importing an already-built Express app. Updated it to reference the documented `OpenApiValidator.middleware(...)` setup and note that it must be installed before routes.
- The CI example used `redocly diff`, which is not available in the current Redocly CLI command list. Replaced it with a valid `redocly bundle` command so the workflow remains executable.

## Review Notes
- The OpenAPI example was linted with the current Redocly CLI and is structurally valid. Redocly emitted warnings for tutorial-oriented example URLs and a missing license field, but those do not make the example invalid.
- OpenAPI `format: decimal` is an implementation-specific format. OpenAPI 3.1 allows tools to ignore unrecognized formats and fall back to the base type, but teams that need exact decimal handling should confirm support in their chosen generators and validators.
