# How to Diagnose Missing Python Request Logs with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Logging, Troubleshooting

Description: Trace missing Python request logs through logger levels, propagation, handler replacement, and worker startup without confusing export with trace correlation.

Startup logs arriving through OTLP prove that one logging path worked at one moment. They do not prove that request loggers use the same handlers, that the worker inherited a usable configuration, or that later framework initialization left the logging bridge attached.

Investigate a single request in one worker. Record its process ID, logger name, timestamp, and a non-sensitive probe identifier so that you can compare local output with exported records.

## Distinguish missing logs from missing trace IDs

A record may be exported without an active span. That is a correlation problem, not a missing-log problem. Conversely, adding trace IDs to console formatting does not itself guarantee OTLP delivery.

Current OpenTelemetry Python logging instrumentation installs a handler for log export. Trace-context injection into standard Python log records and formatting are separate options. `OTEL_PYTHON_LOG_CORRELATION=true` enables the formatting/correlation path; it cannot repair a disabled request logger. [Logging instrumentation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html).

Check installed versions in the same environment as the worker:

```bash
python -m pip show opentelemetry-sdk opentelemetry-distro opentelemetry-instrumentation-logging
```

Before Python SDK 1.40.0, auto logging required the older `OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED=true` setting. Current releases use the logging instrumentation package, with its handler enabled by default unless `OTEL_PYTHON_LOG_AUTO_INSTRUMENTATION=false`. Match the configuration to the installed release. [Python agent configuration](https://opentelemetry.io/docs/zero-code/python/configuration/).

## Inspect the logger chain inside the request worker

Run this diagnostic after the application's final logging configuration and again from the affected request path. Supply the real logger name:

```python
import logging
import os


def inspect_logger(name):
    logger = logging.getLogger(name)
    print("pid", os.getpid(), "logger", name,
          "info_enabled", logger.isEnabledFor(logging.INFO))
    node = logger
    while node is not None:
        print("node", node.name or "root",
              "disabled", node.disabled,
              "level", logging.getLevelName(node.level),
              "propagate", node.propagate)
        for handler in node.handlers:
            print("handler", type(handler).__module__,
                  type(handler).__name__,
                  "level", logging.getLevelName(handler.level),
                  "filters", len(handler.filters))
        if not node.propagate:
            break
        node = node.parent


inspect_logger("myapp.requests")
logging.getLogger("myapp.requests").warning("otel-request-probe")
```

Use `print` here to avoid depending on the broken export route. Compare the request logger with a logger whose startup message arrived.

A logger's effective level can prevent record creation. Once propagation begins, ancestor handlers' levels and filters matter; ancestor logger levels are not reapplied to the propagated record. `propagate=False` ends the route to parent handlers. A console handler at that boundary does not also export via a root OpenTelemetry handler. [Python logging reference](https://docs.python.org/3/library/logging.html).

The probe uses `WARNING` to distinguish an INFO threshold from a completely broken route. Test the application's intended level after restoring the route.

## Look for configuration changes after bootstrap

Search the application and server setup for `dictConfig`, `fileConfig`, `basicConfig(force=True)`, handler removal, and named logger settings. A framework can configure logging after the agent has installed its handler.

A full `dictConfig` can replace handlers. Its `disable_existing_loggers` option defaults to true when omitted, which can disable existing non-root loggers that are not named by the configuration. Setting it to false addresses that disabling behavior; it does not by itself preserve an OpenTelemetry handler replaced by the root configuration. [Logging configuration reference](https://docs.python.org/3/library/logging.config.html).

Choose one startup owner for the final logging graph. Ensure the final graph includes the exporter handler on the path used by request loggers, following the installed instrumentation's documented setup. Avoid repeated reinstrumentation in request handlers or blindly attaching another exporter, which can produce duplicate records. Restart to verify the corrected initialization order.

## Test export separately from the backend

In an isolated reproduction, keep the same launcher and application initialization but use a console log exporter:

```bash
OTEL_LOGS_EXPORTER=console OTEL_TRACES_EXPORTER=none OTEL_METRICS_EXPORTER=none opentelemetry-instrument python app.py
```

This command assumes `app.py` runs your reproduction. For a real server, preserve its worker launcher and send a request; a successful startup-only probe is insufficient. If the console exporter sees request records, investigate the OTLP route and backend filters. If only the ordinary console handler sees them, inspect the logging graph again.

Compare workers individually, especially after forks, reloads, or preloading. Restore OTLP, verify a request record in the backend, then verify its trace ID inside an active sampled request. Treat worker lifecycle, log delivery, and correlation as separate checks with separate evidence.
