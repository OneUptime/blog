# Validation Summary: How to Handle HCP Terraform Rate Limits

## Status
validated

## Post Type
Tutorial / Guide — practical guidance with bash and Python code samples for handling HCP Terraform API rate limits.

## Technologies Covered
- HCP Terraform (formerly Terraform Cloud) API v2
- HTTP rate limiting (429 responses, rate-limit headers)
- Bash / curl
- Python (`requests` library)
- jq for JSON parsing
- JSON:API specification (`application/vnd.api+json` content type)
- HCP Terraform Notification Configurations (webhooks)

## Sources Consulted
- HCP Terraform API documentation overview: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
- HCP Terraform rate limiting docs: https://developer.hashicorp.com/terraform/cloud-docs/api-docs#rate-limiting
- HCP Terraform notification-configurations API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations
- HCP Terraform workspace notification triggers: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
- HCP Terraform run status reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run

## Issues Found

1. **Rate limit scope was wrong.** The post stated limits "apply per API token". HashiCorp's documentation explicitly says rate limits are applied **per user, not per token** (so multiple tokens do not raise the limit), and that unauthenticated requests are rate-limited per requesting IP address. Updated the wording in the "Understanding HCP Terraform Rate Limits" section accordingly.

2. **Inaccurate response-header claims.** The post asserted that `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers are all returned, and specifically claimed `X-RateLimit-Reset` is "a Unix timestamp when limit resets". HashiCorp's documentation only references the single `x-ratelimit-limit` header (and only mentions it in the context of triggering a lower rate-limited response). The format of `X-RateLimit-Reset` (seconds vs. timestamp) is not documented at all. Reworked the "Detecting Rate Limits" example to match the documented behavior — kept the inspection pattern but removed the unverified header claims.

3. **Incorrect 429 response body example.** The post showed `"status": "429"` (string) with `"title": "too many requests"` (lower-case) and a non-existent `Retry-After: 1` line. The actual documented response uses an integer `status: 429`, a `title: "Too many requests"` (sentence case), and a `detail: "You have exceeded the API's rate limit."` field; no `Retry-After` header is documented. Corrected the example to match the official documentation.

## Review Notes

- The Python `_request` method still uses `response.headers.get("Retry-After", backoff)` with a fallback. This is defensive — if HCP Terraform does not return a `Retry-After` header, the client falls back to its own exponential backoff. Left as-is.
- The "Monitoring Rate Limit Usage" script parses `x-ratelimit-remaining`, which is not officially documented. The script uses `${REMAINING:-0}` so it does not crash, but it may not report useful data if the header is absent. Left unchanged because the pattern is still illustrative and the script degrades safely.
- All API endpoint paths (`/organizations/{org}/workspaces`, `/workspaces/{id}/vars`, `/workspaces/{id}/notification-configurations`, `/runs/{id}`), the pagination query params (`page[number]`, `page[size]`, max page size 100), the run status values (`applied`, `planned_and_finished`, `discarded`, `errored`, `canceled`, `force_canceled`), notification destination type `generic`, and notification triggers `run:completed` / `run:errored` were all verified against the current HCP Terraform API docs and are correct.
- The JSON:API `Content-Type: application/vnd.api+json` and `Authorization: Bearer ...` header usage are correct.
- The advice about polling intervals (3–5 seconds minimum) and preferring webhooks over polling is sound general guidance and consistent with HashiCorp's own recommendations.
