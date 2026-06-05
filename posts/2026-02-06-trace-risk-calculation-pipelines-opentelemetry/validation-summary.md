# Validation Summary: How to Trace Risk Calculation Pipelines with OpenTelemetry Span Attributes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API
- Python
- Credit scoring pipelines
- Market risk and Value at Risk calculations
- Liquidity Coverage Ratio assessment

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry common specification concepts for attributes and attribute limits: https://opentelemetry.io/docs/specs/otel/common/
- OpenTelemetry trace API specification for span status behavior: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python API source for `Span.set_status` accepting `Status` or `StatusCode`: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/trace/span.py
- Federal Reserve Liquidity Coverage Ratio FAQs: https://www.federalreserve.gov/supervisionreg/topics/liquidity-coverage-ratio-faqs.htm
- GAO summary of the U.S. Liquidity Coverage Ratio rule: https://www.gao.gov/products/gao-15-177r

## Issues Found
- The `market_risk.py` snippet used `trace.get_tracer("risk.market")` without importing `trace`. Added `from opentelemetry import trace` so the standalone snippet is technically complete.
- The `liquidity_risk.py` snippet used `trace.get_tracer("risk.liquidity")` without importing `trace`. Added `from opentelemetry import trace` so the standalone snippet is technically complete.

## Review Notes
The OpenTelemetry span attribute examples use valid custom attributes and supported primitive attribute value types. The `span.set_status(trace.StatusCode.ERROR, "...")` usage is valid with the current Python API because `set_status` accepts either a `Status` object or a `StatusCode`, although the official instrumentation guide commonly demonstrates `Status(StatusCode.ERROR)`. The LCR formula and 1.0 minimum align with the 100 percent minimum liquidity coverage ratio over a 30-calendar-day stress period for covered institutions; the example keeps `horizon_days` parameterized for pipeline tracing.
