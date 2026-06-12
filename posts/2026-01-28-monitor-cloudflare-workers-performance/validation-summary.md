# Validation Summary: How to Monitor Cloudflare Workers Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cloudflare Workers
- Cloudflare Workers Metrics and Analytics
- Cloudflare GraphQL Analytics API
- Workers Analytics Engine
- Wrangler configuration
- Analytics Engine SQL API
- OpenTelemetry / OTLP over HTTP
- TypeScript
- Server-Timing headers
- Cloudflare KV and D1 health checks

## Sources Consulted
- Cloudflare Workers Metrics and Analytics: https://developers.cloudflare.com/workers/observability/metrics-and-analytics/
- Cloudflare GraphQL Analytics API Workers metrics tutorial: https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/
- Cloudflare Workers Analytics Engine get started: https://developers.cloudflare.com/analytics/analytics-engine/get-started/
- Cloudflare Workers Analytics Engine SQL API: https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- Cloudflare Workers Analytics Engine SQL aggregate functions: https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/aggregate-functions/
- Cloudflare Workers OpenTelemetry export documentation: https://developers.cloudflare.com/workers/observability/exporting-opentelemetry-data/
- Cloudflare Workers Context API / waitUntil: https://developers.cloudflare.com/workers/runtime-apis/context/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The GraphQL example used `String!` for Cloudflare GraphQL scalar variables and requested `durationP50` / `durationP99` fields. Cloudflare's Workers metrics GraphQL examples use the lowercase `string` scalar, and the documented Workers invocation quantile fields include CPU and wall time. Updated the query to use lowercase string variables and `wallTimeP50` / `wallTimeP99`.
- The Analytics Engine examples wrote request, error, and custom metric rows with different blob layouts but queried them as if they shared the same schema. Added an event type as the first blob (`request`, `error`, `custom`) and updated the SQL queries to filter by event type and use the corrected blob positions.
- The Analytics Engine SQL examples used `COUNT()`, `AVG()`, and unweighted quantiles without accounting for Analytics Engine sampling. Updated counts, averages, and p99 latency to use `_sample_interval` and `quantileExactWeighted`, matching Cloudflare's documented guidance.

## Review Notes
- The custom OpenTelemetry exporter is a simplified educational OTLP/HTTP JSON example. Cloudflare also provides first-party OpenTelemetry export configuration through Workers Observability destinations, currently for traces and logs, while custom metrics export is not yet supported through that feature.
- The request timing examples use wall-clock timing (`Date.now()`), which is suitable for application latency phases but does not measure Cloudflare CPU time directly.
