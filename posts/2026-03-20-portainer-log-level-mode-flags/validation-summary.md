# Validation Summary: How to Use the --log-level and --log-mode Flags in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose
- Docker logging drivers (`json-file`, `gelf`, plugin-based drivers)
- `jq`
- Grafana Loki
- Graylog

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer install guidance for Docker on Linux: https://docs.portainer.io/sts/start/install/server/docker/linux
- Portainer FAQ on retrieving Portainer container logs: https://docs.portainer.io/sts/faqs/troubleshooting/logs-errors-and-debugging/how-can-i-get-the-logs-for-portainer-itself
- Portainer source for CLI flag defaults and accepted values: https://github.com/portainer/portainer/blob/develop/api/cli/cli.go
- Portainer source for log formatting and timestamp behavior: https://github.com/portainer/portainer/blob/develop/api/logs/log.go
- Portainer source for default HTTP exposure state: https://github.com/portainer/portainer/blob/develop/api/datastore/init.go
- Docker CLI `docker container logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker GELF logging driver docs: https://docs.docker.com/engine/logging/drivers/gelf/
- Docker JSON File logging driver docs: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker docs for logging driver plugins: https://docs.docker.com/engine/logging/plugins/
- Docker Compose services reference (`logging`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose top-level `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Grafana Loki Docker driver docs: https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docker driver configuration docs: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/

## Issues Found
- The JSON log examples used an RFC3339 string timestamp and a `msg` field. Portainer currently emits zerolog JSON with a Unix `time` field and a `message` field, so the examples were corrected to match the implementation.
- The `jq` field-extraction example read `.msg`, which does not match Portainer's JSON output. It was changed to `.message`.
- The hourly error-count example sliced `.time` as if it were a string. Portainer configures zerolog to emit Unix timestamps, so the command was corrected to convert the timestamp to ISO8601 before grouping.
- Both Docker Compose YAML examples used the top-level `version: "3.8"` field. Current Compose documentation marks that field obsolete, so it was removed.
- The Loki Compose example assumed `logging.driver: loki` would work without any prerequisite. It was updated with a note that the Grafana Loki Docker logging driver plugin must be installed on the Docker host.
- The Loki Compose snippet mounted `portainer_data:/data` without declaring the named volume. A top-level `volumes` declaration was added to make the example complete and portable.
- The production `docker run` example was syntactically invalid because it placed shell comments after line-continuation backslashes. The inline comments were removed, the descriptive comment was aligned with `--log-level=WARN`, and `--snapshot-interval` was changed to valid Go duration syntax (`5m`).
- The `/etc/docker/daemon.json` example used a plain shell redirection that would fail for non-root users. It was corrected to use `sudo tee` so the command works as shown.
- The per-container log-rotation example contained a `[rest of options]` placeholder, which is not a runnable command. It was replaced with a complete `docker run` example.
- The log-path inspection command used `jq` without `-r`, which would pass a quoted path to `ls`. It was corrected to `jq -r`.
- The post included concrete per-hour log-volume estimates by level that are workload-dependent and not supported by official documentation. These were replaced with a qualitative statement that remains technically accurate.

## Review Notes
Official Portainer install docs now emphasize `9443` for the UI and `8000` only when Edge features are needed, with published `9000` mainly for legacy HTTP access. The post's `9000` examples remain workable, but HTTPS-first exposure is the stronger production default.
