# Validation Summary: How to Set Up NetFlow Collection with ElastiFlow and Elasticsearch

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ElastiFlow Unified Flow Collector (`flowcoll`)
- Elasticsearch 8.x
- Kibana 8.x
- NetFlow v5/v9, IPFIX, sFlow
- Cisco IOS legacy NetFlow CLI
- systemd

## Sources Consulted
- ElastiFlow Linux install docs: https://www.elastiflow.com/docs/6.2/flowcoll/install_linux/
- ElastiFlow YAML configuration reference: https://www.elastiflow.com/docs/config_ref/yaml_conf/
- ElastiFlow UDP input reference: https://docs.elastiflow.com/6.4/docs/config_ref/flowcoll/input_udp/
- ElastiFlow flow-collector Docker image (env var examples): https://hub.docker.com/r/elastiflow/flow-collector
- IANA service name registry (sFlow 6343/UDP, IPFIX 4739/UDP, NetFlow community-standard 2055/UDP)
- Cisco IOS NetFlow configuration guide (legacy `ip flow-export` / `ip flow ingress` / `ip flow egress` commands)
- Elastic 8.x APT install docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/deb.html

## Issues Found

1. **Wrong package name and download URL for the Unified Flow Collector.** The post pointed at `https://github.com/elastiflow/elastiflow_for_elasticsearch/releases/download/v7.3.0/elastiflow_unified_collector_7.3.0_linux_amd64.deb`. The `elastiflow_for_elasticsearch` GitHub repository hosts Elastic Stack integration assets (alerts, Kibana objects, ML jobs), not the collector binary. The actual package is named `flow-collector_X.X.X_linux_amd64.deb` and is hosted at `elastiflow-packages.s3.amazonaws.com/flow-collector/`. Updated the URL and filename, and switched to a current 7.x version.

2. **`dpkg -i` skips the `libpcap-dev` dependency.** ElastiFlow's docs explicitly call this out: `apt install ./<package>.deb` resolves the dependency, while `dpkg -i` requires it to be installed manually first. Switched to `apt install -y ./flow-collector_*.deb`.

3. **Fabricated YAML configuration structure.** The post used a nested config (`flow.input.netflow.enabled: true`, `output.elasticsearch.hosts:`, etc.). ElastiFlow does not use that schema. Both the YAML file and the systemd environment file use flat `EF_*` keys (e.g., `EF_FLOW_SERVER_UDP_PORT`, `EF_OUTPUT_ELASTICSEARCH_ADDRESSES`). There is also no per-protocol enable toggle — a single `EF_FLOW_SERVER_UDP_PORT` accepts a comma-separated list of ports for NetFlow/IPFIX/sFlow simultaneously. Replaced the YAML block with a working `flowcoll.yml` example using the real keys, and added the required `EF_LICENSE_ACCEPTED` setting.

4. **Wrong configuration file path.** The post wrote `/etc/elastiflow/elastiflow.yml`. The collector reads `/etc/elastiflow/flowcoll.yml` (named after the binary). Fixed.

5. **Wrong systemd service name.** The post used `systemctl enable elastiflow` / `systemctl start elastiflow` and `journalctl -u elastiflow`. The unit installed by the package is `flowcoll.service`. Updated all three references and added `systemctl daemon-reload` (needed if a drop-in is used).

6. **Suspicious index pattern `elastiflow-flow-codex-*`.** That string appears to be a stray artifact rather than a real default. ElastiFlow's default index pattern is `elastiflow-flow-*`. Removed the custom index override from the example so the collector uses its default; the `_count` and `_search` queries in Step 6 already match `elastiflow-flow-*`.

## Review Notes

- The Cisco IOS commands (`ip flow-export destination`, `ip flow-export version 9`, `ip flow ingress`, `ip flow egress`) are the legacy NetFlow CLI. They are still accepted on most ISR/ASR platforms but are deprecated in favor of Flexible NetFlow (`flow exporter` / `flow monitor` / `flow record`) on newer IOS-XE images. For a future revision, a Flexible NetFlow example would be more durable.
- Elasticsearch 8.x enables security (TLS + authentication) by default during `apt install`. The post disables it via `xpack.security.enabled: false`, which is fine for the lab scenario the post explicitly scopes itself to, but readers deploying to anything other than an isolated lab should leave security enabled and configure `EF_OUTPUT_ELASTICSEARCH_USERNAME` / `_PASSWORD` / `_TLS_*` accordingly.
- The Kibana saved-object import endpoint (`/api/saved_objects/_import`) and the `kbn-xsrf: true` header are correct for Kibana 8.x.
- The "Visualize" workflow in Step 7 still works in Kibana 8.x but Elastic is steering users toward Lens; either is valid.
- ECS field names `source.ip` and `network.bytes` used in the queries are consistent with ElastiFlow's ECS-compatible schema.
