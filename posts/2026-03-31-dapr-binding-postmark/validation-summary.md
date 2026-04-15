# Validation Summary: How to Use Dapr Postmark Binding for Transactional Email

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Output Bindings API
- Postmark transactional email service
- Kubernetes Secrets
- TypeScript / Node.js fetch API
- curl (CLI)

## Sources Consulted
- Dapr Postmark binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/postmark/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr components-contrib source code (postmark binding): https://github.com/dapr/components-contrib/blob/main/bindings/postmark/postmark.go

## Issues Found

### 1. Incorrect metadata field names: `toEmail` and `fromEmail`
- **What was wrong:** The post used `toEmail` and `fromEmail` as request metadata field names throughout all examples (curl commands and TypeScript code).
- **What was changed:** Replaced all occurrences with the correct field names `emailTo` and `emailFrom`, which match the Dapr Postmark binding's actual metadata keys as defined in the source code and official documentation.
- **Why:** Using the wrong field names would cause the binding to fail at runtime because the required `emailTo` and `emailFrom` fields would be missing.

### 2. Fabricated template support via `templateId`
- **What was wrong:** The "Send Using a Template" section claimed the Dapr Postmark binding supports server-side templates via a `templateId` metadata field. The binding has no template support whatsoever — the source code contains zero references to templates or templateId.
- **What was changed:** Replaced the entire section with a "Send an Email with CC and BCC" section demonstrating the `emailCc` and `emailBcc` metadata fields, which are actually supported by the binding.
- **Why:** The `templateId` feature does not exist in the Dapr Postmark binding. While the Postmark API itself supports templates, the Dapr binding does not expose this functionality. The `data` field must always be an HTML string, not a JSON object of template variables.

### 3. Summary section referenced non-existent template feature
- **What was wrong:** The summary paragraph mentioned "HTML body or template ID" as invocation options.
- **What was changed:** Removed the "or template ID" reference.
- **Why:** Consistent with the removal of the fabricated template support section.

## Review Notes
- The component YAML configuration (apiVersion, kind, spec structure, `accountToken` and `serverToken` field names) is correct.
- The Dapr HTTP API path `/v1.0/bindings/<name>` and the `"operation": "create"` usage are correct.
- The TypeScript code is syntactically correct and uses a valid pattern for invoking Dapr bindings via the HTTP API.
- The Postmark binding also supports setting default values for `emailFrom`, `emailTo`, `subject`, `emailCc`, and `emailBcc` at the component level, which can be overridden per-request. The post does not mention this but it is not an error.
