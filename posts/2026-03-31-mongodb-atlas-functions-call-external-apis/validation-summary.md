# Validation Summary: How to Call External APIs from Atlas Functions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas App Services (Atlas Functions)
- `context.http` built-in HTTP client module
- `context.values.get()` for Values/Secrets management
- `context.services.get()` for MongoDB data source access
- EJSON global module
- Atlas Database Triggers (change events)
- Stripe API (form-encoded POST example)
- Slack Incoming Webhooks
- GitHub REST API

## Sources Consulted
- MongoDB Atlas App Services Functions documentation: https://www.mongodb.com/docs/atlas/app-services/functions/
- MongoDB Atlas Functions context reference: https://www.mongodb.com/docs/atlas/atlas-ui/triggers/functions/context/
- MongoDB Atlas Functions global modules (EJSON, timers): https://www.mongodb.com/docs/atlas/atlas-ui/triggers/functions/globals/
- MongoDB Atlas Functions JavaScript support: https://www.mongodb.com/docs/atlas/atlas-ui/triggers/functions/javascript-support/
- MongoDB Community Forums on `context.http` header format and deprecation
- Stripe API documentation for payment intents endpoint

## Issues Found

### 1. Misleading section heading: "POST Request with JSON Body"
- **What was wrong:** The section was titled "POST Request with JSON Body" but the code uses `Content-Type: application/x-www-form-urlencoded` with a form-encoded body string for the Stripe API, not a JSON body.
- **What was changed:** Renamed the heading to "POST Request with Form-Encoded Body" to accurately reflect the code content.

### 2. Summary incorrectly claims "exponential backoff"
- **What was wrong:** The summary stated "implement exponential backoff for rate-limited APIs" but the actual code example in the "Handling Rate Limits" section implements linear retry using the `Retry-After` header value, not exponential backoff (there is no increasing delay between attempts).
- **What was changed:** Updated the summary to say "implement retry logic with backoff for rate-limited APIs" to accurately describe the pattern shown.

## Review Notes
- **Deprecation of `context.http`**: MongoDB deprecated the `context.http` third-party HTTP service as part of the broader Atlas App Services deprecation (announced September 2024). The recommended replacement is the `fetch` API or `axios`. Atlas Triggers with embedded functions remain supported, but standalone Atlas Functions and `context.http` specifically were deprecated with a deadline of November 1, 2024. The post does not mention this deprecation, which could mislead readers into building on a deprecated API. A deprecation notice at the top of the post would be valuable.
- **`EJSON.parse()` vs `JSON.parse()` for external APIs**: The post uses `EJSON.parse()` to parse responses from external REST APIs (GitHub, Stripe, CRM). While this works because EJSON is a superset of JSON, `JSON.parse()` would be more idiomatic for standard JSON responses. `EJSON.parse()` can interpret `$`-prefixed keys (like `$date`, `$oid`) as BSON type annotations, which could theoretically cause unexpected behavior if an external API response contains such keys.
- **`setTimeout` in Atlas Functions**: The rate-limit retry example uses `setTimeout` via `await new Promise(r => setTimeout(r, retryAfter))`. While `setTimeout` is available in Atlas Functions, it counts against the function's execution timeout (300 seconds for triggers). This is a valid pattern but readers should be aware of the time constraints.
- **HEAD method omission**: The summary states `context.http` supports "GET, POST, PUT, PATCH, and DELETE" but `context.http.head()` is also available. Minor omission.
