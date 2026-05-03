# Validation Summary: How to Deploy Logstash via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Logstash 8.12.0
- Portainer (Docker stack management)
- Docker / Docker Compose
- Elasticsearch (output target)
- Filebeat / Beats input plugin
- GELF (Graylog Extended Log Format) Docker logging driver
- Grok / GeoIP filter plugins

## Sources Consulted
- Logstash Docker reference: https://www.elastic.co/guide/en/logstash/8.12/docker-config.html
- Logstash settings file: https://www.elastic.co/guide/en/logstash/8.12/logstash-settings-file.html
- Logstash monitoring settings (deprecation of `xpack.monitoring.*`): https://www.elastic.co/guide/en/logstash/8.12/monitoring-with-metricbeat.html
- Beats input plugin (default port 5044): https://www.elastic.co/guide/en/logstash/8.12/plugins-inputs-beats.html
- GELF input plugin (default port 12201): https://www.elastic.co/guide/en/logstash/8.12/plugins-inputs-gelf.html
- Logstash monitoring API: https://www.elastic.co/guide/en/logstash/8.12/monitoring-logstash.html
- Logstash performance tuning: https://www.elastic.co/guide/en/logstash/8.12/tuning-logstash.html
- Docker GELF logging driver (default port 12201): https://docs.docker.com/config/containers/logging/gelf/

## Issues Found

1. **Volume mount masked entire config directory.** The original compose mounted `./logstash-config:/usr/share/logstash/config:ro`, which replaces the whole config directory inside the image and hides required files (`jvm.options`, `log4j2.properties`, `pipelines.yml`, etc.) — Logstash would fail to start without them. Changed to a single-file mount: `./logstash-config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro`.

2. **Incorrect port labels.** Comment on `5000:5000/tcp` said "Beats input" and `5044:5044` said "Filebeat input". The Beats input plugin defaults to port 5044, and port 5000 in this pipeline is configured for tcp/udp with json/json_lines codec. Relabeled as "TCP/UDP JSON input" and "Beats input (Filebeat)" respectively.

3. **Deprecated monitoring setting.** `xpack.monitoring.enabled` was deprecated in Logstash 7.9 in favor of `monitoring.enabled`. Replaced with the current setting.

4. **Broken GELF example.** The application snippet sent Docker GELF logs to `udp://logstash:5000`, but the pipeline had no GELF input on port 5000 — only tcp/udp inputs with JSON codecs, which cannot parse GELF packets. Added a `gelf { port => 12201 }` input plugin to the pipeline, mapped port 12201/udp in the compose file, and changed the gelf-address to `udp://logstash:12201` (the standard GELF default).

## Review Notes
- The compose stack relies on an existing external network named `elastic` and an external `${ELASTIC_PASSWORD}` env var — the post does not call this out explicitly but it is consistent with companion posts in the ELK series.
- `path.config: /usr/share/logstash/pipeline` in `logstash.yml` is functionally redundant when the default `pipelines.yml` (shipped in the image) is present, since `pipelines.yml` already points at the same path and takes precedence over `path.config`. Left as-is — it is not technically wrong, just redundant.
- The example uses `if [fields][service] == "nginx"` which only works when logs arrive from Filebeat with a configured `fields.service` value; readers using other input paths will need to populate the field themselves.
- Logstash 8.12.0 is from January 2024 and is now several minor versions behind the current 8.x line at time of review (2026-05). API surface used in the post (monitoring endpoints, plugin syntax) is unchanged in later 8.x releases, so the post remains accurate for the version stated.
