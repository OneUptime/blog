# Validation Summary: How to Set Up Centralized Logging with ELK Stack

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elasticsearch
- Logstash
- Kibana
- Docker Compose
- Index Lifecycle Management (ILM)
- Node.js
- Express
- Winston
- winston-elasticsearch

## Sources Consulted
- Elastic Logstash HTTP input plugin documentation: https://www.elastic.co/guide/en/logstash/current/plugins-inputs-http.html
- Elastic Logstash monitoring API documentation: https://www.elastic.co/guide/en/logstash/8.19/monitoring-logstash.html
- Elastic Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Kibana create data view API documentation: https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-createdataviewdefaultw
- Elastic Elasticsearch security settings documentation: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elastic ILM lifecycle policy and index template documentation: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/configure-lifecycle-policy
- Elastic Elasticsearch JVM settings documentation: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Docker Compose file reference for the top-level version property: https://docs.docker.com/reference/compose-file/version-and-name/
- winston-elasticsearch project documentation: https://github.com/vanthome/winston-elasticsearch

## Issues Found
- Docker Compose used the obsolete top-level `version` property. Removed it because current Docker Compose validates against the Compose Specification without needing this field.
- The Docker Compose Logstash ports exposed `9600` as the HTTP input for webhooks, but the Logstash pipeline configured the HTTP input on port `8080`. Added `8080:8080` for application logs and clarified that `9600` is the Logstash monitoring API port.
- The TCP input was described as syslog while it used the `json_lines` codec. Updated the wording to describe newline-delimited JSON logs.
- The Logstash output configured `document_id => "%{[@metadata][fingerprint]}"` without creating that metadata field. Removed the option so Elasticsearch generates document IDs normally.
- The Winston section said applications send logs to Logstash, but the code uses `winston-elasticsearch` to index directly into Elasticsearch. Updated the text to make the direct indexing path explicit.
- The Winston client options always included an `auth` object, even when username and password environment variables were unset. Changed the example to add authentication only when both values are present.
- The Express example accessed `req.body.items` and `req.user.id` directly. Added JSON body parsing and safe access for optional request fields.
- The Kibana API example used the older saved object `index-pattern` endpoint. Replaced it with the Kibana 8 data view API.
- The ILM policy used a rollover action and `index.lifecycle.rollover_alias` while the Logstash output wrote daily indices (`logs-%{+YYYY.MM.dd}`). Removed rollover-specific settings so the lifecycle policy matches the daily-index setup shown in the article.
- The production heap guidance used the older simplified "never more than 32GB" rule. Updated it to Elastic's current guidance to stay under 50% of available node memory and below the compressed ordinary object pointers threshold.
- The production security snippet claimed TLS for nodes and clients but only showed transport-layer TLS. Added HTTP-layer TLS settings for Elasticsearch client communication.

## Review Notes
- The Docker images are pinned to Elastic Stack 8.11.0, which is not the newest Elastic release as of this review date, but the examples are still version-consistent after the fixes.
- The dashboard JSON is best treated as a visualization shape rather than a complete saved object export; production Kibana dashboard automation should use saved object export/import or the current Kibana APIs.
