# Validation Summary: How to Set Up Uptrace as an OpenTelemetry Backend

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Uptrace
- OpenTelemetry and OTLP
- OpenTelemetry Collector
- Docker Compose
- ClickHouse
- PostgreSQL
- Redis
- Python
- Flask
- OpenTelemetry Python SDK and Flask instrumentation

## Sources Consulted
- Uptrace Getting Started: https://uptrace.dev/get
- Uptrace Docker deployment guide: https://uptrace.dev/get/hosted/docker
- Uptrace installation guide: https://uptrace.dev/get/hosted/install
- Uptrace configuration reference: https://uptrace.dev/get/hosted/config
- Uptrace OpenTelemetry Collector ingestion guide: https://uptrace.dev/ingest/collector
- Uptrace example Docker Compose and configuration files: https://github.com/uptrace/uptrace/tree/master/example/docker
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- Docker Compose CLI documentation: https://docs.docker.com/reference/cli/docker/compose/up/

## Issues Found
- The Docker Compose example used an outdated Uptrace image and omitted Redis, which current self-hosted Uptrace requires for caching and session management. Updated the Uptrace image to `uptrace/uptrace:2.0.3`, added Redis, and adjusted dependency health checks.
- The Compose example mounted `uptrace.yml` to `/etc/uptrace/uptrace.yml`, but current Uptrace defaults to `/etc/uptrace/config.yml`. Updated the mount path accordingly.
- The Compose port mapping used old internal Uptrace ports. Updated the web UI mapping to `14318:80` and OTLP/gRPC mapping to `14317:4317`, matching the current container listener defaults.
- The Uptrace configuration used older top-level ClickHouse and project keys. Replaced them with current `ch_cluster`, `site.url`, `site.ingest_url`, `redis_cache`, and `seed_data` configuration fields.
- The retention example used `ch_schema.ttl_delete` fields that do not match the current documented Docker retention configuration. Updated the example to use `ch.retention.ttl`.
- The OpenTelemetry Collector exporter pointed to `localhost:14317`, which would be wrong when the Collector runs inside the Docker Compose network. Updated it to `uptrace:4317`.
- The Uptrace DSN example used a path-style project id. Updated it to the current DSN shape with a project token and `?grpc=14317`.
- The Python section said the sample Flask application sent traces and metrics, but the code only configured a trace exporter and Flask tracing instrumentation. Updated the text to say it sends traces.
- The architecture diagram and explanatory text omitted Redis. Added Redis as a cache/session dependency.

## Review Notes
- YAML snippets were parsed successfully, and the Docker Compose snippet passed `docker compose config`.
- The Python code block was checked for syntax validity. Runtime execution was not performed because the local environment does not have the OpenTelemetry Python packages installed.
