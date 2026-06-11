# Validation Summary: How to Create JSON:API Format Implementation

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- JSON:API 1.1
- REST API design
- Node.js
- Express
- Python
- Flask
- curl

## Sources Consulted
- JSON:API 1.1 specification: https://jsonapi.org/format/
- Express 5.x API reference: https://expressjs.com/en/api/
- Flask 3.1 API documentation: https://flask.palletsprojects.com/en/stable/api/
- curl command help for `--globoff` / `-g`

## Issues Found
- The Express application snippet used `serializer.serialize(...)` in the related-resource route without importing `serializer`. Added `const serializer = require('./serializers');`.
- The JavaScript and Python header validation examples accepted invalid JSON:API media types such as `application/vnd.api+json; charset=utf-8`. Updated both examples to allow only the JSON:API 1.1 `ext` and `profile` media type parameters, while allowing `q` for `Accept` header quality negotiation.
- The header validation examples allowed requests with bodies to omit `Content-Type`. Updated them to return `415 Unsupported Media Type` when `POST`, `PATCH`, or `PUT` requests do not provide a JSON:API media type.
- The post described pagination as built in and filtering as defined by JSON:API. Adjusted wording to reflect that JSON:API standardizes pagination link names and the `sort` parameter, while filtering semantics are implementation-specific.
- The curl examples used URLs with bracketed query parameters without disabling curl URL globbing. Added `-g` to the affected commands.

## Review Notes
The examples remain illustrative and omit a concrete `ArticleService` implementation, database layer, and production-grade validation of included relationship paths. Those omissions are acceptable for the tutorial scope.
