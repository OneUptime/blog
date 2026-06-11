# Validation Summary: How to Implement Docker Logging Best Practices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker Engine logging drivers
- Docker CLI and daemon logging configuration
- Docker Compose logging configuration and YAML anchors
- json-file, local, syslog, journald, Fluentd, GELF, awslogs, Splunk, and none logging drivers
- Fluentd and fluent-plugin-elasticsearch
- Elasticsearch and Kibana Docker images
- Python standard library logging
- Node.js with Pino
- Go with Uber Zap
- rsyslog

## Sources Consulted
- Docker documentation: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker documentation: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker documentation: Local file logging driver - https://docs.docker.com/engine/logging/drivers/local/
- Docker documentation: Syslog logging driver - https://docs.docker.com/engine/logging/drivers/syslog/
- Docker documentation: Fluentd logging driver - https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker documentation: Use docker logs with remote logging drivers - https://docs.docker.com/engine/logging/dual-logging/
- Docker documentation: Customize log driver output - https://docs.docker.com/engine/logging/log_tags/
- Docker documentation: Compose fragments and YAML anchors - https://docs.docker.com/reference/compose-file/fragments/
- Docker documentation: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Fluentd documentation: forward input plugin - https://docs.fluentd.org/input/forward
- Fluentd documentation: parser filter plugin - https://docs.fluentd.org/filter/parser
- Fluentd documentation: record_transformer filter plugin - https://docs.fluentd.org/filter/record_transformer
- Fluentd documentation: Elasticsearch output plugin - https://docs.fluentd.org/output/elasticsearch
- Python documentation: logging and logging cookbook - https://docs.python.org/3/library/logging.html and https://docs.python.org/3/howto/logging-cookbook.html
- Pino documentation: API and redaction options - https://github.com/pinojs/pino/blob/main/docs/api.md
- Go package documentation: go.uber.org/zap - https://pkg.go.dev/go.uber.org/zap
- Go package documentation: crypto/rand - https://pkg.go.dev/crypto/rand

## Issues Found
- The logging driver comparison table said `docker logs` is unsupported for remote drivers such as syslog, fluentd, gelf, awslogs, and splunk. Docker Engine now provides dual logging through a local cache by default for drivers that do not support reading logs directly. Updated the table to describe cache-backed `docker logs` support unless disabled.
- The `local` driver example included `compress`, but Docker's documented `local` driver options are `max-size` and `max-file`; compression is automatic. Removed the unsupported option.
- The Fluentd `record_transformer` example used a Ruby expression without enabling Ruby evaluation. Added `enable_ruby true` and changed the hostname expression to the documented `${...}` form.
- The Fluentd Elasticsearch examples set both `index_name` and `logstash_format true`. The Elasticsearch plugin documentation says `logstash_format` supersedes `index_name`, so the `index_name` values would be ignored. Removed the ignored options and kept `logstash_prefix`.
- The Python logging example set `extra_fields` in a custom LogRecord factory and then passed `extra={"extra_fields": ...}` in a log call. Python logging rejects `extra` keys that overwrite existing LogRecord attributes. Replaced the factory with a logging filter that adds service context without conflicting with per-call extra fields.
- The Node.js Pino example referenced `generateRequestId()` without defining it. Added a small `crypto.randomUUID()` helper and the required `node:crypto` import.
- The Go Zap example referenced `generateRequestID()` without defining it. Added a simple helper using `crypto/rand` and `encoding/hex`.
- The production Docker Compose Fluentd logging anchor merged the whole logging mapping into `options`, which produced invalid option keys such as `driver` and nested `options`. Replaced it with an `x-fluentd-options` mapping and merged only logging options into each service.
- The production and troubleshooting Fluentd examples used the Compose service name `fluentd` as the default logging-driver address. Docker logging drivers connect from the Docker daemon on the host, not from the application container's Compose network. Changed same-host examples to use `localhost:24224` and described `FLUENTD_HOST` as a host-resolvable collector address.
- The `fluentd-buffer-limit` troubleshooting comment described the value as a byte buffer size, but Docker documents it as the number of events buffered in memory. Corrected the comment.
- The Docker log size script used `du -sh ... | tail -1`, which reports only the last matching file rather than a total across rotated log files. Changed it to `du -ch ... | tail -1` to report the total.
- The summary said async mode and retries prevent log loss during collector outages. Docker's Fluentd driver can still lose logs if buffers fill or writes fail, so the wording was changed to "reduce log loss."

## Review Notes
- Docker Compose still accepts `version: "3.8"` for backward compatibility, but modern Compose treats the top-level `version` field as obsolete and may warn about it.
- I validated the JSON snippets, YAML snippets, Python example, and JavaScript syntax locally. Go is not installed in this environment, so the Go snippet was reviewed against the official package documentation but not compiled locally.
