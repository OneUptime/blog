# Validation Summary: How to Build an Interactive Production Debugging Notebook Using Jupyter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Jupyter Notebook
- OpenTelemetry traces
- Requests
- pandas
- Matplotlib
- Trace backend query APIs

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3.12/library/datetime.html
- OpenTelemetry Python documentation: https://opentelemetry.io/docs/languages/python/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Protocol file exporter examples: https://opentelemetry.io/docs/specs/otel/protocol/file-exporter/
- pandas DataFrame resample documentation: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.resample.html
- pandas GroupBy named aggregation documentation: https://pandas.pydata.org/pandas-docs/stable/user_guide/groupby.html
- pandas Series quantile documentation: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Series.quantile.html
- pandas plotting boxplot documentation: https://pandas.pydata.org/docs/reference/api/pandas.plotting.boxplot.html
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime OpenAPI reference: https://oneuptime.com/reference/openapi

## Issues Found
- The notebook used `datetime.utcnow()`, which is deprecated in Python 3.12. Changed it to `datetime.now(timezone.utc)` and updated timestamp conversions to create timezone-aware UTC datetimes.
- The dependency install line included `opentelemetry-api` and `opentelemetry-sdk`, but the notebook only queries an existing trace backend and does not use those packages. Removed them from the install command.
- The example configured `TRACE_API_URL` as `https://otel.oneuptime.com/api/v1`, but OneUptime's official telemetry ingestion endpoint is documented as `https://oneuptime.com/otlp`, and the public OpenAPI reference does not document the shown `GET /traces` query endpoint. Changed the URL to a backend-specific placeholder.
- The Requests calls returned `response.json()` without checking HTTP errors. Added `response.raise_for_status()` before parsing the response body.

## Review Notes
The trace-query response shape in the code is intentionally backend-specific. OpenTelemetry's OTLP JSON representation uses fields such as `startTimeUnixNano` and `endTimeUnixNano`, while many trace backends expose simplified query API responses. Future versions could make the sample more portable by adding a small adapter for the selected backend's trace schema.
