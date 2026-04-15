# Validation Summary: How to Implement API Authentication with Dapr Middleware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (middleware pipeline, HTTP middleware components)
- JWT / Bearer token authentication
- OAuth2 client credentials flow
- Go (custom middleware development)
- Python / FastAPI (application-level claim handling)
- Kubernetes (component and configuration CRDs)
- OpenTelemetry tracing

## Sources Consulted
- Dapr HTTP bearer middleware source code: https://github.com/dapr/components-contrib/tree/master/middleware/http/bearer
- Dapr OAuth2 client credentials middleware source code: https://github.com/dapr/components-contrib/tree/master/middleware/http/oauth2clientcredentials
- Dapr middleware interface definition: https://github.com/dapr/components-contrib/blob/master/middleware/middleware.go
- Dapr rate limit middleware documentation: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-rate-limit/
- Dapr middleware concept documentation: https://docs.dapr.io/concepts/middleware-concept/
- Dapr service invocation API documentation: https://docs.dapr.io/reference/api/service_invocation_api/
- FastAPI documentation for HTTPException: https://fastapi.tiangolo.com/tutorial/handling-errors/

## Issues Found

1. **Invalid `requiredClaims` metadata field in JWT bearer config**: The `middleware.http.bearer` component only supports `jwksURL`, `issuer`, and `audience` as metadata fields. `requiredClaims` does not exist. Removed the field from the YAML example.

2. **Incorrect `authStyle` value in OAuth2 config**: The `authStyle` metadata field accepts integer values (`0` = auto-detect, `1` = in params, `2` = in header), not string values like `"header"`. Changed from `"header"` to `"2"`.

3. **Incorrect `scopes` delimiter in OAuth2 config**: The `middleware.http.oauth2clientcredentials` component splits scopes on commas, not spaces. Changed `"service.read service.write"` to `"service.read,service.write"`.

4. **Missing `context.Context` in custom middleware `GetHandler` signature**: The Dapr `Middleware` interface requires `GetHandler(ctx context.Context, metadata middleware.Metadata)`. The blog post omitted the `context.Context` parameter. Added it along with the `"context"` import.

5. **`middleware.http.uppercase` mislabeled as a request logger**: The `uppercase` middleware converts the request body to uppercase and is intended only for local development testing. It is not a logging middleware. Removed this misleading third handler from the pipeline example since the section is about auth + rate limiting.

6. **False claim that Dapr bearer middleware injects JWT claims as headers**: The blog stated Dapr injects validated claims as `X-JWT-Sub`, `X-JWT-Email`, `X-JWT-Roles` headers. This is incorrect — the bearer middleware only validates the token and passes or rejects the request without modifying it. Rewrote the Python example to decode claims directly from the JWT payload, which is the correct approach after Dapr has validated the token.

7. **Invalid FastAPI response syntax**: FastAPI does not support returning `(dict, status_code)` tuples like Flask. Changed to use `raise HTTPException(status_code=403, detail="insufficient permissions")`.

8. **Test URLs bypass Dapr sidecar**: The test commands targeted `http://my-service:8080/api/profile`, which calls the app directly and bypasses the Dapr middleware pipeline entirely. Changed to `http://localhost:3500/v1.0/invoke/my-service/method/api/profile` to route through the Dapr sidecar where the middleware is applied.

## Review Notes
- The custom Go middleware example is illustrative but incomplete — a production implementation would need to implement the full component registration lifecycle (Init, Close methods) and load valid API keys from a Dapr secret store or state store rather than an in-memory map.
- The tracing configuration in the middleware chaining example is correct and a good addition showing how to combine middleware with observability.
- The `middleware.http.bearer` auto-discovers JWKS from the issuer's `/.well-known/openid-configuration` endpoint if `jwksURL` is omitted, which could be mentioned as a simplification.
