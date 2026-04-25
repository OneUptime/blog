# Validation Summary: How to Deploy the PLG Stack (Promtail, Loki, Grafana) via Portainer

## Status
not-technically-relevant

## Post Type
Guide / deployment tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Grafana Loki
- Promtail
- Grafana
- LogQL
- Docker Loki logging driver

## Sources Consulted
- Grafana Loki documentation, Promtail agent: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki documentation, Install Loki: https://grafana.com/docs/loki/latest/setup/install/
- Grafana Loki documentation, Install Loki with Docker or Docker Compose: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Loki documentation, Storage schema: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki documentation, Docker driver client: https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki documentation, Docker driver client configuration: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Loki documentation, Query Loki / LogQL: https://grafana.com/docs/loki/latest/query/
- Grafana Loki documentation, LogQL Reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana documentation, Provision Grafana: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Docker Docs, Control startup and shutdown order in Compose: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer documentation, How Relative Path Support works in Portainer: https://docs.portainer.io/sts/advanced/relative-paths

## Issues Found
- The post's core deployment path is no longer current. Grafana's official documentation states that Promtail reached end-of-life on March 2, 2026 and instructs users to migrate to Grafana Alloy or another supported client. This article was published after that date and is centered on deploying Promtail, so the main workflow is outdated at its foundation.
- Current Loki install documentation now describes the general process as installing Loki and Alloy together, and the Docker/Compose install guide says to install Loki and Alloy for evaluation or development. That directly conflicts with presenting a new Promtail-based PLG deployment as the current approach.
- The article calls the Loki configuration "production-ready", but Grafana's install docs explicitly warn that Loki ships without an authentication layer and requires an authenticating reverse proxy to prevent unauthorized access. The post exposes Loki on `3100` and sets `auth_enabled: false` without any auth proxy, so the production-ready claim is incorrect.
- The Portainer framing is incomplete and misleading. The compose file relies on relative bind mounts such as `./loki-config.yaml`, but Portainer documents relative path volume support only for Business Edition Git-based stack deployments with the feature explicitly enabled. The article does not mention that requirement or provide a Portainer-specific deployment flow that would make these mounts reliable.
- The Loki schema guidance is outdated for a new install. Current Loki storage schema documentation says `tsdb` is the current and only recommended store and `schema: v13` is the most recent and recommended schema for new installations. The article uses `schema: v12` for a fresh filesystem-backed TSDB deployment.
- The Docker log driver installation command is outdated. Current Grafana docs show installing a versioned, architecture-specific plugin tag and include `--grant-all-permissions`. The post uses `grafana/loki-docker-driver:latest --alias loki`, which does not match the current documented installation command.
- The compose example is not self-contained. It mounts `./grafana-dashboards.yaml` and `./dashboards`, but the post never provides those files. In the checked post directory, only `README.md` and `social-media.png` exist, so the article does not actually supply all artifacts required to reproduce the stack as written.
- No technical patch was applied to `README.md`. Making this article publishable would require rewriting it into an Alloy-based guide and correcting its Portainer deployment assumptions, which is beyond a targeted factual correction pass.

## Review Notes
- Some isolated statements remain broadly true, such as Loki indexing labels rather than full log content and Grafana being able to query Loki as a data source.
- The Compose snippets also use the obsolete top-level `version` key. Docker still accepts it for backward compatibility, but current Compose documentation marks it as obsolete and informational only.
