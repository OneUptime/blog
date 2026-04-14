# Validation Summary: How to Configure OPA Policy Middleware for Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Open Policy Agent (OPA)
- Rego policy language
- Kubernetes (Deployment and Service manifests)
- Dapr HTTP middleware pipeline

## Sources Consulted
- Dapr OPA middleware component reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-opa/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- OPA Rego language reference (the `in` keyword): https://www.openpolicyagent.org/docs/latest/policy-language/#membership-and-iteration-in
- OPA REST API (Policy and Data APIs): https://www.openpolicyagent.org/docs/latest/rest-api/
- Sibling blog post `posts/2026-03-31-dapr-opa-middleware/README.md` for cross-reference of inline Rego package conventions

## Issues Found

### Issue 1: Inline Rego policy used wrong package name
- **What was wrong:** The inline Rego policy embedded in the Dapr Component spec used `package http.authz`. Dapr's OPA middleware queries `data.http.allow` by default, which requires the Rego package to be `http` (not `http.authz`). Using `http.authz` would place the `allow` rule at `data.http.authz.allow`, which the middleware would never find, causing all requests to be denied.
- **What was changed:** Changed `package http.authz` to `package http` in the inline component configuration.
- **Why:** The standalone Rego policy loaded into an external OPA server correctly uses `package http.authz` because the `opaEndpoint` URL (`/v1/data/http/authz/allow`) maps to that path. But for the inline evaluation within the Dapr sidecar, the default query path is `data.http.allow`, requiring `package http`.

### Issue 2: Rego `in` keyword incorrectly used on a string value
- **What was wrong:** The standalone Rego policy used `"admin" in input.request.headers["x-user-roles"]`. The Rego `in` operator only works on collections (arrays, sets, or object keys) — it does not work on strings. Since Dapr passes header values as strings, this expression would evaluate as undefined, causing the rule body to fail. This means DELETE requests would always be denied, even for users with the `admin` role, contradicting the stated test expectation.
- **What was changed:** Changed `"admin" in input.request.headers["x-user-roles"]` to `input.request.headers["x-user-roles"] == "admin"` for an exact string match.
- **Why:** The `in` keyword in Rego is designed for membership testing in arrays, sets, and object keys. For string comparison, the equality operator `==` is the correct approach.

## Review Notes
- The standalone Rego policy section ("Writing a Rego Policy") retains `package http.authz` because it is loaded into an external OPA server where the endpoint URL `/v1/data/http/authz/allow` correctly maps to that package path. Only the inline policy in the Dapr Component spec was changed to `package http`.
- The `opaEndpoint` metadata field is shown as an alternative to inline Rego. If using an external OPA server, the inline `rego` field should not be set simultaneously — the blog could be clearer about this mutual exclusivity, but as written (presented as alternatives) it is not technically incorrect.
- The Kubernetes Deployment for OPA uses `openpolicyagent/opa:latest` — in production, pinning to a specific version tag is recommended to avoid unexpected breaking changes.
- The `includedHeaders` field is important: headers not listed there will not appear in `input.request.headers`. The blog correctly includes `x-user-roles` in the `includedHeaders` list, which is necessary for the policy to work.
