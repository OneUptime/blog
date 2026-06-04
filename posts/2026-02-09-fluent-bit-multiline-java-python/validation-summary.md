# Validation Summary: How to Configure Fluent Bit Multiline Parsers for Java and Python Exception Logs

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Fluent Bit multiline parsers
- Fluent Bit Tail input
- Fluent Bit multiline, Kubernetes, Lua, and Modify filters
- Kubernetes ConfigMaps and DaemonSets
- Java exception logging
- Python exception logging
- Grafana Loki and LogQL

## Sources Consulted
- Fluent Bit official documentation: Multiline parsing, https://docs.fluentbit.io/manual/data-pipeline/parsers/multiline-parsing
- Fluent Bit official documentation: Tail input multiline support, https://docs.fluentbit.io/manual/3.2/pipeline/inputs/tail
- Fluent Bit official documentation: Multiline filter, https://docs.fluentbit.io/manual/data-pipeline/filters/multiline-stacktrace
- Fluent Bit official documentation: Kubernetes filter, https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Fluent Bit official documentation: Loki output, https://docs.fluentbit.io/manual/pipeline/outputs/loki
- Grafana Loki official documentation: LogQL, https://grafana.com/docs/loki/latest/logql/
- Grafana Loki official documentation: LogQL template functions, https://grafana.com/docs/loki/latest/logql/template_functions/
- Docker Hub: fluent/fluent-bit image tags, https://hub.docker.com/r/fluent/fluent-bit

## Issues Found
- The post used Fluent Bit's older Tail multiline options (`Multiline`, `Multiline_Flush`, `Parser_Firstline`, and `Parser_N`) while presenting the configuration as current production-ready guidance. Updated the examples to use `[MULTILINE_PARSER]`, `Rule`, `Flush_Timeout`, and `Multiline.Parser`, which match current Fluent Bit multiline documentation.
- The Kubernetes container log examples combined Docker parsing and application stack-trace parsing in the old Tail multiline configuration. Updated the Tail input to reassemble Docker/CRI runtime fragments first with `Multiline.Parser docker, cri`, then apply the multiline filter to the `log` key for Java and Python stack traces.
- The parser ConfigMap key and DaemonSet mount path still used `parsers.conf`. Updated them to `parsers_multiline.conf` to match the corrected multiline parser examples.
- The Lua section implied Lua flags could control multiline assembly after records were already processed. Reworded it to describe format tagging for downstream routing and removed misleading multiline marker fields.
- The Fluent Bit image tag was outdated (`fluent/fluent-bit:2.2`). Updated it to `fluent/fluent-bit:5.0`.
- The Java test application used `java.util.logging` default output, which would not match the configured Java multiline parser. Added a custom formatter that emits the timestamp, level, logger, message, and stack trace in the format shown by the parser.
- The Loki verification queries filtered on a `level` label that the output configuration did not create. Updated the queries to filter on log content and to check for standalone stack-frame lines with a LogQL regex.
- The tuning and troubleshooting sections referenced old multiline settings and incorrectly suggested `Skip_Long_Lines` for multiline truncation. Updated them to use `Flush_Timeout` and `multiline_buffer_limit`, consistent with Fluent Bit's current multiline buffer documentation.
- The edge-case snippets used standalone `[PARSER]` blocks after the article had been corrected to use `[MULTILINE_PARSER]`. Converted them to additional multiline `Rule` examples.

## Review Notes
The examples are now aligned with Fluent Bit's current multiline parser and multiline filter model. In a real cluster, the Java and Python parser snippets should be combined into the same mounted `parsers_multiline.conf` ConfigMap if both inputs run in a single Fluent Bit DaemonSet.
