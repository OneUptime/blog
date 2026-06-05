# Validation Summary: How to Disable Noisy Auto-Instrumentation Libraries to Reduce Data Volume

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry auto-instrumentation
- OpenTelemetry Python instrumentation
- OpenTelemetry JavaScript/Node.js instrumentation
- OpenTelemetry Java agent
- Redis, SQLAlchemy, Flask, Express, PostgreSQL instrumentation
- ClickHouse-style SQL trace analysis

## Sources Consulted
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Python Redis instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/redis/redis.html
- OpenTelemetry Python Threading instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/threading/threading.html
- OpenTelemetry Python system metrics instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/system_metrics/system_metrics.html
- OpenTelemetry Python system metrics entry point source: https://github.com/open-telemetry/opentelemetry-python-contrib/blob/main/instrumentation/opentelemetry-instrumentation-system-metrics/pyproject.toml
- OpenTelemetry JavaScript zero-code configuration: https://opentelemetry.io/docs/zero-code/js/configuration/
- OpenTelemetry Java agent suppressing specific instrumentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java agent instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry instrumentation scope specification: https://opentelemetry.io/docs/specs/otel/common/instrumentation-scope/
- OpenTelemetry semantic conventions for OTel scope attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/otel/

## Issues Found
- The span-count query used deprecated `otel.library.name`. Updated it to `otel.scope.name`, which is the current instrumentation scope attribute.
- The Python SQLAlchemy example said it configured a filter to skip health-check queries, but no filter was shown. Reworded the comment to accurately describe enabling SQLAlchemy tracing.
- The Python Redis `request_hook` example used the wrong callback signature. Current Redis instrumentation passes `(span, instance, args, kwargs)`. Updated the example to define a proper hook.
- The Python Redis example claimed the hook skipped PING/INFO/CONFIG spans, but Redis hooks run inside an already-created span and do not suppress it. Changed the wording to say health-check commands are labeled for later filtering.
- The Python disabled-instrumentations example used `system-metrics`, but the current entry point name is `system_metrics`. Updated the environment variable value.
- The Python comment said threading instrumentation creates spans for thread operations. Current OpenTelemetry Python threading instrumentation propagates context and does not create telemetry by itself, so the comment was corrected.
- The Java environment-variable example used invalid or obsolete instrumentation names: `JDBC_STATEMENT`, `EXECUTOR`, `JAVA_NIO`, and `SERVLET_FILTER`. Replaced them with current Java agent names and supported controller/view telemetry settings.
- The Java properties-file example used invalid or non-current instrumentation names: `java-net`, `reactor-core`, `kafka-clients`, and singular `executor`. Replaced them with `netty`, `reactor`, `kafka`, and `executors`.

## Review Notes
- Python `threading` instrumentation is technically valid, but it propagates context and does not create spans by itself, so disabling it will not directly reduce span volume.
- Java agent controller and view telemetry are disabled by default in current documentation; keeping the explicit false settings is harmless but may be redundant.
