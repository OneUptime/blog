# Validation Summary: How to Implement APISIX Plugins for API Key Authentication and Request Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache APISIX
- APISIX Admin API
- APISIX Ingress Controller CRDs
- Kubernetes Secrets and ConfigMaps
- APISIX key-auth plugin
- APISIX logging plugins: http-logger, file-logger, syslog, tcp-logger, kafka-logger, clickhouse-logger, log-rotate

## Sources Consulted
- Apache APISIX key-auth plugin documentation: https://apisix.apache.org/docs/apisix/3.10/plugins/key-auth/
- Apache APISIX Ingress Controller ApisixConsumer documentation: https://apisix.apache.org/docs/ingress-controller/1.8.0/concepts/apisix_consumer/
- Apache APISIX Ingress Controller authentication tutorial: https://apisix.apache.org/docs/ingress-controller/1.8.0/tutorials/enable-authentication-and-restriction/
- Apache APISIX Ingress Controller ApisixRoute documentation: https://apisix.apache.org/docs/ingress-controller/concepts/apisix_route/
- Apache APISIX http-logger plugin documentation: https://apisix.apache.org/docs/apisix/3.10/plugins/http-logger/
- Apache APISIX file-logger plugin documentation: https://apisix.apache.org/docs/apisix/3.12/plugins/file-logger/
- Apache APISIX log-rotate plugin documentation: https://apisix.apache.org/zh/docs/apisix/3.10/plugins/log-rotate/
- Apache APISIX syslog plugin documentation: https://apisix.apache.org/docs/apisix/3.10/plugins/syslog/
- Apache APISIX tcp-logger plugin documentation: https://apisix.apache.org/docs/apisix/plugins/tcp-logger/
- Apache APISIX kafka-logger plugin documentation: https://apisix.apache.org/docs/apisix/3.14/plugins/kafka-logger/
- Apache APISIX clickhouse-logger plugin documentation: https://apisix.apache.org/docs/apisix/plugins/clickhouse-logger/
- Apache APISIX plugin phases and priority article: https://apisix.apache.org/blog/2023/12/14/apisix-plugins-priority-leaky-abstraction/
- Apache APISIX variables documentation: https://apisix.incubator.apache.org/docs/apisix/3.11/apisix-variable/

## Issues Found
- The Kubernetes `ApisixRoute` authentication examples enabled `key-auth` through the generic `plugins` list. Updated them to use the documented `authentication` block with `type: keyAuth`.
- The custom API key header example used route plugin config syntax. Updated it to the documented `authentication.keyAuth.header` field for `ApisixRoute`.
- The HTTP logger sample used second-style latency values and Unix-second `start_time`. Updated the sample to APISIX's millisecond-style values.
- The file logger section showed rotation settings under `plugin_attr.file-logger`, including unsupported `max_backups`. Updated the ConfigMap example to use the APISIX `log-rotate` plugin with documented fields.
- The syslog example used unsupported `facility` and `severity` fields. Replaced them with documented APISIX syslog fields.
- The Kafka logger example used deprecated `broker_list` string entries. Updated it to the current `brokers` array with `host` and `port` objects.
- The post claimed consumer identity is logged automatically as a nested `consumer` object. Updated the section to show how to include `$consumer_name` through a custom log format.

## Review Notes
- The post does not pin exact APISIX or APISIX Ingress Controller versions, so examples were checked against current Apache APISIX 3.x and APISIX Ingress Controller v1.8 documentation available on 2026-06-04.
- Some plugin batch processor fields are common APISIX logger options but are not always listed in every plugin's main attribute table.
