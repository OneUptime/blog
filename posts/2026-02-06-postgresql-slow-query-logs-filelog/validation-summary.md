# Validation Summary: How to Configure the Filelog Receiver to Parse PostgreSQL Slow Query Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PostgreSQL logging configuration
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- Stanza log operators
- OpenTelemetry transform processor
- OpenTelemetry filter processor
- OpenTelemetry count connector
- OpenTelemetry database semantic conventions

## Sources Consulted
- PostgreSQL official logging configuration documentation: https://www.postgresql.org/docs/14/runtime-config-logging.html
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Stanza move operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- OpenTelemetry Stanza remove operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/remove.md
- OpenTelemetry Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry count connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry database semantic conventions registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/

## Issues Found
- The PostgreSQL `log_line_prefix` used `%t`, which emits a timestamp without milliseconds, while the example output and Collector regex expected millisecond precision. Changed it to `%m`, which PostgreSQL documents as timestamp with milliseconds.
- The filelog operator chain reused `regex_parser`, `move`, and `remove` operators without unique IDs. The filelog receiver documentation states that repeated operators of the same type must specify unique IDs, so IDs were added.
- The second `regex_parser` used `preserve_to`, which is not a documented `regex_parser` configuration field. Removed it because parsing from `attributes.message` already preserves that source field.
- The post labeled deprecated database attributes as semantic conventions. Replaced `db.name` with `db.namespace`, `db.statement` with `db.query.text`, and changed the PostgreSQL user and duration values to PostgreSQL-specific custom attributes.
- The transform processor example used unprefixed log paths in an advanced `context: log` block. Updated the statement to use `log.attributes[...]` and added `error_mode: ignore`, matching current transform processor documentation.
- The filter processor example used the older `logs.log_record` configuration shape. Updated it to the currently documented `log_conditions` syntax and `log.body` path.
- The count connector grouping attributes were updated to match the corrected log attributes: `db.namespace` and `postgresql.user`.

## Review Notes
- The examples assume the OpenTelemetry Collector Contrib or Kubernetes distribution because the filelog receiver, transform processor, and count connector are contrib components.
- `postgresql.query.duration_ms` and `postgresql.user` are custom attributes, not OpenTelemetry semantic convention attributes. They are used because the current database semantic convention registry has no direct replacement for `db.user` and no standard slow-query-log duration attribute.
