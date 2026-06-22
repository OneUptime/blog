# Validation Summary: How to Collect Application Logs with Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Grafana Alloy
- Promtail
- LogQL
- Node.js, Winston, Pino, pino-http, Express
- Python logging, structlog, FastAPI
- Go, Zerolog, Zap, Gin
- Java, Spring Boot, Logback, logstash-logback-encoder
- Kubernetes Deployments

## Sources Consulted
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Promtail documentation and EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Promtail installation documentation: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Promtail JSON stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/
- Grafana Promtail labels stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Promtail timestamp stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/timestamp/
- Grafana Promtail output stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/output/
- Grafana Loki LogQL query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki label cardinality documentation: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- pino-http documentation: https://github.com/pinojs/pino-http
- Pino API documentation: https://github.com/pinojs/pino/blob/main/docs/api.md
- Python logging documentation: https://docs.python.org/3/library/logging.html
- structlog documentation: https://www.structlog.org/en/stable/
- Zerolog package documentation: https://pkg.go.dev/github.com/rs/zerolog
- Zap package documentation: https://pkg.go.dev/go.uber.org/zap
- Gin custom middleware documentation: https://gin-gonic.com/en/docs/middleware/custom-middleware/
- logstash-logback-encoder documentation: https://github.com/logfellow/logstash-logback-encoder
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- Promtail is EOL as of March 2, 2026. Updated prerequisites and the Promtail section title to treat Promtail examples as legacy and point new deployments toward Grafana Alloy or another supported shipper.
- The pino-http redaction paths used `req.*` after renaming the emitted request key to `request`. Updated the redaction paths to match the configured `customAttributeKeys`.
- The structlog middleware bound contextvars, but the structlog processor chain did not merge contextvars into log events. Added `structlog.contextvars.merge_contextvars`.
- The custom Python JSON formatter expected `record.extra`, but Python's `extra` argument adds attributes directly to the `LogRecord`. Updated the formatter to copy non-reserved record attributes and replaced `datetime.utcnow()` with timezone-aware UTC timestamps.
- The FastAPI middleware assumed `request.client` is always present. Updated it to handle a missing client safely.
- The Go Zerolog and Zap snippets mixed library package examples with `main()` usage and omitted imports or variables. Reworked them into standalone `main.go` examples that compile as shown.
- The Spring `OncePerRequestFilter` override called `filterChain.doFilter` without declaring `ServletException` and `IOException`, and combined `@Component` with explicit filter registration. Added the required throws clause and removed the duplicate component annotation.
- The Java structured argument helper `kv` was used without identifying its source. Added the static import from `logstash-logback-encoder`.
- The JavaScript Loki Push API client computed nanosecond timestamps using `Number`, which exceeds JavaScript's safe integer range. Switched to `BigInt` before converting the timestamp to the string required by Loki's Push API.
- The Kubernetes Deployment snippets omitted the required `spec.selector` and matching pod template labels. Added selectors and labels to both Deployment examples.
- The sidecar example pinned an old Promtail image. Updated it to `grafana/promtail:3.6.0`, matching current Grafana Promtail installation documentation while retaining the legacy warning context.
- The conclusion referred only to Promtail pipelines. Updated it to say supported log shipper pipelines.

## Review Notes
Promtail configuration examples remain useful for existing installations, but new Loki log collection should use Grafana Alloy or another supported client because Promtail is now EOL. The direct Loki Push API examples are technically valid for simple applications, but production clients should also handle retry/backoff and failed batch requeueing.
