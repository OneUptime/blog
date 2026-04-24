# Validation Summary: How to Set Up Portainer for Telecommunications Edge Infrastructure (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Edge Agent
- Docker Compose
- Kubernetes
- Prometheus
- node_exporter
- Telecommunications edge infrastructure
- CNFs / NFV workloads

## Sources Consulted
- Docker Compose file reference, version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Portainer Edge Agent overview: https://docs.portainer.io/advanced/edge-agent
- Portainer Edge Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer environment management overview: https://docs.portainer.io/sts/admin/environments
- Prometheus releases: https://github.com/prometheus/prometheus/releases
- Prometheus node_exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md?plain=1

## Issues Found
- The Compose snippets used the top-level `version: "3.8"` key, which Docker now marks obsolete. I removed the `version` lines from the Compose examples.
- The `firewall` service in the vCPE stack did not use host networking, so it would not be operating on the host traffic path it was described as protecting. I added `network_mode: host` to align the example with the stated firewall use case.
- The high-availability example mixed a regular Docker Compose stack with `deploy.restart_policy`, which belongs to the Compose Deploy specification and is commonly used for Swarm-style/orchestrated deployments rather than the standalone Compose pattern used elsewhere in the post. I removed the `deploy` block and kept the standalone-compatible `restart` plus `healthcheck` example.
- The monitoring snippet was not a complete valid Compose fragment because it lacked the top-level `services:` key and the `prometheus-data` volume declaration. I added the missing structure.
- The `node-exporter` example used an older containerized host-monitoring pattern. I updated it to the current upstream recommendation: `quay.io/prometheus/node-exporter`, a single `/:/host:ro,rslave` bind mount, and `--path.rootfs=/host`.
- The monitoring image tags were stale at review time. I updated Prometheus to `v3.11.2` and node_exporter to `v1.11.1`, which were current on 2026-04-24.
- The summary sentence overstated Portainer Edge Agent networking as if no inbound firewall rules were needed anywhere. I corrected this to the documented model: edge environments connect outbound to Portainer, while the Portainer server still needs its UI and tunnel ports reachable.
- The post used fictional image names and management endpoints without saying they were illustrative. I added a short note so readers understand they must substitute vendor-supplied CNF images and site-specific URLs.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- The CNF image names, health endpoint, and telecom management URLs remain representative placeholders rather than publicly documented products.
- The Prometheus and node_exporter version pins are accurate as of 2026-04-24 and may need periodic refreshes in future updates.
