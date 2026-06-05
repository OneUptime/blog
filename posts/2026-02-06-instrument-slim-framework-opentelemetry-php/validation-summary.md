# Validation Summary: How to Instrument Slim Framework with OpenTelemetry in PHP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PHP
- Slim Framework 4
- OpenTelemetry PHP API and SDK
- OpenTelemetry OTLP exporter
- OpenTelemetry semantic conventions
- W3C Trace Context propagation
- Composer
- PDO and cURL examples

## Sources Consulted
- OpenTelemetry PHP instrumentation documentation: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry PHP propagation documentation: https://opentelemetry.io/docs/languages/php/propagation/
- OpenTelemetry PHP resources documentation: https://opentelemetry.io/docs/languages/php/resources/
- OpenTelemetry PHP getting started documentation: https://opentelemetry.io/docs/languages/php/getting-started/
- OpenTelemetry PHP API docs for `BatchSpanProcessor`: https://open-telemetry.github.io/opentelemetry-php/classes/OpenTelemetry-SDK-Trace-SpanProcessor-BatchSpanProcessor.html
- OpenTelemetry PHP API docs for `SpanBuilderInterface`: https://open-telemetry.github.io/opentelemetry-php/classes/OpenTelemetry-API-Trace-SpanBuilderInterface.html
- OpenTelemetry PHP OTLP exporter README: https://github.com/opentelemetry-php/exporter-otlp
- OpenTelemetry HTTP semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- Slim Framework 4 documentation: https://www.slimframework.com/docs/v4/
- Slim Framework 4 middleware documentation: https://www.slimframework.com/docs/v4/concepts/middleware.html
- Slim Framework 4 routing middleware documentation: https://www.slimframework.com/docs/v4/middleware/routing.html

## Issues Found
- The setup commands omitted packages needed by the examples: semantic convention constants, a PSR HTTP client/factory implementation for the OTLP exporter, and phpdotenv for the `.env` snippet. Added `open-telemetry/sem-conv`, `guzzlehttp/guzzle`, and `vlucas/phpdotenv`.
- The bootstrap used outdated or incorrect OpenTelemetry PHP setup APIs, including `ResourceAttributes`, `HttpTransportFactory::create()`, `new BatchSpanProcessor($exporter)`, and `Globals::registerInitializer(...)`. Updated it to current semantic convention classes, `OtlpHttpTransportFactory`, `BatchSpanProcessor::builder($exporter)->build()`, and `Sdk::builder()->buildAndRegisterGlobal()`.
- Incoming trace context extraction was described but not implemented; it always returned the current context. Replaced it with `TraceContextPropagator::getInstance()->extract($request->getHeaders())`.
- Several span attributes used deprecated semantic convention names such as `http.method`, `http.url`, `http.status_code`, `http.host`, `http.user_agent`, `net.peer.ip`, `db.system`, and `db.operation`. Updated them to current HTTP, URL, client, server, and database attribute names.
- Database and outbound HTTP spans were always created with `SpanKind::KIND_INTERNAL`. Updated the tracing helper to accept a span kind and used `SpanKind::KIND_CLIENT` for database and external API work.
- The Slim middleware setup added error middleware before routing/tracing middleware. Reordered it so routing middleware is added before error middleware and error middleware is added last, matching Slim 4 guidance and LIFO middleware execution.
- The `.env` example included sampler variables that the manual bootstrap did not consume. Removed them to avoid implying they affect the shown setup.
- The batch processor tuning snippet passed `null` for the required clock and used `512` as the export timeout. Updated it to use `Clock::getDefault()` and the default 30000 ms timeout.

## Review Notes
Local execution was not possible because `php` and `composer` are not installed in this workspace, so validation was performed against official documentation and API references. The sample still intentionally uses simplified PDO, cURL, and custom middleware examples rather than full automatic instrumentation packages.
