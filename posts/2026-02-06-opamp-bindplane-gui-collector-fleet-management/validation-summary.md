# Validation Summary: How to Use OpAMP with BindPlane for GUI-Based Collector Fleet Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpAMP
- Bindplane
- Bindplane Distro for OpenTelemetry Collector (BDOT)
- Docker Compose
- GitHub Actions

## Sources Consulted
- Bindplane Docker deployment docs: https://docs.bindplane.com/deployment/docker
- Bindplane Docker Compose server install docs: https://docs.bindplane.com/deployment/docker/server/install-bindplane-in-docker-compose
- Bindplane self-hosted server configuration docs: https://docs.bindplane.com/configuration/bindplane
- Bindplane OpAMP docs: https://docs.bindplane.com/configuration/bindplane-otel-collector/opamp
- Bindplane CLI docs: https://docs.bindplane.com/cli-and-api/cli
- Bindplane CLI installation docs: https://docs.bindplane.com/cli-and-api/cli/installation
- Bindplane CLI reference docs: https://docs.bindplane.com/cli-and-api/cli/reference
- Bindplane fleets docs: https://docs.bindplane.com/feature-guides/fleets
- Bindplane Docker collector install docs: https://docs.bindplane.com/deployment/docker/collector/install-bdot-collector-in-docker-compose
- Bindplane OpAMP Supervisor BYOC docs: https://docs.bindplane.com/how-to-guides/bring-your-own-collector/connect-opentelemetry-collectors-using-the-opamp-supervisor
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpenTelemetry Collector management and OpAMP Supervisor docs: https://opentelemetry.io/docs/collector/management/
- OpenTelemetry OpAMP Supervisor config package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/opampsupervisor/supervisor/config

## Issues Found
- The post described BindPlane OP as open source and used older `bindplane-op` Docker image examples. Current Bindplane self-hosted Docker docs use the `bindplane-ee` image and require supporting services and a license, so the Docker example was updated to a current Docker Compose deployment.
- The server configuration snippet used obsolete or incorrect top-level keys (`host`, `port`, `storage`, `opamp.listenAddress`). It was updated to the documented `network`, `store`, and `auth` structure, and the OpAMP endpoint was kept under the Bindplane server URL at `/v1/opamp`.
- The collector install example used an unverified `install.observiq.com` command and an incorrect `4320` endpoint for Bindplane. It was replaced with the documented UI-generated install guidance and a BDOT Collector Docker environment-variable example using `OPAMP_ENDPOINT`, `OPAMP_SECRET_KEY`, and `OPAMP_LABELS`.
- The OpenTelemetry OpAMP Supervisor config used `agent.storage_dir`, which is not part of the current supervisor config, and omitted the Bindplane secret-key authorization header. It was changed to the documented top-level `storage.directory` field, `server.headers.Authorization` format, and BYOC-oriented capability names.
- The CLI examples used `bindplanectl` and unsupported resource-specific `apply configuration` / `apply agent-group` commands. They were updated to the documented `bindplane` CLI, `bindplane apply -f`, configuration export flags, fleet terminology, and rollout command category.
- The GitHub Actions snippet downloaded an old `bindplanectl` release asset from GitHub. It now installs the current `bindplane` CLI zip from the documented release location and configures a CLI profile before applying resources.

## Review Notes
Bindplane's current docs emphasize Fleets and Rollouts for large-scale collector management. Future revisions could include a full `Fleet` resource YAML example, but that would be a content expansion rather than a correctness fix.
