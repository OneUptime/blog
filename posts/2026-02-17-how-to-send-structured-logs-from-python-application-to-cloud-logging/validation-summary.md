# Validation Summary: How to Send Structured Logs from a Python App to Cloud Logging Using the

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Logging
- Python
- Python standard logging module
- google-cloud-logging Python client library
- Cloud Run
- GKE integrated logging
- Cloud Logging query language
- Cloud Logging log-based metrics
- Cloud Trace correlation

## Sources Consulted
- Google Cloud: Setting Up Cloud Logging for Python: https://docs.cloud.google.com/logging/docs/setup/python
- Google Cloud Python client library: Integration with logging Standard Library: https://docs.cloud.google.com/python/docs/reference/logging/latest/std-lib-integration
- Google Cloud Python client library: Logger class and log_struct: https://docs.cloud.google.com/python/docs/reference/logging/latest/google.cloud.logging_v2.logger.Logger
- Google Cloud Python client library: Client class, setup_logging, list_entries, and metric: https://docs.cloud.google.com/python/docs/reference/logging/latest/google.cloud.logging_v2.client.Client
- Google Cloud Python client library: Metric class: https://docs.cloud.google.com/python/docs/reference/logging/latest/metric
- Google Cloud: Structured logging: https://docs.cloud.google.com/logging/docs/structured-logging
- Google Cloud Run: Logging and viewing logs: https://docs.cloud.google.com/run/docs/logging
- Google Cloud: Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud Python client library: Automatic Trace/Span ID Extraction: https://docs.cloud.google.com/python/docs/reference/logging/latest/auto-trace-span-extraction

## Issues Found
- The standard-library structured logging example passed a raw dictionary as the log message. Current `google-cloud-logging` documentation recommends using `extra={"json_fields": data_dict}` or logging a JSON-parsable string. Updated the example and surrounding text to use `json_fields`.
- The `setup_logging()` explanation implied every log call is sent to Cloud Logging. The default handler captures INFO and higher and respects configured levels, so the text now says logs are sent when they meet the configured log level.
- The trace-correlation example placed `logging.googleapis.com/trace` inside `json_fields`. For the Python standard-library integration, trace is a supported LogEntry metadata field through `extra={"trace": trace}`. Updated both trace log calls accordingly.
- The custom formatter used `datetime.datetime.utcnow()`, which is deprecated in modern Python. Replaced it with timezone-aware UTC timestamps using `datetime.datetime.now(datetime.timezone.utc).isoformat()`.
- Cloud Run wording referred to a log agent. Cloud Run documentation describes integrated logging, so the text now uses "integrated logging".
- The query example claimed to find results "in the last hour" while using a fixed timestamp. Updated the comment to say it finds results since the specified timestamp.

## Review Notes
The code examples were syntax-checked with Python AST parsing. The post title appears incomplete, but this is an editorial issue rather than a technical correctness issue.
