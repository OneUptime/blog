# Validation Summary: How to Deploy Trivy as an Image Scanner with Portainer - Image

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy client/server mode
- Docker Compose
- Docker volumes
- Portainer webhooks
- Private container registries
- jq
- PostgreSQL
- Grafana

## Sources Consulted
- Trivy client/server mode documentation: https://trivy.dev/docs/latest/references/modes/client-server/
- Trivy server CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_server/
- Trivy image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy private registry documentation: https://trivy.dev/docs/latest/advanced/private-registries/
- Trivy reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy database documentation: https://trivy.dev/docs/latest/configuration/db/
- Trivy troubleshooting documentation: https://trivy.dev/docs/latest/guide/references/troubleshooting/
- Trivy official Dockerfile: https://raw.githubusercontent.com/aquasecurity/trivy/main/Dockerfile
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose volume documentation: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose project name documentation: https://docs.docker.com/compose/how-tos/project-name/
- Portainer webhook documentation: https://docs.portainer.io/user/docker/services/webhooks

## Issues Found
- Removed obsolete `version: "3.8"` keys from Compose examples because current Docker Compose treats the top-level `version` field as obsolete and only informational.
- Replaced the invalid `trivy health` healthcheck with a `/healthz` HTTP check. Current Trivy docs document `/healthz` and do not list a `trivy health` command.
- Removed the `GITHUB_TOKEN` environment example for DB rate limiting. Current Trivy troubleshooting docs state `GITHUB_TOKEN` does not help with vulnerability database rate limits.
- Updated jq examples to use optional iteration (`[]?`) so scans without vulnerability arrays do not fail.
- Updated the private registry credential example to keep client/server mode and avoid the discouraged `--password` CLI flag.
- Added `set -euo pipefail` and argument validation to the pre-deploy script so failed scans do not accidentally proceed as passed deployments.
- Clarified that the scan reports dashboard requires a custom importer script and added the missing Grafana service to the dashboard stack.
- Corrected the health endpoint expected response from `OK` to `ok`.
- Replaced the database version command with the Trivy server `/version` endpoint instead of reading scan report metadata.
- Updated the cache volume size command to account for Compose/Portainer stack-prefixed volume names.
- Qualified the standalone scan latency comment as first-run behavior, because subsequent standalone scans can use a populated local cache.
- Reworded the conclusion to avoid implying that the entire database necessarily stays resident in memory.

## Review Notes
The Grafana/PostgreSQL section remains a scaffold because Trivy does not ship a built-in PostgreSQL scan result importer or prebuilt dashboard for this Compose stack. The post now states that `scan-all.sh` must perform that import step.
