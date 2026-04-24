# Validation Summary: How to Deploy Logstash via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose stack configuration
- Logstash
- Elasticsearch
- Elastic Stack
- Logstash pipeline configuration

## Sources Consulted
- Elastic Logstash Docker configuration docs: https://www.elastic.co/guide/en/logstash/current/docker-config.html
- Elastic Logstash multiple pipelines docs: https://www.elastic.co/guide/en/logstash/current/multiple-pipelines.html
- Elastic Beats input plugin docs: https://www.elastic.co/docs/reference/logstash/plugins/plugins-inputs-beats
- Elastic Syslog input plugin docs: https://www.elastic.co/guide/en/logstash/current/plugins-inputs-syslog.html
- Elastic Elasticsearch output plugin docs: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elastic Logstash monitoring API docs: https://www.elastic.co/guide/en/logstash/current/monitoring-logstash.html
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Elastic container registry tags: https://container-registry-ui.elastic.co/r/logstash?limit=50&offset=0&show_snapshots=false

## Issues Found
- The post treated `pipeline/beats.conf`, `pipeline/syslog.conf`, and `pipeline/json-logs.conf` as separate pipelines, but Elastic's Docker docs state that every file in `/usr/share/logstash/pipeline/` is parsed as pipeline configuration. Without `pipelines.yml`, Logstash would merge those files into one pipeline and route events through every output. I added a `pipelines.yml` example and mounted it in the stack so each config file runs as its own pipeline.
- The stack published `5000/tcp` only and did not publish `5001` at all. The syslog input plugin listens on both TCP and UDP, and the JSON TCP input listens on `5001`. I updated the port mappings to publish `5000/tcp`, `5000/udp`, and `5001/tcp`.
- The post pinned the container to `docker.elastic.co/logstash/logstash:8.13.0`, which is outdated for April 24, 2026. I updated the example to `9.3.3` from Elastic's container registry and adjusted version-sensitive settings accordingly.
- The Beats input example used `ssl => false`. Current plugin docs use `ssl_enabled`, so I updated the config to `ssl_enabled => false`.
- The custom `logstash.yml` used `http.host`; current docs use `api.http.host`. I updated the setting to the current documented key.
- The syslog pipeline reparsed `message` with a grok filter even though the syslog input plugin already parses RFC3164 syslog messages. That extra filter was redundant and would not correctly match the already-parsed event body. I removed the redundant grok/date parsing and kept only the added metadata field.
- The syslog and JSON outputs set custom daily index names but did not disable ILM. Current Elasticsearch output docs note that ILM defaults to `auto`, which can override custom index naming. I added `ilm_enabled => false` to those outputs to preserve the documented index patterns.
- The stack mounted a custom patterns directory but the grok filter did not reference it. I added `patterns_dir => ["/usr/share/logstash/patterns"]` to the grok filter so the mounted directory is actually usable.

## Review Notes
- The guide assumes an existing Docker network named `elastic-network` and an Elasticsearch service reachable at `http://elasticsearch:9200`.
- If the target Elasticsearch deployment uses the modern default TLS-enabled setup, the output examples will need `https` plus certificate or SSL configuration instead of plain `http`.
