# Validation Summary: How to Set Up OpenTelemetry in a Go Fiber Application with otelfiber

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Fiber v2
- gofiber/contrib otelfiber middleware
- OpenTelemetry Go SDK
- OTLP gRPC trace exporter
- W3C trace context propagation
- database/sql context-aware operations
- OpenTelemetry net/http instrumentation with otelhttp

## Sources Consulted
- Fiber v2 Ctx API documentation: https://docs.gofiber.io/v2.x/api/ctx/
- Fiber otelfiber middleware documentation: https://docs.gofiber.io/contrib/otelfiber/
- otelfiber v2 package documentation: https://pkg.go.dev/github.com/gofiber/contrib/otelfiber/v2
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OTLP trace gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.17.0
- Go database/sql package documentation: https://pkg.go.dev/database/sql
- OpenTelemetry otelhttp package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

## Issues Found
- The post used `c.Context()` to retrieve the request context in Fiber handlers. The official otelfiber example uses `c.UserContext()` for the trace-aware context in Fiber v2, so handler examples were updated to use `c.UserContext()`.
- The middleware setup snippet used `context.WithTimeout` and `time.Second` without importing `context` and `time`. The missing imports were added.
- The custom otelfiber configuration snippet referenced `fiber.Ctx` and `attribute.KeyValue` without importing Fiber and OpenTelemetry attributes. The missing imports were added.
- The error-recording, custom span, and outbound HTTP examples had missing imports and one unused `io` import. The snippets were corrected.
- The route-group example claimed `/health` was not traced even though it was registered after global otelfiber middleware. The example now uses `otelfiber.WithNext` to skip `/health`.
- The database section claimed passing context to `database/sql` operations creates child spans. This was corrected to explain that `database/sql` uses context for cancellation, deadlines, and driver calls, while spans require instrumented database libraries or drivers.
- The span metadata list overstated panic recovery and request/response sizes as span data. It was adjusted to describe returned handler errors/error responses and request/response size metrics when metrics are enabled.
- The complete example assigned `id := c.Params("id")` without using it, which would not compile. The unused variable was removed.

## Review Notes
The post still uses `go.opentelemetry.io/otel/semconv/v1.17.0`, which is a valid semantic-convention package but not the newest available semantic-convention version. Future updates could refresh the examples to a newer OpenTelemetry Go and semantic-convention version as part of a broader versioned rewrite.
