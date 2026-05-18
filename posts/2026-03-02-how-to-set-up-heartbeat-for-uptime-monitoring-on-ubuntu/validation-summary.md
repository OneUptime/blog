# Validation Summary: How to Set Up Heartbeat for Uptime Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elastic Heartbeat 8.x (heartbeat-elastic package)
- Elasticsearch 8.x
- Kibana (Observability / Uptime app)
- Ubuntu 20.04 / 22.04 (APT, systemd)
- ICMP, TCP, and HTTP synthetic monitoring
- Elasticsearch Watcher API
- Linux capabilities (CAP_NET_RAW / setcap)

## Sources Consulted
- Heartbeat HTTP monitor options: https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-http-options.html
- Heartbeat ICMP monitor options: https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-icmp-options.html
- Heartbeat TCP monitor options: https://www.elastic.co/guide/en/beats/heartbeat/current/monitor-tcp-options.html
- Heartbeat command reference (version, test config, -c): https://www.elastic.co/guide/en/beats/heartbeat/current/command-line-options.html
- Heartbeat directory layout (DEB/RPM): https://www.elastic.co/guide/en/beats/heartbeat/current/directory-layout.html
- Heartbeat APT repository install: https://www.elastic.co/guide/en/beats/heartbeat/current/setup-repositories.html
- Heartbeat configuration reload: https://www.elastic.co/guide/en/beats/heartbeat/current/_live_reloading.html
- Elasticsearch Watcher API: https://www.elastic.co/guide/en/elasticsearch/reference/current/watcher-api-put-watch.html

## Issues Found
1. **HTTP POST monitor used the wrong field name for the HTTP method.** The post had `method: POST` at the top level of an HTTP monitor block. Per the official Heartbeat HTTP monitor options reference, the method must be specified as `check.request.method` (top-level `method:` is not a recognized HTTP monitor option). Changed `method: POST` → `check.request.method: POST`.
2. **Incorrect binary path in the `setcap` troubleshooting command.** The post had `sudo setcap cap_net_raw+eip /usr/share/heartbeat/heartbeat`. Per the official Heartbeat directory-layout docs, the DEB/RPM binary lives in `/usr/share/heartbeat/bin/`. Updated the path to `/usr/share/heartbeat/bin/heartbeat`.

## Review Notes
- The shorthand `check.response.body: ["foo", "bar"]` is still accepted in Heartbeat 8.x as a synonym for `check.response.body.positive: [...]`, so the post is fine, though `check.response.body.positive` is the more explicit/canonical form.
- The Kibana **Uptime** app remains available in Kibana 8.x but Elastic has been steering users toward the newer **Synthetics** app in recent 8.x releases. Readers landing on a fresh 8.x install may see Synthetics surfaced more prominently; the Uptime navigation path used in the post still works for classic Heartbeat data.
- The `heartbeat-elastic` package name (vs. an unrelated older `heartbeat` package) is accurate.
- `heartbeat test config -c …` works as written; the canonical form per docs is `heartbeat -c <config> test config` with `-c` before the subcommand, but both orderings work in practice.
- The Watcher API JSON, ICMP `wait`/`timeout` options, TCP `check.send`/`check.receive`, `ssl.verification_mode`, ILM/template loading via `heartbeat setup -e`, and systemd unit name `heartbeat-elastic` were all verified accurate.
