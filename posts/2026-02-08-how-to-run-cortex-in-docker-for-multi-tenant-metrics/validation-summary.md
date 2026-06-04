# Validation Summary: How to Run Cortex in Docker for Multi-Tenant Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Cortex
- Prometheus
- Prometheus remote write
- Grafana
- YAML configuration

## Sources Consulted
- Cortex configuration reference: https://cortexmetrics.io/docs/configuration/configuration-file/
- Cortex HTTP API reference: https://cortexmetrics.io/docs/api/
- Cortex blocks storage documentation: https://cortexmetrics.io/docs/blocks-storage/
- Cortex authentication and authorisation guide: https://cortexmetrics.io/docs/guides/auth/
- Cortex single binary getting started guide: https://cortexmetrics.io/docs/getting-started/single-binary/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana data source provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The Cortex `ingester` configuration used an invalid top-level `ingester.ring` block for `cortexproject/cortex:v1.16.1`. Moved the ring settings under `ingester.lifecycler.ring` and changed the address key to `ingester.lifecycler.address`, which matches Cortex's configuration schema.
- The Docker Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it so the example follows the current Compose Specification.
- The tenant isolation wording implied that Team A could not access Team B's data solely because Cortex separates tenants by header. Updated the text to note that `X-Scope-OrgID` is trusted and production deployments need authentication or a trusted proxy to prevent header spoofing.
- The runtime override example used `max_series_per_query`, which Cortex documents as ignored when using blocks storage. Replaced it with `max_fetched_series_per_query`, the documented query series limit for blocks storage.

## Review Notes
- The corrected Cortex configuration was validated by starting `cortexproject/cortex:v1.16.1` with the extracted YAML.
- The corrected runtime override file was validated by starting Cortex's `overrides` target with the extracted YAML.
- The corrected Compose snippet was validated with `docker compose config`.
