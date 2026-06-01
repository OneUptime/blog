# Validation Summary: How to Use Content Moderation for User-Generated Media

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure AI Content Safety
- Azure CLI
- Azure AI Content Safety REST client library for JavaScript
- Node.js
- Express
- Multer
- fluent-ffmpeg / FFmpeg

## Sources Consulted
- Azure AI Content Safety JavaScript REST client documentation: https://learn.microsoft.com/en-us/javascript/api/overview/azure/ai-content-safety-rest-readme?view=azure-node-latest
- Azure AI Content Safety text analysis REST API reference: https://learn.microsoft.com/en-us/rest/api/contentsafety/text-operations/analyze-text?view=rest-contentsafety-2024-09-01
- Azure AI Content Safety image analysis REST API reference: https://learn.microsoft.com/en-us/rest/api/contentsafety/image-operations/analyze-image?view=rest-contentsafety-2024-09-01
- Azure CLI `az cognitiveservices account` reference: https://learn.microsoft.com/en-us/cli/azure/cognitiveservices/account?view=azure-cli-latest
- `@azure-rest/ai-content-safety` package metadata and type definitions, version 1.0.1, from npm.

## Issues Found
- **Incorrect JavaScript client import:** The CommonJS examples imported `{ ContentSafetyClient }` from `@azure-rest/ai-content-safety`, but the package exposes the client as the default export. Changed the examples to use `require('@azure-rest/ai-content-safety').default`.
- **Missing REST-client error handling helper:** The Azure SDK examples use `isUnexpected()` to detect non-success responses. Added `isUnexpected` checks to the text, image, and blocklist examples.
- **Text severity scale was incomplete:** The post stated text severity scores were 0 to 6, but the current API defaults to four levels (0, 2, 4, 6) and can return eight levels (0 through 7) when `outputType: 'EightSeverityLevels'` is requested. Updated the explanation and request body to use eight-level output.
- **Image URL request field was wrong:** The image API expects `image.blobUrl` for URL-based images, not `image.url`. Updated the image moderation example.
- **Image example relied on undefined variables/functions:** The image snippet used `client`, `findCategoryScore`, and `makeModerationDecision` without defining or importing them. Added the required imports and client initialization, and exported the shared helper functions from the text snippet.
- **Blocklist example relied on an undefined client and skipped setup:** The blocklist snippet used `client` without initializing it and attempted to add terms without ensuring the blocklist existed. Added client initialization, `isUnexpected` checks, and a `main()` function that creates the blocklist before adding items.

## Review Notes
- The Azure CLI is not installed in this workspace, so the CLI commands were checked against Microsoft Learn rather than local `az --help` output.
- The upload example still assumes application-specific `savePost` and `addToReviewQueue` functions exist; that is acceptable for a blog-level integration snippet but would need implementation in a complete sample project.
