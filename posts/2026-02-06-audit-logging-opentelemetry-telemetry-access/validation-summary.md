# Validation Summary: How to Set Up Audit Logging for OpenTelemetry Telemetry Access

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector authentication extensions
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector Elasticsearch exporter
- Elasticsearch audit logging
- OpenSearch audit logging
- Grafana Enterprise audit logging
- Jaeger Query
- NGINX reverse proxy logging and HTTP Basic Authentication
- Amazon S3 Object Lock

## Sources Consulted
- OpenTelemetry Collector configuration and authentication docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filelog receiver docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- OpenTelemetry Collector Elasticsearch exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/elasticsearchexporter
- OpenTelemetry Collector Basic Auth extension docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/basicauthextension
- Elasticsearch auditing settings docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/auditing-settings.html
- Elasticsearch audit ignore policy docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/audit-log-ignore-policy.html
- OpenSearch audit logs docs: https://docs.opensearch.org/latest/security/audit-logs/index/
- Grafana audit logging docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/audit-grafana/
- NGINX logging docs: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- NGINX HTTP Basic Authentication docs: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
- Amazon S3 Object Lock docs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html

## Issues Found
- The Collector client identity section referred to the `headers_setter` extension, but the shown configuration uses the OIDC authenticator and does not use `headers_setter`. Updated the heading and explanation to describe authentication extensions accurately.
- The Collector logging section overstated what internal logs capture, including pipeline changes and established connections. Updated the wording to reflect collector startup, component lifecycle, configuration loading errors, and emitted authentication or receiver errors.
- The Elasticsearch audit snippet used `ignore_filters` as if it selected telemetry indices, but Elasticsearch ignore filters suppress matching audit events. Removed that filter and added guidance to filter telemetry audit events downstream.
- The Elasticsearch/OpenSearch section implied the same `xpack.security.audit.*` settings apply to OpenSearch. Updated the text to clarify that OpenSearch uses Security plugin audit settings instead.
- The Grafana audit logging snippet included an undocumented `[auditing.logs.filters]` stanza and action names. Removed that stanza and used the documented `log_datasource_query_request_body` option for data source query bodies.
- The Grafana snippet claimed Loki logging was Grafana's internal database. Corrected the comment to describe a Loki-compatible endpoint.
- The NGINX snippet was marked as YAML and placed `log_format` inside `server`, but `log_format` belongs in the HTTP context. Changed the code fence to `nginx` and wrapped the server in an `http` block.
- The audit Collector snippet referenced `basicauth/audit` without defining or loading the extension. Added a `basicauth/audit` client authenticator and listed it under `service.extensions`.
- The audit integrity section described Elasticsearch append-only indices as preventing deletion. Updated the guidance to distinguish S3 Object Lock WORM retention from Elasticsearch index privileges.
- The S3 Object Lock example was labeled as a bucket policy and used an invalid `Rules` array shape. Updated it to a valid Object Lock configuration using `ObjectLockEnabled` and `Rule.DefaultRetention`.

## Review Notes
Grafana and Elasticsearch audit logging availability depends on product edition or subscription level. The examples remain illustrative and require production-specific hardening, such as TLS settings, credential storage, log retention policy, and downstream redaction for request bodies that may contain sensitive data.
