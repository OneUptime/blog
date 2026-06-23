# Validation Summary: OneUptime Embraces Open Standards: Complete OpenAPI 3.0 Specification Now

## Status
validated

## Post Type
Company update / announcement (with developer-facing code examples and CLI commands)

## Technologies Covered
- OpenAPI 3.0 specification
- OpenAPI Generator (`openapi-generator` / `@openapitools/openapi-generator-cli`)
- Swagger UI (`swagger-ui-serve`)
- OneUptime REST API
- Client SDK generation (Python, Go, TypeScript, Java, C#, PHP)

## Sources Consulted
- OpenAPI Generator – CLI installation & usage: https://openapi-generator.tech/docs/installation/ and https://openapi-generator.tech/docs/usage/
- `@openapitools/openapi-generator-cli` npm package: https://www.npmjs.com/package/@openapitools/openapi-generator-cli
- `swagger-ui-serve` npm package: https://www.npmjs.com/package/swagger-ui-serve
- OneUptime OpenAPI spec endpoint (live): https://oneuptime.com/api/openapi/spec (returns valid OpenAPI 3.0.0 document)
- OneUptime API reference page: https://oneuptime.com/reference/openapi
- OneUptime documentation: https://oneuptime.com/docs
- OneUptime support page: https://oneuptime.com/support

## Issues Found
1. **Incorrect specification download URL.** The post referenced `https://oneuptime.com/api/openapi.json`, which returns HTTP 404. The live, valid endpoint is `https://oneuptime.com/api/openapi/spec` (confirmed to return an OpenAPI 3.0.0 document). Fixed in the `curl` command in the "Access the Specification" section and in the "Get Involved" download link.
2. **Non-resolving documentation/API subdomain.** The post linked to `https://docs.oneuptime.com/api` and `https://docs.oneuptime.com`. The `docs.oneuptime.com` host does not resolve. Changed the interactive-docs link to the actual API reference at `https://oneuptime.com/reference/openapi`, and the documentation link to `https://oneuptime.com/docs`.
3. **Broken community link.** `https://oneuptime.com/community` returns HTTP 404. Repointed it to the live support hub `https://oneuptime.com/support` and updated the anchor text accordingly.

## Review Notes
- All CLI tooling referenced is accurate: `npx swagger-ui-serve <spec>`, `npm install -g @openapitools/openapi-generator-cli`, and the `openapi-generator(-cli) generate -i ... -g ... -o ...` syntax (including the `python`, `go`, `typescript`, `java`, `csharp`, and `php` generators) all match current official documentation. The `-i`/`-g`/`-o` flags are correct.
- The claim of SDK generation in "20+ programming languages" is conservative — OpenAPI Generator supports far more than 20 generators — so it remains accurate.
- The locally-downloaded filename `oneuptime-openapi.json` is used consistently across the generator commands; only the source URL it is fetched from was corrected, so those commands remain valid.
- The live spec confirms OpenAPI version 3.0.0, consistent with the post's "OpenAPI 3.0" claim.
- Future-enhancement items (WebSocket/GraphQL/gRPC, Postman/Insomnia, plugin marketplace) are forward-looking statements, not verifiable technical claims, and were left unchanged.
