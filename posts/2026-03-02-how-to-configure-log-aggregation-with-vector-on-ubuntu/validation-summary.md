# Validation Summary: How to Configure Log Aggregation with Vector on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Vector
- Vector Remap Language (VRL)
- systemd journald
- syslog
- Elasticsearch and OpenSearch
- Grafana Loki
- AWS S3
- Prometheus metrics
- systemd services

## Sources Consulted
- Vector APT installation documentation: https://vector.dev/docs/setup/installation/package-managers/apt/
- Vector manual archive installation documentation: https://vector.dev/docs/setup/installation/manual/from-archives/
- Vector 0.55.0 release notes and downloads: https://vector.dev/releases/0.55.0/
- Vector configuration reference: https://vector.dev/docs/reference/configuration/
- Vector journald source reference: https://vector.dev/docs/reference/configuration/sources/journald/
- Vector route transform reference: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector sample transform reference: https://vector.dev/docs/reference/configuration/transforms/sample/
- Vector file sink reference: https://vector.dev/docs/reference/configuration/sinks/file/
- Vector Elasticsearch sink reference: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector Loki sink reference: https://vector.dev/docs/reference/configuration/sinks/loki/
- Vector AWS S3 sink reference: https://vector.dev/docs/reference/configuration/sinks/aws_s3/
- Vector source reference: https://vector.dev/docs/reference/configuration/sources/vector/
- Vector sink reference: https://vector.dev/docs/reference/configuration/sinks/vector/
- Vector template syntax reference: https://vector.dev/docs/reference/configuration/template-syntax/
- Local Vector 0.55.0 CLI validation using the official x86_64 Linux archive.

## Issues Found
- The APT repository setup command used the old `repositories.timber.io` script. Updated it to the current official `https://setup.vector.dev` command.
- The direct `.deb` download used an outdated 0.39.0 URL and an incorrect Debian package filename. Updated it to the current 0.55.0 amd64 package URL and matching `dpkg` command.
- The route transform used invalid VRL infix `contains` syntax. Replaced it with `contains(downcase(string!(.message)), "...")`, which validates with Vector 0.55.0.
- Elasticsearch sink examples used the removed/deprecated top-level `index` option. Updated them to `bulk.index`.
- The Loki labels referenced fields that do not match the documented journald output shape. Updated the host and service labels to use Vector template paths for `.host` and `._SYSTEMD_UNIT`.
- The advanced VRL transform compared `.status` as an untyped value, causing a fallible predicate compiler error. Added `.status = int!(.status)` before the comparisons.
- The sampling example used `inputs = ["all_logs"]`, but `all_logs` is a sink in the earlier example and cannot be used as a transform input. Changed it to `parsed_logs`.
- The sampling example claimed to sample only DEBUG messages but excluded only ERROR and WARN from sampling. Updated the condition so non-DEBUG events bypass sampling and DEBUG events are sampled at 1 in 10.
- Vector sink examples used `compression = "gzip"`, but the Vector sink's `compression` option is boolean. Changed it to `compression = true`.
- The troubleshooting command piped a sample event into `vector test --config`, but `vector test` runs config unit tests and does not accept piped sample events that way. Replaced it with a working `vector vrl --input ... --print-object` example.

## Review Notes
The post is technically relevant and now validates against current Vector 0.55.0 syntax for the main examples checked locally. Some snippets remain partial examples and assume upstream components such as `parsed_logs` or `local_sources` exist in the user's full configuration.
