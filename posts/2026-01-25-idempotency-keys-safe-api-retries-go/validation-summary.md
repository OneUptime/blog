# Validation Summary: How to Implement Idempotency Keys for Safe API Retries in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go net/http middleware
- Redis
- go-redis v9
- UUID idempotency keys
- HTTP idempotent method semantics

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- go-redis v9 package documentation for SetNX and Redis commands: https://pkg.go.dev/github.com/redis/go-redis/v9
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- RFC 9110 HTTP Semantics, idempotent methods: https://datatracker.ietf.org/doc/html/rfc9110#section-9.2.2
- Stripe idempotent requests documentation: https://docs.stripe.com/api/idempotent_requests
- Stripe low-level error and retry guidance: https://docs.stripe.com/error-low-level
- PayPal idempotency guidelines: https://developer.paypal.com/reference/guidelines/idempotency/
- google/uuid package documentation: https://pkg.go.dev/github.com/google/uuid

## Issues Found
- The post said Stripe, PayPal, and most payment processors require idempotency keys. This was too broad: Stripe supports idempotency through the `Idempotency-Key` header, while PayPal uses `PayPal-Request-Id`, and requirements vary by endpoint/provider. Changed the claim to say many payment processors support idempotency keys.
- The custom `responseWriter` updated `statusCode` every time `WriteHeader` was called. Go's `net/http` response semantics only allow one final 2xx-5xx header to be written, and `Write` implicitly writes `200 OK` if no status has been written. Added a `wroteHeader` guard and explicit default `WriteHeader(http.StatusOK)` in `Write`.
- The memory store could report an expired response as missing in `Get`, then reject `SetProcessing` because the expired key still existed in the map. Updated `SetProcessing` to delete expired entries before claiming the key.
- The Redis section title claimed the store was production-ready. The example is useful for distributed deployments, but a complete production payment implementation would also bind the key to a request fingerprint, define endpoint scoping, and handle operational failure modes. Renamed the section and softened the wording.
- The `main.go` snippet called an undefined `generateID` function. Added a `github.com/google/uuid` import and a small `generateID` implementation.
- The client retry loop deferred `resp.Body.Close()` inside the loop, which can keep response bodies open across retries. Changed the snippet to close each response body after it is consumed.
- The key generation guidance suggested hashing request parameters as an alternative to UUID idempotency keys. That can accidentally collapse distinct intended operations with identical payloads. Replaced it with server-side request fingerprint guidance for detecting reuse of the same key with a different payload.
- The scope guidance said to apply idempotency to all mutating operations including PUT and DELETE. RFC 9110 defines PUT and DELETE as idempotent methods. Updated the guidance to focus on non-idempotent mutating operations such as POST and PATCH while noting applications may still accept keys for replay behavior.
- The closing paragraph said the examples mirror Stripe and PayPal production patterns. Softened this to say they follow the same broad approach, because provider-specific behavior differs.

## Review Notes
The examples are appropriate for a tutorial, but a future production-focused version should add request fingerprint storage to the code, endpoint/account scoping for keys, limits on cached response size, context propagation instead of `context.Background()`, and explicit behavior for failures while saving the final response.
