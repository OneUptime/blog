# Validation Summary: How to Deploy Zipkin for Trace Collection via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Zipkin (openzipkin/zipkin, openzipkin/zipkin-mysql, openzipkin/zipkin-dependencies Docker images)
- Portainer / Docker Compose
- MySQL (Zipkin storage backend)
- Spring Boot 3.x with Micrometer Tracing (micrometer-tracing-bridge-brave, zipkin-reporter-brave)
- Python with py_zipkin and OpenTelemetry Zipkin exporter (Flask)
- Zipkin HTTP API (v2)

## Sources Consulted
- Zipkin server README (env vars, storage backends, health endpoint): https://github.com/openzipkin/zipkin/blob/master/zipkin-server/README.md
- Zipkin Dependencies (Apache Spark batch job semantics): https://github.com/openzipkin/zipkin-dependencies
- py_zipkin source — `SimpleHTTPTransport` signature: https://github.com/Yelp/py_zipkin/blob/master/py_zipkin/transport.py
- Spring Boot tracing reference: https://docs.spring.io/spring-boot/reference/actuator/tracing.html
- Spring Boot common application properties index (confirmed `management.zipkin.tracing.endpoint` and `management.tracing.sampling.probability`)
- OpenTelemetry Python Zipkin JSON exporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/exporter/opentelemetry-exporter-zipkin-json/src/opentelemetry/exporter/zipkin/json/__init__.py
- Zipkin HTTP API (v2) reference: https://zipkin.io/zipkin-api/zipkin2-api.yaml

## Issues Found
1. **Incorrect `QUERY_LOOKBACK` comment** — The comment claimed `QUERY_LOOKBACK=604800000` would "keep spans for 7 days". `QUERY_LOOKBACK` only controls how far back the query API looks from `endTs`; actual retention is governed by the storage backend. Changed the comment to reflect that retention must be configured separately on the backend.
2. **`zipkin-dependencies` with `restart: unless-stopped`** — `openzipkin/zipkin-dependencies` is a one-shot Apache Spark batch job that exits after processing the day's spans. Using `restart: unless-stopped` would cause it to loop endlessly. Changed to `restart: "no"` and added a comment explaining it should be run on a schedule (cron/CronJob) near end-of-day UTC.
3. **`py_zipkin.SimpleHTTPTransport` constructor misuse** — The post called `SimpleHTTPTransport("http://zipkin:9411/api/v2/spans")` with a URL. The real signature is `SimpleHTTPTransport(address: str, port: int)` (two positional args; the path is selected internally based on encoding). Fixed the call to `SimpleHTTPTransport("zipkin", 9411)`.
4. **Spring Boot config used deprecated Spring Cloud Sleuth keys** — With the Micrometer Tracing dependencies on the pom (`micrometer-tracing-bridge-brave`, `zipkin-reporter-brave`), the `spring.zipkin.base-url`, `spring.zipkin.sender.type`, and `spring.sleuth.sampler.probability` keys do nothing (Sleuth was replaced by Micrometer Tracing in Spring Boot 3.x). Replaced with the correct modern keys: `management.zipkin.tracing.endpoint` and `management.tracing.sampling.probability`.

## Review Notes
- The MySQL v1 storage backend is officially marked "not recommended for production" in the Zipkin server README; Elasticsearch (already mentioned in the conclusion) or Cassandra are the usual production choices. The post's framing of MySQL as a production setup is a soft caveat but not factually incorrect, so it was left intact.
- `ZipkinAttrs` is imported in the Python snippet but not actually used; minor and not a correctness issue, so left alone per the scope of the review.
- All other Zipkin env vars (`STORAGE_TYPE`, `MEM_MAX_SPANS`, `MYSQL_*`, `MYSQL_MAX_CONNECTIONS`), the `/health` endpoint, the OpenTelemetry Zipkin JSON exporter import/usage, and the v2 HTTP API query paths (`/api/v2/traces`, `/api/v2/dependencies`, `/api/v2/services`, `/api/v2/trace/{id}`) were verified correct.
