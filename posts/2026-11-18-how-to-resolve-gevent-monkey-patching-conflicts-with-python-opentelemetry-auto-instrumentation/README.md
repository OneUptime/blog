# How to Resolve gevent Conflicts with Python OpenTelemetry Auto-Instrumentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Auto-Instrumentation, Troubleshooting

Description: Fix gevent and OpenTelemetry startup ordering, verify early monkey patching, and test the real worker lifecycle before restoring telemetry exports.

A gevent service starts warning about late SSL monkey patching after OpenTelemetry auto-instrumentation is enabled. The application may still start, but different imports can now hold different implementations of networking objects. Suppressing the warning hides the ordering problem.

The central question is which code runs first: gevent's patching, the telemetry bootstrap, or imports that load network libraries.

## Map the actual startup sequence

Record the Python, gevent, OpenTelemetry SDK, and instrumentation versions from the running environment. Inspect the service launcher, worker class, preload setting, and whether an Operator injects instrumentation.

Putting `monkey.patch_all()` at the top of an application module can be too late when auto-instrumentation bootstraps before that module. Likewise, a worker that patches after imports in the parent process may inherit already-imported network code. Compare the earliest warning with the process ID that emits it.

Gevent recommends patching early, on the main thread while the program is still single-threaded. Its documentation also notes that frameworks can perform patching themselves. Avoid assembling independent patch sequences without checking who owns startup. [Gevent monkey-patching reference](https://docs.gevent.org/api/gevent.monkey.html).

## Use the early auto-instrumentation hook

OpenTelemetry Python documents an experimental setting, available since the 1.37.0/0.58b0 release pair, that calls gevent patching before SDK initialization:

```bash
export OTEL_PYTHON_AUTO_INSTRUMENTATION_EXPERIMENTAL_GEVENT_PATCH=patch_all
opentelemetry-instrument python app.py
```

The value is the literal `patch_all`, not `true`. Ensure gevent is installed in the environment used by the launcher. The Operator documentation describes the same setting for injected Python instrumentation; set it on the instrumented workload and recreate the affected pods. [Python Operator guidance](https://opentelemetry.io/docs/zero-code/python/operator/).

The upstream bootstrap handles this option before loading the distribution, configurators, and instrumentors. It is experimental, so pin a compatible release set and retain a startup regression check. It is not a general guarantee that every dependency works with gevent. [Auto-instrumentation implementation](https://github.com/open-telemetry/opentelemetry-python-contrib/blob/main/opentelemetry-instrumentation/src/opentelemetry/instrumentation/auto_instrumentation/__init__.py).

## Run a small startup probe

Save this as `probe.py` in a disposable environment containing gevent and `opentelemetry-distro`:

```python
from gevent import monkey

for module in ("socket", "ssl", "threading"):
    patched = monkey.is_module_patched(module)
    print(module, patched)
    assert patched, f"{module} was not patched before application startup"

from opentelemetry import trace

with trace.get_tracer("gevent-startup-probe").start_as_current_span("probe"):
    pass
```

Run it with a console exporter so the check does not depend on Collector connectivity:

```bash
OTEL_PYTHON_AUTO_INSTRUMENTATION_EXPERIMENTAL_GEVENT_PATCH=patch_all OTEL_TRACES_EXPORTER=console OTEL_METRICS_EXPORTER=none OTEL_LOGS_EXPORTER=none OTEL_TRACES_SAMPLER=always_on opentelemetry-instrument python probe.py
```

Expect the three patch checks to pass and a completed `probe` span to appear. `is_module_patched` establishes current patch state; it cannot prove that no earlier import retained an original object. Keep checking for late-patching warnings and exercise the actual HTTP client path that originally failed.

For CLI configuration details and the accepted experimental option, see the [auto-instrumentation package documentation](https://github.com/open-telemetry/opentelemetry-python-contrib/blob/main/opentelemetry-instrumentation/README.rst).

## Verify the real workers

Repeat the test with the production-style worker launcher in a test deployment. A direct `python probe.py` success does not test a server's preload, fork, reload, or shutdown behavior.

Send concurrent requests through the real library stack. Confirm that the application remains responsive, outbound calls finish, and span relationships remain correct. Then test worker replacement and orderly shutdown. If the fault appears only with a specific worker or preload mode, reduce those variables individually and compare startup logs by PID.

Console export isolates startup from exporter transport. Restore the configured OTLP transport only after the worker test passes, then verify request traces arrive. Treat transport-specific hangs as a separate compatibility investigation; successful socket patching alone does not establish that a native extension or exporter is cooperative.

## Keep one documented startup contract

Record which component patches gevent, which component initializes telemetry, and the pinned versions used in the successful test. Re-run that test whenever the server, runtime, or instrumentation changes. The useful outcome is consistent startup and working requests across worker restarts, backed by observable evidence rather than a hidden warning.
