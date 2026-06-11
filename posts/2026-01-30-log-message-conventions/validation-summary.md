# Validation Summary: How to Build Log Message Conventions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Structured logging
- TypeScript
- Pino
- OpenTelemetry trace context
- OpenTelemetry semantic conventions
- ESLint
- OTLP/log processing pipelines

## Sources Consulted
- OpenTelemetry HTTP semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry exception semantic conventions for logs: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/
- OpenTelemetry error attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/error/
- OpenTelemetry service attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry deployment environment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry feature flag attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/feature-flag/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- Pino logger API documentation: https://github.com/pinojs/pino/blob/main/docs/api.md
- ESLint no-console rule documentation: https://eslint.org/docs/latest/rules/no-console
- ESLint no-restricted-syntax rule documentation: https://eslint.org/docs/latest/rules/no-restricted-syntax
- ESLint rule configuration documentation: https://eslint.org/docs/latest/use/configure/rules
- Related OneUptime blog links in the post were opened and confirmed to resolve.

## Issues Found
- The OpenTelemetry HTTP semantic convention examples used older names (`http.method`, `http.url`, `http.status_code`). Updated them to current attributes such as `http.request.method`, `url.path`, and `http.response.status_code`.
- The OpenTelemetry database examples used older names (`db.system`, `db.name`, `db.operation`, `db.statement`). Updated them to current attributes such as `db.system.name`, `db.namespace`, `db.operation.name`, and `db.query.text`.
- The error semantic convention example used deprecated/non-current fields (`error.message`, `error.stack`). Updated it to `exception.message` and `exception.stacktrace`, while keeping `error.type` where it represents error classification.
- The service metadata examples used generic fields (`service`, `environment`, `version`). Updated them to current semantic convention names: `service.name`, `deployment.environment.name`, and `service.version`.
- The feature flag attribute dictionary used `feature.flag`, which does not match the current OpenTelemetry feature flag namespace. Updated it to `feature_flag.key`.
- The ESLint configuration referenced a non-existent built-in rule (`no-template-literals-in-logs`) and used the legacy `.eslintrc.js` format. Replaced it with a current `eslint.config.js` example using built-in `no-console` and `no-restricted-syntax`.

## Review Notes
The examples are intentionally illustrative and omit application-specific type definitions such as `Payment`, `PaymentError`, and `getSuggestionForError`. That is acceptable for a conventions guide, but a production implementation should define those types and decide whether to emit OpenTelemetry resource attributes through the logging library, an OpenTelemetry log bridge, or a collector-side enrichment pipeline.
