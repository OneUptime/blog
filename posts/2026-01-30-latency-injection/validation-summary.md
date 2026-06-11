# Validation Summary: How to Implement Latency Injection

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Node.js and Express middleware
- Python async/sync decorators and FastAPI path operations
- Go `net/http` client transports and `RoundTripper`
- Istio `VirtualService` HTTP fault injection
- Linkerd ServiceProfiles, HTTPRoute-based fault injection patterns, retries, and timeouts
- Axios request timeouts
- PostgreSQL `pg_sleep`
- Node.js PostgreSQL `pg` pool wrapping
- Prometheus `prom-client` metrics
- Circuit breaker and graceful degradation patterns

## Sources Consulted
- Express 5.x API documentation: https://expressjs.com/en/api/
- Express body-parser middleware documentation: https://expressjs.com/en/resources/middleware/body-parser/
- FastAPI path operation documentation: https://fastapi.tiangolo.com/tutorial/path-operation-configuration/
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Istio fault injection task documentation: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Linkerd ServiceProfiles reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd fault injection task documentation: https://linkerd.io/2-edge/tasks/fault-injection/
- Linkerd HTTPRoute reference: https://linkerd.io/2-edge/reference/httproute/
- Linkerd timeouts reference: https://linkerd.io/2-edge/reference/timeouts/
- Axios instance and timeout documentation: https://axios-http.com/docs/instance
- Axios cancellation documentation: https://axios-http.com/docs/cancellation
- PostgreSQL date/time function documentation for `pg_sleep`: https://www.postgresql.org/docs/current/functions-datetime.html
- `prom-client` project documentation: https://github.com/siimon/prom-client
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The Express admin endpoint used `req.body` without installing JSON body parsing middleware. Added `app.use(express.json());` so `req.body` is populated for JSON requests.
- The Go example called `log.Printf` but did not import the `log` package. Added the missing import so the snippet is syntactically complete.
- The service mesh overview overstated Linkerd support for direct latency injection. Updated the wording to distinguish Istio's built-in HTTP delay faults from Linkerd's fault-injection pattern of routing traffic to a fault-injecting backend.
- The Linkerd section incorrectly described ServiceProfiles as including latency injection and labeled a timeout example as a delay injection example. Updated the heading, explanation, and comments to describe ServiceProfile timeouts accurately and point latency injection toward HTTPRoute/fault-backend routing.
- The instrumented Express middleware was defined as an instance method that would lose `this` if passed directly to `app.use`. Changed it to a `middleware()` factory returning an async Express middleware, matching the earlier example's working pattern.

## Review Notes
- Several examples are illustrative snippets and assume surrounding application definitions such as `fetchOrders`, `fetch_orders_from_database`, Redis clients, and Axios imports in later JavaScript sections.
- Linkerd ServiceProfiles are still supported for backwards compatibility, but current Linkerd documentation notes they have been superseded by Gateway API resources for per-route metrics, retries, and timeouts.
