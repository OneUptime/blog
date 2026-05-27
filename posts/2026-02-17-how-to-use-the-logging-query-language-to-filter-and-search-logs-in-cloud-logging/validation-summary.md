# Validation Summary: How to Use the Logging Query Language to Filter and Search Logs in Cloud Logging

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Logging
- Logging query language
- Logs Explorer
- Google Cloud CLI (`gcloud logging`)
- Log sinks, exclusion filters, and logs-based metrics

## Sources Consulted
- Google Cloud Logging query language documentation: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Google Cloud Logging LogEntry and HttpRequest API reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
- Google Cloud Logging monitored resource types: https://docs.cloud.google.com/logging/docs/api/v2/resource-list
- Google Cloud SDK reference for `gcloud logging sinks create`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud SDK reference for `gcloud logging sinks update`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/update
- Google Cloud SDK reference for `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create

## Issues Found
- Logging query comments used `#`, which is not the documented comment syntax for Logging filters. Changed query-comment lines to `--`, matching the official query language examples.
- The `textPayload=~"error.*timeout.*\d+ seconds"` regex example used an unescaped regex backslash in a Logging query string. Changed it to `\\d+`, matching the escaping style used in Google examples and elsewhere in the post.
- The HTTP latency example used `httpRequest.latency.seconds>5`, but `httpRequest.latency` is a Duration field. Changed it to `httpRequest.latency>"5s"`.
- The `gcloud logging metrics create` example used `--log-filter` without `--description`. The current `gcloud` reference requires `--description` when creating a simple counter metric with `--log-filter`. Added a description flag.
- The performance tip claimed the `:` operator is faster than regex in general. Google documentation is more nuanced and recommends `SEARCH` for efficient text search. Reworded the tip to recommend simpler searches and `SEARCH` where appropriate, while reserving regex for pattern matching.

## Review Notes
The main query language syntax, boolean operators, severity ordering, resource type examples, log name URL encoding, timestamp examples, `sample(insertId, 0.1)`, sink creation, and sink exclusion command were consistent with official Google Cloud documentation. Local `gcloud` was not installed in the review environment, so CLI checks were performed against the official Google Cloud SDK reference documentation.
