# Validation Summary: How to Implement API Catalog

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- NestJS
- TypeScript
- OpenAPI / Swagger Parser
- GraphQL.js
- Elasticsearch
- Semantic versioning
- GitHub Actions
- Spectral CLI
- curl, jq, yq
- Python, JavaScript, Go code examples

## Sources Consulted
- NestJS Controllers documentation: https://docs.nestjs.com/controllers
- NestJS Exception Filters / built-in HTTP exceptions: https://docs.nestjs.com/exception-filters
- Elasticsearch Create Index API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create
- Elasticsearch completion field / suggester documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/completion
- API DevTools Swagger Parser documentation: https://apidevtools.com/swagger-parser/options.html
- GraphQL.js utilities documentation: https://www.graphql-js.org/api-v16/utilities/
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub-hosted runner customization documentation: https://docs.github.com/actions/using-github-hosted-runners/customizing-github-hosted-runners
- Stoplight Spectral CLI documentation: https://docs.stoplight.io/docs/spectral/9ffa04e052cc1-spectral-cli
- npm semver documentation: https://docs.npmjs.com/cli/v6/using-npm/semver/

## Issues Found
- The registration service imported an unused/nonexistent `APISpecification` type and used `APIMetadata` without importing it. Updated the import to use `APIMetadata`, `RegistrationResult`, and `APIFormat`.
- The registration controller returned an object containing `HttpStatus.BAD_REQUEST`, which would not set an actual NestJS 400 response. Replaced it with `BadRequestException` and removed the redundant success `statusCode` field, relying on NestJS POST default 201 behavior.
- The parser catch block accessed `error.message` directly, which is unsafe under modern TypeScript because catch variables are `unknown`. Added an `instanceof Error` guard.
- The implementation advertised enabled gRPC and AsyncAPI registration while the parser only implemented OpenAPI and GraphQL. Restricted the code-level `APIFormat` examples to OpenAPI and GraphQL and clarified that gRPC/AsyncAPI need dedicated parsers before being enabled.
- The Elasticsearch autocomplete code used a completion suggester against the `name` text field. Added a `nameSuggest` field with `type: completion`, populated it during indexing, and pointed the suggester at that field.
- The Elasticsearch index was initialized from the constructor without awaiting the async operation. Changed the indexer to implement NestJS `OnModuleInit` and await index creation during module initialization.
- The `endpoints` mapping used `nested` fields while the search query used ordinary `multi_match` field paths. Changed the mapping to a regular object field so `endpoints.path` and `endpoints.summary` work with the shown query.
- The documentation service referenced undefined documentation types. Imported and reused the catalog `Endpoint`, `Parameter`, `RequestBody`, `Response`, and `Schema` types where appropriate.
- The generated Python example embedded JSON directly as Python source, which breaks for JSON booleans and nulls. Updated it to use `json.loads(...)`.
- The generated Go example attempted to create a `map[string]interface{}` from raw JSON text, which breaks for nested objects and arrays. Updated it to send a JSON byte slice as the request body.
- The GitHub Actions example sent an OpenAPI JSON object while the registration API expected `specification` to be a string. Updated the payload to JSON-encode the converted OpenAPI document as a string with `jq -Rs`.
- The workflow trigger included `api/schema.graphql` even though the job only validated and registered `api/openapi.yaml`. Removed the GraphQL path from that OpenAPI-specific workflow.
- A versioning comment said "removed required parameters" while the code detects removed parameters generally. Updated the comment to match the implementation.

## Review Notes
The post is now technically consistent as a conceptual implementation guide. Some examples remain intentionally simplified, such as OpenAPI path-level parameter merging, GraphQL mutation/subscription extraction, generated example authentication schemes, and complete metadata-store implementations.
