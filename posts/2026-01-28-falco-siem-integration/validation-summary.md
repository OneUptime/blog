# Validation Summary: How to Integrate Falco with SIEM

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Falco
- Falcosidekick
- SIEM integrations
- Elasticsearch and Kibana
- Splunk HTTP Event Collector and Splunk SPL
- Apache Kafka and Kafka Connect
- AWS Security Lake
- Webhooks
- Python Flask

## Sources Consulted
- Falco Alerts Forwarding documentation: https://falco.org/docs/concepts/outputs/forwarding/
- Falcosidekick Elasticsearch output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/elasticsearch.md
- Falcosidekick Splunk output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/splunk.md
- Falcosidekick Kafka output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/kafka.md
- Falcosidekick Webhook output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/webhook.md
- Falcosidekick AWS Security Lake output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/aws_security_lake.md
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/values.yaml
- Splunk HTTP Event Collector documentation: https://help.splunk.com/en/splunk-enterprise/get-started/get-data-in/10.4/get-data-with-http-event-collector/set-up-and-use-http-event-collector-in-splunk-web
- Elastic Falco integration documentation: https://www.elastic.co/docs/solutions/security/integrations/cncf-falco

## Issues Found
- The Splunk Falcosidekick configuration used `hostport`, `index`, `source`, and `sourcetype`, but the current Falcosidekick Splunk output supports `host`, `token`, `checkcert`, `customheaders`, and `minimumpriority`. Updated the example to use `splunk.host` with the HEC `/services/collector/event` endpoint and removed unsupported keys.
- The Kafka Falcosidekick configuration included an unsupported `partition` key and used lowercase SASL and compression values. Removed `partition` and changed `plain`/`gzip` to documented `PLAIN`/`GZIP` values.
- The post described a direct `awssecurityhub` Falcosidekick output, which is not present in current Falcosidekick. Replaced this with the supported AWS Security Lake output, updated the architecture label, and changed the IAM policy from `securityhub:BatchImportFindings` to the S3 and STS permissions needed by the Security Lake writer.
- The webhook example used `customheaders` as a map, while the Helm chart values expose `customHeaders` for structured headers. Updated the key to `customHeaders`.
- The templated fields example referenced `.Priority`, but Falcosidekick templated fields are documented for output-field values. Replaced it with a namespace enrichment example using `index . "k8s.ns.name"`.
- The Elasticsearch/Kibana section called the stack an "open-source SIEM solution." Reworded this to "search and security analytics stack" to avoid an inaccurate licensing/product claim.

## Review Notes
- The Kibana dashboard JSON is illustrative rather than a full Kibana saved-object export. It is acceptable as conceptual query guidance, but a future revision could provide importable saved objects or Elastic Security integration steps.
- The Elasticsearch index template is a simplified example. Falcosidekick also supports its own `createindextemplate` and `flattenfields` settings for avoiding mapping conflicts in dotted output-field names.
