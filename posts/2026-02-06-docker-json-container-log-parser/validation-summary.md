# Validation Summary: How to Parse Docker JSON Container Log Files with the Container Log Parser

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Docker json-file logging driver
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- Stanza `container`, `regex_parser`, `json_parser`, `severity_parser`, `router`, and `noop` operators
- OpenTelemetry Collector filter, resource, batch, and OTLP components
- Docker observer / Docker metadata enrichment concepts

## Sources Consulted
- Docker JSON File logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker logging driver configuration documentation: https://docs.docker.com/engine/logging/configure/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector `container` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- OpenTelemetry Collector `regex_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector `json_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector `severity_parser` and severity mapping documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md and https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector `router` and `noop` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/router.md and https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/noop.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Docker observer documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/observer/dockerobserver/README.md
- OpenTelemetry Collector Docker Stats receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/README.md

## Issues Found
- The post claimed the `container` operator maps Docker `stream` to severity and that `stderr` maps to `ERROR`. The official container operator output stores the stream in `log.iostream`; severity parsing is optional. Updated the explanation to say severity requires a separate parsing step.
- The metadata extraction example used `preserve_to`, which is not a documented `regex_parser` field. Removed it because parsing from `attributes["log.file.path"]` into the default `attributes` destination does not remove the source path.
- The router example sent matching logs to parser branches, but the parser operators did not explicitly route to the terminal `noop`, so entries could continue into the next parser unintentionally. Added `output: keep_raw` to both parser branches.
- The label filtering note implied the Docker Stats receiver could be paired with filelog logs to filter by container labels. Docker Stats exposes labels as metric labels, while filelog does not read Docker labels from log files. Updated the text to require a separate Docker metadata path such as Docker observer with receiver creator or other enrichment.
- The health-check filtering example used the older `logs.exclude` filter processor syntax. Updated it to current `log_conditions` OTTL syntax with `error_mode: ignore`.

## Review Notes
The Docker log format, Docker log path pattern, filelog receiver fields (`include`, `start_at`, `include_file_path`, `include_file_name`, `fingerprint_size`, and `max_concurrent_files`), resource processor action, and OTLP exporter shape are consistent with current documentation. The container parser can auto-detect Docker, CRI-O, and containerd formats; the examples focus on Docker JSON logs.
