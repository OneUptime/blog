# Validation Summary: How to Configure Loki with Memberlist

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Memberlist
- Kubernetes
- Prometheus alerting and metrics
- Linux iptables

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki hash rings documentation: https://grafana.com/docs/loki/latest/get-started/hash-rings/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki Istio installation notes for memberlist service protocol: https://grafana.com/docs/loki/latest/setup/install/istio/
- Grafana Mimir DNS service discovery reference, which documents the shared Grafana dskit DNS discovery prefixes used by memberlist: https://grafana.com/docs/mimir/latest/configure/about-dns-service-discovery/

## Issues Found
- Removed unsupported `memberlist.probe_interval` and `memberlist.probe_timeout` settings. Loki's documented memberlist block exposes settings such as `gossip_interval`, `gossip_nodes`, `packet_dial_timeout`, and `packet_write_timeout`, but not probe interval or probe timeout.
- Changed the DNS discovery example heading from DNS SRV records to DNS A/AAAA records because `dns+` performs A/AAAA lookup. SRV discovery uses the `dnssrv+` prefix.
- Updated the health endpoint examples from `/ring` and `/memberlist` to documented current endpoints: `/distributor/ring` for ring status and `/services` for service status.
- Added required `selector.matchLabels` blocks to the Kubernetes `StatefulSet` and `Deployment` examples so the manifests are valid for `apps/v1`.
- Added `-config.expand-env=true` to the Loki container args and added `POD_NAME` to the distributor environment so `${POD_NAME}` and `${POD_IP}` references are expanded correctly.
- Removed UDP from the Loki memberlist port requirements, NetworkPolicy, firewall example, and production network notes. The official Loki memberlist service examples expose the memberlist port as TCP.

## Review Notes
The guide uses `grafana/loki:2.9.4`, which is older than current Loki releases. The corrected memberlist settings and documented endpoints were checked against the current official Loki documentation; teams pinned to 2.9.4 should still validate the full production configuration with their exact image and chart versions before rollout.
