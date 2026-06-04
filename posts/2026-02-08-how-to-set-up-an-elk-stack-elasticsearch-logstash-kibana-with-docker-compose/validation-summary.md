# Validation Summary: How to Set Up an ELK Stack with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Elasticsearch 8.12
- Logstash 8.12
- Kibana 8.12
- Logstash pipeline configuration
- Elasticsearch Index Lifecycle Management
- Python logging

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Elasticsearch Docker installation documentation: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docker.html
- Elasticsearch security settings documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/security-settings.html
- Elasticsearch ILM policy documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/set-up-lifecycle-policy.html
- Elasticsearch ILM rollover documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Logstash settings file documentation: https://www.elastic.co/docs/reference/logstash/logstash-settings-file
- Logstash TCP input plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-tcp
- Logstash json_lines codec documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-codecs-json_lines
- Logstash date filter plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-date
- Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Kibana Docker documentation: https://www.elastic.co/guide/en/kibana/current/docker.html
- Kibana data views documentation: https://www.elastic.co/guide/en/kibana/current/data-views.html

## Issues Found
- The Compose snippet showed `elasticsearch/elasticsearch.yml` in the project structure but did not mount it into the Elasticsearch container. Added the bind mount for `/usr/share/elasticsearch/config/elasticsearch.yml`.
- The Compose snippet exposed UDP port 5000 even though the Logstash pipeline only defines a TCP input on port 5000. Removed the unused UDP mapping.
- The Compose snippet used the obsolete top-level `version` key. Removed it to align with the current Compose Specification.
- The Kibana `ELASTICSEARCH_HOSTS` Docker environment variable was written as a plain URL. Updated it to the JSON-array form shown in Elastic's Docker documentation.
- The Logstash Elasticsearch output writes to a custom daily `logs-%{+YYYY.MM.dd}` index, but Logstash can automatically enable ILM when Elasticsearch supports it. Added `ilm_enabled => false` so the custom index name is honored consistently.
- The multiple-log shell example generated an invalid timestamp for `i=10` (`10:30:010Z`). Replaced it with `printf` and `%02d`.
- Kibana's UI terminology has changed from Index Patterns to Data Views. Updated the Kibana instructions accordingly.
- The Python logging example used `self.format(record)` as the timestamp, which defaults to the message text unless a formatter is configured. Updated it to emit a UTC ISO timestamp.
- The ILM example created a rollover policy but did not configure a rollover alias or template, so it would not manage the daily `logs-*` indices as written. Replaced it with a delete-only policy and an index template that applies the policy to newly created `logs-*` indices.

## Review Notes
The post is now technically valid for a local development ELK stack using the versions shown. The setup intentionally disables Elastic security for local use; production deployments should enable authentication and TLS and should use a more complete retention strategy.
