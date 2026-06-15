# Validation Summary: How to Create Swagger Documentation for Node.js APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Express.js
- OpenAPI 3.0
- Swagger UI
- swagger-jsdoc
- swagger-ui-express
- express-openapi-validator
- js-yaml

## Sources Consulted
- swagger-jsdoc README: https://github.com/Surnet/swagger-jsdoc
- swagger-ui-express README: https://github.com/scottie1984/swagger-ui-express
- express-openapi-validator standard guide: https://cdimascio.github.io/express-openapi-validator-documentation/guide-standard/
- express-openapi-validator validateRequests docs: https://cdimascio.github.io/express-openapi-validator-documentation/usage-validate-requests/
- Swagger/OpenAPI 3.0 authentication docs: https://swagger.io/docs/specification/v3_0/authentication/
- OpenAPI Specification 3.0.1: https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.1.md
- js-yaml README: https://github.com/nodeca/js-yaml

## Issues Found
- The description said schemas were generated automatically, but the tutorial uses `swagger-jsdoc` to generate an OpenAPI specification from JSDoc annotations. Updated the description to avoid implying runtime schema inference.
- The introduction said "Swagger (now OpenAPI)", which conflated Swagger tooling with the OpenAPI Specification. Updated the wording to describe Swagger UI as tooling built around OpenAPI.
- The OpenAPI response status keys in YAML examples were unquoted. OpenAPI 3.0 states status code fields should be quoted for JSON/YAML compatibility, so the examples now use quoted status keys such as `"200"`.
- The CI generation script required `js-yaml` but the post did not install it. Added `npm install js-yaml` before the script.
- The validation section said errors are automatically handled. `express-openapi-validator` passes validation errors into Express error handling, so the comment now points to the explicit error handler shown in the snippet.
- The summary implied documentation stays in sync automatically. Updated it to say colocated annotations make it easier to keep documentation in sync.

## Review Notes
The examples use CommonJS, which matches the published CommonJS examples for the referenced packages. `swagger-jsdoc` currently documents Node.js 20.x or higher as a system requirement for v6, so projects on older Node.js versions may need to pin or verify package compatibility.
