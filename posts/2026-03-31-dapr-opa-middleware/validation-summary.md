# Validation Summary: How to Use OPA (Open Policy Agent) Middleware in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Open Policy Agent (OPA)
- Rego policy language
- Dapr HTTP middleware pipeline
- YAML component and configuration definitions

## Sources Consulted
- Dapr OPA middleware reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-opa/
- Dapr OPA middleware source code: https://github.com/dapr/components-contrib/blob/main/middleware/http/opa/middleware.go
- Dapr OPA middleware metadata spec: https://github.com/dapr/components-contrib/blob/main/middleware/http/opa/metadata.yaml
- Dapr OPA middleware tests: https://github.com/dapr/components-contrib/blob/main/middleware/http/opa/middleware_test.go
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Wrong Rego package name (Critical)
- **What was wrong:** The blog used `package http.authz` in both the Component Configuration and Writing Rego Policies sections. Dapr's OPA middleware hardcodes its query as `data.http.allow`, which means the Rego package must be `package http`. Using `package http.authz` causes the middleware to fail at runtime because the result path `data.http.authz.allow` does not match the expected `data.http.allow`. This is confirmed by the Dapr source code and test suite, where `package http.authz` is explicitly tested as an error case.
- **What was changed:** Replaced `package http.authz` with `package http` in both Rego code blocks.

### 2. Deprecated CLI flag (Minor)
- **What was wrong:** The `dapr run` command used `--components-path`, which is deprecated in favor of `--resources-path`.
- **What was changed:** Replaced `--components-path` with `--resources-path`.

## Review Notes
- The `readBody` metadata field is not mentioned in the post. The Input Object section shows a `body` field in the example JSON, but by default `readBody` is `"false"` and the body will be an empty string. Readers who want to write policies based on request body content will need to set `readBody: "true"` in the component metadata. Consider adding a note about this in a future update.
- The input object also includes additional fields not shown in the blog: `path_parts` (array of path segments), `raw_query` (raw query string), `query` (parsed query parameters map), and `scheme` (URL scheme). These may be useful for policy writers.
- Header keys in Go's `http.Header` are canonicalized to MIME title case (e.g., `authorization` becomes `Authorization`, `x-role` becomes `X-Role`). The Component Configuration section correctly uses title case (`Authorization`), but the Writing Rego Policies section uses lowercase (`authorization`, `x-role`). The behavior depends on how Dapr's middleware passes headers to OPA — verify header key casing matches what Dapr actually provides in the input map.
- The `import future.keywords.if` and `import future.keywords.in` syntax is valid OPA v0.34+ transitional syntax. In OPA v1.0+, these keywords are available by default and the imports are unnecessary (though still accepted for backward compatibility).
