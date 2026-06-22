# Validation Summary: How to Parse Multi-Line Logs with Promtail

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Promtail
- Promtail pipeline stages
- Multiline log parsing
- RE2 regular expressions
- Java/JVM, Python, Go, Node.js, .NET, PostgreSQL, MySQL, Nginx, and Apache log formats

## Sources Consulted
- Grafana Loki Promtail multiline stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/multiline/
- Grafana Loki Promtail regex stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/regex/
- Grafana Loki Promtail timestamp stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/timestamp/
- Grafana Loki Promtail JSON stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/json/
- Grafana Loki Promtail labels stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Grafana Loki Promtail output stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/output/
- Grafana Loki Promtail match stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/match/
- Grafana Loki Promtail troubleshooting documentation: https://grafana.com/docs/loki/latest/send-data/promtail/troubleshooting/
- Grafana Loki 3.6 release notes and Promtail deprecation note: https://grafana.com/docs/loki/latest/release-notes/v3-6/

## Issues Found
- Promtail is now deprecated and reached end-of-life on March 2, 2026. Added a note clarifying that the examples are for existing Promtail deployments and that Grafana Alloy should be considered for new deployments.
- The Python exception multiline pattern treated final exception summary lines such as `ConnectionError:` as new first lines, which can split a traceback into two log entries. Narrowed the pattern to timestamp-prefixed entries and `Traceback` starts.
- The local testing section used `promtail -dry-run` without piping the sample file through stdin, so it did not actually test the sample data. Replaced it with `-check-syntax` for config validation and a `cat /tmp/test.log | promtail --stdin --dry-run --inspect ...` command for pipeline testing.
- The `grep -E` test used `\d` and `\s`, which are not POSIX extended regular expression tokens. Replaced them with POSIX-compatible `[0-9]` and `[[:space:]]` expressions.

## Review Notes
The Promtail pipeline stage schemas, including `multiline`, `regex`, `json`, `labels`, `output`, `timestamp`, and `match`, are consistent with Grafana's documentation. The examples remain useful for maintaining existing Promtail installations, but new deployments should prefer Grafana Alloy because Promtail is past EOL as of the validation date.
