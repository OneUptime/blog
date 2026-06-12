# Validation Summary: How to Create Capacity Reports

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Python dataclasses
- Python type hints
- NumPy
- Python-Markdown
- WeasyPrint
- APScheduler cron triggers
- Mermaid diagrams

## Sources Consulted
- Python `typing` documentation: https://docs.python.org/3/library/typing.html
- Python `dataclasses` documentation: https://docs.python.org/3/library/dataclasses.html
- Python `statistics.NormalDist` documentation: https://docs.python.org/3/library/statistics.html
- Mermaid XY chart syntax documentation: https://mermaid.ai/open-source/syntax/xyChart.html
- Python-Markdown Tables extension documentation: https://python-markdown.github.io/extensions/tables/
- WeasyPrint API reference: https://doc.courtbouillon.org/weasyprint/stable/api_reference.html
- APScheduler CronTrigger documentation: https://apscheduler.readthedocs.io/en/3.x/modules/triggers/cron.html

## Issues Found
- The `CapacityReport` example used `Dict[str, any]`. In Python, `any` is the built-in function, not the type hint for arbitrary values. Changed it to `Dict[str, Any]` and imported `Any` from `typing`.
- The forecast confidence interval logic only returned a correct z-score for `0.95`; every other confidence level used the 90% z-score. Replaced it with `statistics.NormalDist().inv_cdf((1 + confidence_level) / 2)` and added validation that the confidence level is between 0 and 1.
- The forecast residual calculation used the point index as the elapsed time, while the regression model used elapsed days from timestamps. Changed residual prediction to use elapsed days so hourly or irregularly spaced data is handled consistently.
- The `capacity_exhaustion_date()` method accepted a `current_capacity` argument that was documented as absolute capacity but never used. Removed the unused parameter and updated call sites to pass `threshold=100`.
- The `_to_pdf()` method was annotated as returning `bytes` but ended with `pass`, so PDF distribution would upload and email `None`. Implemented PDF generation with WeasyPrint's `HTML(string=...).write_pdf()` API and added an explicit runtime error when WeasyPrint is not installed.

## Review Notes
The examples still assume application-specific `MetricsClient`, `EmailClient`, and `StorageClient` implementations. That is acceptable for this guide, but a future revision could make the placeholders explicit before the complete example.
