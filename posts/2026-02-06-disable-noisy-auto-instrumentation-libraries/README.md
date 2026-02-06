# How to Disable Noisy Auto-Instrumentation Libraries (DNS, File System) to Reduce Data Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Auto-Instrumentation, Noise Reduction, Configuration

Description: Selectively disable OpenTelemetry auto-instrumentation libraries that generate excessive low-value spans for DNS lookups, file system operations, and internal calls.

OpenTelemetry auto-instrumentation is a fast path to getting traces from your services. Install a package, set some environment variables, and spans start flowing. The problem is that auto-instrumentation instruments everything, including operations that produce massive volumes of low-value telemetry.

A single HTTP request to your service might generate 3-5 useful spans (HTTP server, database query, downstream call). But with full auto-instrumentation enabled, that same request can produce 20-40 spans covering DNS lookups, TCP connections, file system reads for config files, internal gRPC health checks, and Redis PING commands.

Most of these extra spans add cost without adding debugging value.

## Identifying the Noisy Libraries

Before disabling anything, check which instrumentation libraries are generating the most spans. Query your trace backend for span counts by instrumentation library:

```sql
-- Find which instrumentation libraries generate the most spans
SELECT
    attributes['otel.library.name'] AS library,
    count() AS span_count,
    round(count() * 100.0 / (SELECT count() FROM otel_traces WHERE Timestamp > now() - INTERVAL 1 HOUR), 2) AS percentage
FROM otel_traces
WHERE Timestamp > now() - INTERVAL 1 HOUR
GROUP BY library
ORDER BY span_count DESC;
```

Common offenders include:

| Library | What it instruments | Typical span volume |
|---------|-------------------|-------------------|
| `dns` | Every DNS resolution | Very high |
| `fs` (Node.js) | File system reads/writes | Very high |
| `net` | TCP socket operations | High |
| `grpc` (for internal health checks) | All gRPC calls including probes | High |
| `redis` (for PING/health) | All Redis commands including keepalives | Medium-high |
| `http` (outgoing) | All outgoing HTTP including internal | Medium |

## Disabling in Python

Python's OpenTelemetry auto-instrumentation uses the `opentelemetry-instrument` command or programmatic setup. You can exclude specific instrumentors.

Use the `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS` environment variable to turn off noisy libraries:

```bash
# Disable specific auto-instrumentation libraries via environment variable
# Comma-separated list of instrumentor names (without the opentelemetry-instrumentation- prefix)
export OTEL_PYTHON_DISABLED_INSTRUMENTATIONS="urllib3,requests,system-metrics,threading"

# Run your service with the remaining instrumentations active
opentelemetry-instrument python app.py
```

For more granular control, configure instrumentation programmatically:

```python
# selective_instrumentation.py
# Programmatic setup gives you fine-grained control over each library
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Set up the tracer provider first
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)

# Now selectively enable only the instrumentations you want
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

# Enable Flask HTTP server instrumentation
FlaskInstrumentor().instrument()

# Enable SQLAlchemy with a filter to skip health check queries
SQLAlchemyInstrumentor().instrument()

# Enable Redis but skip PING commands
RedisInstrumentor().instrument(
    # Only trace commands that are not health checks
    request_hook=lambda span, conn, args: (
        span.set_attribute("db.redis.command", args[0])
        if args[0] not in ("PING", "INFO", "CONFIG")
        else span.update_name("redis-internal")
    ),
)

# Deliberately NOT enabling:
# - urllib3 instrumentation (creates spans for every outgoing HTTP call including health checks)
# - threading instrumentation (creates spans for every thread operation)
# - logging instrumentation (can create circular dependencies)
```

## Disabling in Node.js

Node.js auto-instrumentation is configured through the `@opentelemetry/auto-instrumentations-node` package. By default, it enables everything.

This setup selectively configures which instrumentations are active in a Node.js service:

```javascript
// tracing.js - Load this before your application code
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable DNS instrumentation - generates a span for every DNS lookup
      '@opentelemetry/instrumentation-dns': {
        enabled: false,
      },
      // Disable fs instrumentation - generates spans for every file read
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      // Disable net instrumentation - generates spans for TCP socket operations
      '@opentelemetry/instrumentation-net': {
        enabled: false,
      },
      // Keep HTTP but filter out internal requests
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (request) => {
          // Ignore health check endpoints
          const path = request.url || '';
          return path === '/health' || path === '/healthz' || path === '/ready';
        },
        ignoreOutgoingRequestHook: (options) => {
          // Ignore requests to internal infrastructure
          const hostname = options.hostname || '';
          return hostname.includes('metadata.google') ||
                 hostname.includes('169.254.169.254');
        },
      },
      // Keep Express instrumentation for route-level visibility
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      // Keep pg (PostgreSQL) for database query tracing
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
        enhancedDatabaseReporting: false,  // Skip full SQL text
      },
      // Disable gRPC if you only use it for internal health checks
      '@opentelemetry/instrumentation-grpc': {
        enabled: false,
      },
    }),
  ],
});

sdk.start();
```

## Disabling in Java

Java auto-instrumentation uses a Java agent JAR. Disable specific instrumentations through system properties or environment variables.

These environment variables control which Java instrumentations are active:

```bash
# Disable specific Java auto-instrumentations
# Each instrumentation has a property following the pattern:
# otel.instrumentation.[name].enabled=false

export OTEL_INSTRUMENTATION_COMMON_DEFAULT_ENABLED=true

# Disable JDBC internal spans (keep the top-level query span)
export OTEL_INSTRUMENTATION_JDBC_STATEMENT_ENABLED=false

# Disable internal JVM threading spans
export OTEL_INSTRUMENTATION_EXECUTOR_ENABLED=false

# Disable Java NIO file system spans
export OTEL_INSTRUMENTATION_JAVA_NIO_ENABLED=false

# Disable internal servlet filter spans (keep the top-level HTTP span)
export OTEL_INSTRUMENTATION_SERVLET_FILTER_ENABLED=false

# Run the service with the Java agent
java -javaagent:opentelemetry-javaagent.jar \
     -jar myservice.jar
```

For a more maintainable approach, put the configuration in a properties file:

```properties
# otel-instrumentation.properties
# Load with: -Dotel.javaagent.configuration-file=otel-instrumentation.properties

# Keep these enabled (high value)
otel.instrumentation.spring-web.enabled=true
otel.instrumentation.spring-webmvc.enabled=true
otel.instrumentation.jdbc.enabled=true
otel.instrumentation.jedis.enabled=true
otel.instrumentation.kafka-clients.enabled=true

# Disable these (low value, high volume)
otel.instrumentation.java-net.enabled=false
otel.instrumentation.reactor-core.enabled=false
otel.instrumentation.reactor-netty.enabled=false
otel.instrumentation.rxjava.enabled=false
otel.instrumentation.executor.enabled=false
```

## Measuring the Impact

After disabling noisy instrumentations, measure the reduction in span volume and the improvement in trace readability.

Run this query before and after to compare:

```sql
-- Compare span counts per trace before and after disabling noisy libraries
SELECT
    avg(span_count) AS avg_spans_per_trace,
    quantile(0.5)(span_count) AS median_spans_per_trace,
    quantile(0.95)(span_count) AS p95_spans_per_trace
FROM (
    SELECT TraceId, count() AS span_count
    FROM otel_traces
    WHERE Timestamp > now() - INTERVAL 1 HOUR
    GROUP BY TraceId
);
```

A well-tuned configuration typically reduces spans per trace by 60-80%, which translates directly to lower storage costs, faster queries, and traces that are actually readable.

## Recommended Starting Configuration

For most web services, start with this baseline:

**Keep enabled:** HTTP server, database client (top-level), message queue producer/consumer, downstream HTTP client calls to other services.

**Disable:** DNS, file system, TCP/net, threading/executor, internal framework middleware spans, gRPC health checks, cloud metadata requests.

Adjust from there based on what you actually query. If you never search for DNS resolution times (and you probably do not), keep that instrumentation off. If you debug file system issues regularly, turn it back on for those specific services.

The goal is not minimal instrumentation. It is useful instrumentation - every span should be something an engineer might actually look at during debugging.
