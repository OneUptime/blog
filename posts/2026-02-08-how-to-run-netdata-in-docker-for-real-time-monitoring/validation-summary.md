# Validation Summary: How to Run Netdata in Docker for Real-Time Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Netdata Agent
- Netdata health alerts
- Netdata streaming
- Prometheus scraping
- Slack alert notifications

## Sources Consulted
- Netdata Docker installation documentation: https://learn.netdata.cloud/docs/netdata-agent/installation/docker
- Netdata alert configuration reference: https://learn.netdata.cloud/docs/alerts-&-notifications/alert-configuration-reference
- Netdata streaming and replication reference: https://learn.netdata.cloud/docs/observability-centralization-points/streaming-and-replication-reference
- Netdata Prometheus exporter documentation: https://learn.netdata.cloud/docs/exporting-metrics/prometheus
- Netdata Cloud connect agent documentation: https://learn.netdata.cloud/docs/netdata-cloud/connect-agent
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker run reference: https://docs.docker.com/reference/cli/docker/container/run/
- Prometheus scrape configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- Updated the Docker and Docker Compose examples to mount `/etc/localtime` at `/etc/localtime`, matching Netdata's documented Docker deployment, instead of mounting it below `/host/etc/localtime`.
- Added the `/run/dbus:/run/dbus:ro` mount used by Netdata's current Docker guidance for fuller host visibility.
- Removed the top-level Compose `version: "3.8"` field because the current Compose specification treats it as obsolete.
- Added the optional `NETDATA_CLAIM_ROOMS` variable to the Netdata Cloud claiming example so the "claimed room" comment reflects the variables Netdata documents.
- Corrected the custom alert example from an invalid wildcard chart alarm to a Netdata health template on the `cgroup.mem_usage` context, with the `ram` dimension selected for MiB threshold comparisons.
- Updated the parent `stream.conf` example to include the current `type = api` and `db = dbengine` settings instead of older default history/memory mode keys.

## Review Notes
The remaining commands and examples are consistent with current Docker, Prometheus, and Netdata documentation. The performance figures are reasonable as general guidance, but actual CPU, RAM, and disk usage will vary by host size, enabled collectors, retention, and workload.
