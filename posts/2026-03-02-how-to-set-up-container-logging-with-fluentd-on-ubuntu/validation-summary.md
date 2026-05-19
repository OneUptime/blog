# Validation Summary: How to Set Up Container Logging with Fluentd on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Fluentd (td-agent v4 and the newer fluent-package)
- Docker (fluentd logging driver)
- Ubuntu (Jammy 22.04 / Focal 20.04)
- docker-compose
- Elasticsearch (`fluent-plugin-elasticsearch`)
- Amazon S3 (`fluent-plugin-s3`)
- Built-in Fluentd plugins: `forward`, `parser`, `record_transformer`, `file`, `copy`, `relabel`, `grep`, `stdout`, `monitor_agent`, `nginx`/`regexp` parsers

## Sources Consulted
- Fluentd configuration syntax: https://docs.fluentd.org/configuration/config-file
- `out_copy` output plugin: https://docs.fluentd.org/output/copy
- `out_relabel` output plugin: https://docs.fluentd.org/output/relabel
- `parser` filter plugin: https://docs.fluentd.org/filter/parser
- `record_transformer` filter plugin: https://docs.fluentd.org/filter/record_transformer
- `grep` filter plugin: https://docs.fluentd.org/filter/grep
- `monitor_agent` input plugin: https://docs.fluentd.org/input/monitor_agent
- JSON parser options: https://docs.fluentd.org/parser/json
- Fluentd CLI / `--dry-run`: https://docs.fluentd.org/deployment/command-line-option
- fluent-package installation: https://docs.fluentd.org/installation/install-fluent-package/install-by-deb-fluent-package
- fluent-package post-install notes (service name, paths): https://docs.fluentd.org/installation/post-installation-guide
- Docker fluentd logging driver options: https://docs.docker.com/config/containers/logging/fluentd/
- td-agent v4 install scripts: https://docs.fluentd.org/installation/install-by-deb (and https://www.fluentd.org/download)

## Issues Found
**Issue 1 — Invalid config in "Split Logs by Level" section.** The original snippet placed a `<filter>` block inside a `<store>` directive of the `@type copy` output plugin. The `copy` plugin's `<store>` blocks only accept output plugin configuration; they do not support nested filter directives, so this configuration would fail to load. Fixed by replacing the broken pattern with the canonical Fluentd approach: use `@type relabel` inside the copy to fork a copy of the stream into a `<label @errors>` section, where a real `<filter>` can run before the file output. Also added the required `<buffer tag,time>` for the file output's `${tag}` placeholder to be expandable.

## Review Notes
- `td-agent` v4 reached end-of-life on 2023-12-31. The post correctly presents the newer `fluent-package` as an alternative, but in the long term the td-agent installer instructions will need to be removed entirely. Acceptable for now since td-agent v4 still installs.
- The "Fall back gracefully if log line is not JSON" comment in the parser filter is slightly misleading — the parser filter's default `emit_invalid_record_to_error true` will route unparseable records to the error stream, not silently drop them. The comment is aspirational rather than wrong; left as-is to avoid scope creep.
- `docker-compose.yml` uses `version: "3.8"`. Compose v2 ignores the version key, but this is still widely seen in tutorials and not incorrect.
- `"#{Socket.gethostname}"` in `record_transformer` is evaluated once at config load time (Fluentd config-file Ruby interpolation), not per-event. This is fine for identifying the Fluentd host but worth noting if anyone expects per-event hostname resolution.
- All Docker `log-opts` keys used (`fluentd-address`, `fluentd-async`, `fluentd-retry-wait`, `fluentd-max-retries`, `tag`) match current Docker docs; `fluentd-async` is the current name (older `fluentd-async-connect` is deprecated).
