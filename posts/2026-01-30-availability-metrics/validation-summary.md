# Validation Summary: How to Build Availability Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- aiohttp
- asyncio
- prometheus-client for Python
- PromQL
- SLI/SLO design
- Error budgets and burn-rate alerting
- Synthetic monitoring

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python asyncio event loop documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- aiohttp client reference: https://docs.aiohttp.org/en/stable/client_reference.html
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Python client documentation/source reference: https://github.com/prometheus/client_python
- Google SRE Workbook, Implementing SLOs: https://sre.google/workbook/implementing-slos/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The time-based availability example output was slightly incorrect for a 30-minute outage in January 2026. Updated the expected output from `99.9331%` to `99.9328%`.
- The probe-based availability snippet used `timedelta` without importing it. Added the missing import.
- Several snippets used `datetime.utcnow()`, which is deprecated as of Python 3.12. Replaced those calls with timezone-aware `datetime.now(timezone.utc)` and updated imports accordingly.
- The aiohttp probe used `asyncio.get_event_loop()` from inside a coroutine. Replaced it with `asyncio.get_running_loop()`, which the Python docs prefer in coroutines and callbacks.
- The PromQL success-rate examples classified 3xx redirects as successful in prose and code, but the PromQL numerator counted only `status_class="success"`. Updated the numerator to include both `success` and `redirect` using a PromQL regex label matcher.
- The SLO and error-budget snippets referenced `Tuple` in type annotations without importing it. Added the missing imports.
- The burn-rate alerting example did not pair the long and short windows according to the Google SRE multiwindow, multi-burn-rate pattern. Updated the implementation to use the documented 1h/5m and 6h/30m page windows, plus 24h/2h and 3d/6h ticket-level windows.
- The final dashboard example was described as a complete production-ready system even though it builds on earlier class definitions. Adjusted the wording to avoid implying the snippet is standalone.

## Review Notes
- Each Python code block was syntax-checked with `python3 -m py_compile`.
- The first uptime example was executed locally to confirm the corrected printed availability.
- The examples are illustrative and still omit production concerns such as persistence, distributed probe placement, metric cardinality controls, and concrete metrics-backend integration.
