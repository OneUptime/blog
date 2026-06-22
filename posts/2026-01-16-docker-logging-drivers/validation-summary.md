# Validation Summary: How to Set Up Docker Logging Drivers (json-file, syslog, fluentd)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Engine logging drivers
- Docker Compose logging configuration
- json-file logging driver
- local logging driver
- syslog logging driver
- fluentd logging driver
- journald logging driver
- AWS CloudWatch Logs driver
- Google Cloud Logging driver
- Fluentd configuration
- Node.js Fluentd client logging

## Sources Consulted
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Docker Docs: Syslog logging driver - https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs: Fluentd logging driver - https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker Docs: Journald logging driver - https://docs.docker.com/engine/logging/drivers/journald/
- Docker Docs: Amazon CloudWatch Logs logging driver - https://docs.docker.com/engine/logging/drivers/awslogs/
- Docker Docs: Google Cloud Logging driver - https://docs.docker.com/engine/logging/drivers/gcplogs/
- Docker Docs: Customize log driver output - https://docs.docker.com/engine/logging/log_tags/
- Docker Docs: Use docker logs with remote logging drivers - https://docs.docker.com/engine/logging/dual-logging/
- Fluentd Docs: Docker Logging Driver - https://docs.fluentd.org/container-deployment/docker-logging-driver
- Fluentd Docs: Node.js language binding - https://docs.fluentd.org/language-bindings/nodejs
- Moby source: json-file logging driver - https://github.com/moby/moby/blob/master/daemon/logger/jsonfilelog/jsonfilelog.go
- Moby source: local logging driver - https://github.com/moby/moby/blob/master/daemon/logger/local/local.go
- Local Docker Engine 29.4.2 CLI/daemon checks for logging option acceptance.

## Issues Found
- The `daemon.json` examples used `//` comments inside `json` code blocks. Docker daemon JSON does not allow comments, so the path comments were moved outside the JSON snippets.
- The `json-file` options table omitted `labels-regex` and `env-regex`, which are supported logging options. Added both options.
- The `local` driver section omitted its default rotation and compression behavior. Added the documented default of 5 files of 20 MB each with compression enabled.
- The syslog options table was incomplete and understated supported address formats. Added `tcp+tls`, `unixgram`, TLS CA and skip-verification options, and `rfc5424micro`.
- The tag template example used duplicate YAML keys, making it invalid YAML. Rewrote it as comments plus one valid `tag` value, and corrected `{{.ID}}` to mean the first 12 container ID characters.
- The Fluentd Elasticsearch example implied the base Fluentd image included the Elasticsearch output plugin and included `type_name`. Added a plugin requirement comment and removed `type_name`.
- The Fluentd options table described `fluentd-buffer-limit` as a byte size and listed `fluentd-max-retries` as unlimited. Corrected the buffer limit to an event count and the default max retries to `4294967295`.
- The AWS CloudWatch example used a Go template in `awslogs-stream`; Docker documents templating through the `tag` option. Replaced `awslogs-stream` with `tag`.
- The dual logging section said Docker does not support multiple log drivers without mentioning Docker's default dual logging cache for remote drivers. Added that nuance and clarified when workarounds are still needed.
- The sidecar example implied Docker stdout logs would appear in a mounted app volume. Added a note that this only works if the app writes log files under that path.
- The Node.js application-level logging example used the deprecated `fluent-logger` package. Replaced it with the current `@fluent-org/logger` client API.
- The high-volume Fluentd example used `fluentd-buffer-limit: "4MB"`. Changed it to an event-count value.
- The troubleshooting section implied remote drivers generally cannot use `docker logs`. Updated it for Docker's default dual logging cache and the `cache-disabled=true` exception.
- The disk-space troubleshooting section recommended directly truncating Docker log files without warning. Added a stop/truncate/start sequence and warned that direct edits are only an emergency action for `json-file` logs.
- The production example used `fluentd:24224` as a logging driver address, which is not generally resolvable from the Docker daemon. Changed it to the host-published `localhost:24224`.
- The summary table incorrectly marked journald as only available through `journalctl` and remote drivers as not readable through `docker logs`. Updated it for journald and Docker's default dual logging cache.

## Review Notes
The post is now technically valid for current Docker Engine behavior. Some examples still use placeholder images such as `myapp` and require environment-specific credentials or services, which is appropriate for a configuration guide. The `compress` logging option is accepted by current Docker Engine and Moby source for `json-file` and `local`, although current Docker docs do not list it in every driver option table.
