# Why Is Filebeat Harvesting Files but Not Creating an OpenSearch Index? A Pipeline Debugging Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Filebeat, OpenSearch, Logging, Troubleshooting, Log Management

Description: Trace Filebeat events from harvester to publisher to OpenSearch, separating input progress from output, compatibility, authorization, template, and mapping failures.

---

An open Filebeat harvester proves only that Filebeat can read a configured file. Index creation happens later, after parsing, processors, the internal queue, output publishing, authentication, authorization, and the OpenSearch bulk response. Debug the pipeline in that order.

There is also a critical compatibility boundary: OpenSearch's current compatibility matrix supports direct Beats OSS ingestion only through 7.12.x, and OpenSearch 3.x is not listed as directly compatible with Beats. For newer Filebeat or OpenSearch 3.x, use a supported intermediary such as Logstash with the OpenSearch output plugin, or migrate collection to OpenTelemetry/Data Prepper.

## 1. Prove which Filebeat you are running

```bash
filebeat version
filebeat test config -c /etc/filebeat/filebeat.yml -e
filebeat export config -c /etc/filebeat/filebeat.yml | less
```

The exported configuration catches a surprisingly common issue: the systemd service and your interactive shell may use different config, data, or home paths. For DEB/RPM installs, inspect the unit and its overrides:

```bash
systemctl cat filebeat
systemctl status filebeat
journalctl -u filebeat.service --since '30 minutes ago'
```

Do not delete Filebeat's registry to force a reread on a production host. That can duplicate every previously acknowledged event.

## 2. Separate harvesting from publishing

Filebeat's periodic metrics expose both sides. Compare `filebeat.events.added` and `pipeline.events.published` with `libbeat.output.events.acked` and `failed`. A growing queue or zero acknowledgements points downstream of the input.

Run a short foreground diagnostic:

```bash
sudo filebeat -e -c /etc/filebeat/filebeat.yml -d 'input,harvester,publisher,elasticsearch'
```

Selectors can change between releases, so use the names supported by your installed version. Debug output can include event content and credentials-related details; capture it securely and turn it off after the test.

If events are read but never published, inspect Filebeat processors for `drop_event`, parse errors, and conditional routing. If the harvester opens the file but `events.added` does not move, append a unique test line and check permissions, multiline rules, file identity, and the registry offset.

## 3. Test the configured output

```bash
sudo filebeat test output -c /etc/filebeat/filebeat.yml -e
```

This tests connectivity with the effective output settings; it does not prove that the service account can create the intended index or that a representative event passes its mapping.

Test OpenSearch independently using the same CA and identity:

```bash
curl --fail-with-body --cacert /etc/filebeat/certs/root-ca.pem \
  -u "$OPENSEARCH_USER:$OPENSEARCH_PASSWORD" \
  'https://opensearch.example.com:9200/'

curl --fail-with-body --cacert /etc/filebeat/certs/root-ca.pem \
  -u "$OPENSEARCH_USER:$OPENSEARCH_PASSWORD" \
  'https://opensearch.example.com:9200/_resolve/index/filebeat-*'
```

A TCP connection is not enough. Check TLS hostname validation, certificate chain, proxy behavior, HTTP status, and the response body.

## 4. Check the version path before changing permissions

For OpenSearch 1.x and 2.x with compatible Beats OSS 7.x–7.12.x, the OpenSearch documentation describes this compatibility setting:

```http
PUT _cluster/settings
{
  "persistent": {
    "compatibility.override_main_response_version": true
  }
}
```

It makes the main response report version 7.10.2 for clients that perform a version check. It does not turn modern proprietary Beats into supported OpenSearch clients, and it is not the solution for OpenSearch 3.x.

For a current unsupported combination, route Filebeat to Logstash:

```yaml
output.logstash:
  hosts: ["logstash.internal:5044"]
  ssl.certificate_authorities: ["/etc/filebeat/certs/root-ca.pem"]
```

Then use the OpenSearch-supported Logstash output plugin. Because Filebeat no longer talks directly to the search cluster, load and manage the OpenSearch index template in that pipeline rather than expecting Filebeat's Elasticsearch setup workflow to do it.

## 5. Inspect index naming and cluster policy

The requested index may not be the one you expect. Export the config and check `output.elasticsearch.index`, module settings, and Logstash's `index` expression. Search broadly but safely:

```http
GET _cat/indices?v&expand_wildcards=open,hidden&s=index
GET _cat/data_stream?v
GET _cluster/settings?include_defaults=true&flat_settings=true
```

`action.auto_create_index` may deny the target. The Filebeat identity also needs the permissions required by your chosen design: creating an index or data stream when it does not exist, writing documents, and possibly managing a template. Prefer installing templates through a deployment identity and granting the runtime shipper only write privileges.

## 6. Read bulk item failures

An HTTP bulk request can succeed at the request level while individual items fail. Filebeat's publisher/output debug logs are therefore more useful than cluster logs for mapping rejections. Typical responses include:

- `401` or `403`: authentication or index permission failure;
- `index_not_found_exception`: auto-creation disabled or wrong target;
- `mapper_parsing_exception`: an event field conflicts with the mapping;
- `cluster_block_exception`: disk watermark or another index block;
- version/product-check error: unsupported Beats/OpenSearch combination.

Confirm the final mapping and test one sanitized representative document through the exact target or ingest pipeline. Do not "fix" a type conflict by deleting a production template; create a corrected template and roll to a new index.

## Official References

- [OpenSearch tools and ingestion compatibility matrices](https://docs.opensearch.org/latest/tools/)
- [Filebeat command reference](https://www.elastic.co/docs/reference/beats/filebeat/command-line-options)
- [Debug Filebeat](https://www.elastic.co/guide/en/beats/filebeat/current/enable-filebeat-debugging.html)
- [Understand Filebeat log metrics](https://www.elastic.co/guide/en/beats/filebeat/current/understand-filebeat-logs.html)
- [Configure Filebeat index template loading](https://www.elastic.co/docs/reference/beats/filebeat/configuration-template)
