# Validation Summary: Debug Filebeat Missing an OpenSearch Index

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Filebeat
- OpenSearch
- Logstash
- OpenTelemetry
- Data Prepper
- systemd and journald
- TLS and HTTP APIs

## Sources Consulted

- [OpenSearch tools and ingestion compatibility matrices](https://docs.opensearch.org/latest/tools/)
- [OpenSearch Resolve Index API](https://docs.opensearch.org/latest/api-reference/index-apis/resolve-index/)
- [OpenSearch data streams](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [OpenSearch Cluster Settings API](https://docs.opensearch.org/latest/api-reference/cluster-api/cluster-settings/)
- [OpenSearch index settings](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/)
- [OpenSearch Bulk API](https://docs.opensearch.org/latest/api-reference/document-apis/bulk/)
- [Filebeat command reference](https://www.elastic.co/docs/reference/beats/filebeat/command-line-options)
- [Debug Filebeat](https://www.elastic.co/guide/en/beats/filebeat/current/enable-filebeat-debugging.html)
- [Understand metrics in Filebeat logs](https://www.elastic.co/docs/reference/beats/filebeat/understand-filebeat-logs)
- [Configure the Filebeat Logstash output](https://www.elastic.co/docs/reference/beats/filebeat/logstash-output)
- [Secure communication with Logstash](https://www.elastic.co/docs/reference/beats/filebeat/configuring-ssl-logstash)
- [Configure Filebeat index template loading](https://www.elastic.co/docs/reference/beats/filebeat/configuration-template)

## Issues Found

- The index-discovery example used `GET _cat/data_stream?v`, which is not a documented OpenSearch CAT API endpoint. Changed it to the documented `GET _data_stream` API so the command works on OpenSearch and lists data streams.

## Review Notes

- Direct OpenSearch compatibility is intentionally version-specific: the documented Beats compatibility path ends at Beats OSS 7.12.x, while OpenSearch 3.x requires an intermediary such as Logstash with the OpenSearch output plugin.
- The `compatibility.override_main_response_version` setting applies to OpenSearch 1.x and 2.x and only changes the reported version for clients that perform a version check.
- Filebeat internal metric names and debug selectors are not guaranteed to remain stable between releases; the post appropriately calls out the selector caveat.
