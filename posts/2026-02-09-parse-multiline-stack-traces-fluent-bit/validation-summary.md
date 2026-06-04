# Validation Summary: How to Parse Multi-Line Stack Traces in Kubernetes Logs with Fluent Bit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Fluent Bit
- Fluent Bit tail input
- Fluent Bit multiline parsers
- Fluent Bit Kubernetes filter
- Python logging
- Java, Python, and Go stack traces

## Sources Consulted
- Fluent Bit official documentation: Multiline parsing, configurable multiline parsers, `flush_timeout`, `parser`, `key_content`, `start_state`, and `rule` syntax: https://docs.fluentbit.io/manual/data-pipeline/parsers/multiline-parsing
- Fluent Bit official documentation: Tail input multiline support, `multiline.parser`, and legacy `Multiline`, `Parser_Firstline`, and `Parser_N` behavior: https://docs.fluentbit.io/manual/3.1/pipeline/inputs/tail/
- Fluent Bit official documentation: Kubernetes filter configuration, `Merge_Log`, `K8S-Logging.Parser`, and Kubernetes tail examples: https://docs.fluentbit.io/manual/data-pipeline/filters/kubernetes
- Kubernetes official documentation: Container runtimes and dockershim removal / CRI runtime requirement context: https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Python official documentation: `logging.basicConfig`, `logging.getLogger`, and `Logger.exception` behavior: https://docs.python.org/3/library/logging.html

## Issues Found
- The post defined multiline stack trace patterns as normal `[PARSER]` regex parsers. Fluent Bit's current multiline engine requires `[MULTILINE_PARSER]` definitions with state rules. Changed the parser examples to use `[MULTILINE_PARSER]`, `type regex`, `start_state`, continuation `rule` entries, and `flush_timeout`.
- The tail input examples used the legacy `Multiline On`, `Multiline_Flush`, `Parser_Firstline`, and `Parser_1` settings while also specifying `Parser docker`. Fluent Bit documentation says the modern tail input should use `multiline.parser`, and the legacy multiline mode does not use `Parser` as shown. Updated the examples to use `multiline.parser`.
- The Kubernetes examples assumed Docker parsing for `/var/log/containers/*.log`. Modern Kubernetes uses CRI-compatible runtimes, and the official Fluent Bit Kubernetes examples use CRI-oriented multiline parsing for container logs. Updated custom multiline parsers to apply the built-in `cri` parser and match against `key_content log`.
- The tuning and troubleshooting sections referenced `Multiline_Flush` and `Parser_Firstline`, which no longer matched the corrected configuration. Updated those references to `flush_timeout` and `start_state`.
- The Python and Java language-specific descriptions did not match the corrected parser start lines precisely. Adjusted the wording to reflect timestamp/log-level starts and traceback continuation lines.

## Review Notes
The corrected examples target CRI-formatted Kubernetes container logs, which is the expected path for current Kubernetes clusters. Clusters using Docker JSON logs through a CRI adapter may need equivalent parser settings using Fluent Bit's Docker parser or an additional multiline filter.
