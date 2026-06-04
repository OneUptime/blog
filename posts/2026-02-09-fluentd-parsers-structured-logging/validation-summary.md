# Validation Summary: How to configure Fluentd parsers for structured logging formats

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fluentd parser plugins
- Fluentd tail, syslog, parser, record_transformer, and file plugins
- JSON, nginx, Apache, syslog, regexp, multiline, CSV, and none parsers
- fluent-plugin-multi-format-parser
- Fluentd CLI tools

## Sources Consulted
- Fluentd Parser Plugins: https://docs.fluentd.org/parser
- Fluentd Parse Section: https://docs.fluentd.org/configuration/parse-section
- Fluentd tail input plugin: https://docs.fluentd.org/input/tail
- Fluentd syslog input plugin: https://docs.fluentd.org/input/syslog
- Fluentd syslog parser: https://docs.fluentd.org/parser/syslog
- Fluentd JSON parser: https://docs.fluentd.org/parser/json
- Fluentd nginx parser: https://docs.fluentd.org/parser/nginx
- Fluentd Apache2 parser: https://docs.fluentd.org/parser/apache2
- Fluentd regexp parser: https://docs.fluentd.org/parser/regexp
- Fluentd CSV parser: https://docs.fluentd.org/parser/csv
- Fluentd multiline parser: https://docs.fluentd.org/parser/multiline
- Fluentd parser filter: https://docs.fluentd.org/filter/parser
- Fluentd record_transformer filter: https://docs.fluentd.org/filter/record_transformer
- Fluentd single_value formatter: https://docs.fluentd.org/formatter/single_value
- Fluentd file output plugin: https://docs.fluentd.org/output/file
- Fluentd command-line options: https://docs.fluentd.org/deployment/command-line-option
- fluent-plugin-multi-format-parser README: https://github.com/repeatedly/fluent-plugin-multi-format-parser

## Issues Found
- Replaced `%L` with `%N` in Fluentd `time_format` examples because the current parse-section documentation says to use `%N` for sub-second precision.
- Corrected the nginx parser example to include the `host` field emitted by Fluentd's built-in nginx parser and updated the format comment to match the documented parser pattern.
- Added a note that `multi_format` comes from the third-party `fluent-plugin-multi-format-parser` plugin, not Fluentd core.
- Moved `multiline_flush_interval` to the `tail` source scope because it is an `in_tail` parameter, not a multiline parser parameter.
- Replaced the CSV header-row example because Fluentd's built-in CSV parser requires explicit `keys` and does not support `header_row`.
- Corrected the supported `types` list to use documented names: `integer` and `bool`, not `int` or `boolean`.
- Removed the unsupported `unmatched_lines_tag` setting from the `in_tail` example and changed the formatter `message_key` to the documented `unmatched_line` field.
- Fixed the complex parser example by using `hash_value_field parsed_payload`; otherwise parsed JSON fields would be merged into the record and `record.dig("payload", "level")` would not work.
- Replaced the parser testing commands that implied `fluent-cat` tests tail parsing with separate examples for `fluentd --dry-run`, running a tail-based test config, and testing `in_forward` input with `fluent-cat`.

## Review Notes
The post is technically relevant and contains multiple Fluentd configuration examples. Local runtime validation was not possible because this workspace does not have `ruby`, `fluentd`, or `fluent-cat` installed; the review was completed against official Fluentd documentation and the multi-format parser's upstream README.
