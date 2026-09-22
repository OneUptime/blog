# Validation Summary: How to Collapse `instance` and `pod` Labels Without Losing or Duplicating Metrics

## Status
validated

## Post Type
Technical guide with PromQL queries and a YAML recording rule.

## Technologies Covered
- Prometheus time-series labels, scraping, and relabeling
- PromQL aggregation, counter rates, and label transformations
- Prometheus recording rules and the promtool CLI
- Kubernetes Pods and Prometheus Operator ServiceMonitor resources
- Thanos Query high-availability replica deduplication

## Sources Consulted
- Prometheus data model: https://prometheus.io/docs/concepts/data_model/
- Prometheus jobs and instances: https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus query functions (`rate` and `label_replace`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators (`sum`, `count`, `by`, `without`, and comparisons): https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus configuration (relabeling and `rule_files`): https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus promtool CLI: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus Operator ServiceMonitor API: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor
- Thanos Query deduplication: https://thanos.io/tip/components/query.md/

## Issues Found
No technical issues found.

## Review Notes
- Reviewed both PromQL expressions and the repeated aggregation in the recording rule. The syntax and input/output types are correct. `sum by` retains the specified grouping dimensions and combines unlisted dimensions, including a subsequently introduced `route` label.
- Confirmed that applying `rate` to each counter before aggregation preserves per-series reset handling. The recorded result is already a per-second rate and should not be treated as another counter.
- Confirmed that removing identity labels and using `label_replace` do not sum measurements. Prometheus explicitly cautions that label removal must preserve unique series identities.
- The duplicate-collection expression counts series within each group and filters for counts greater than one. Its result requires investigation; legitimate endpoints or instrumentation dimensions can explain multiple series. Identical-label collisions or copies already deduplicated by a backend cannot be reliably exposed by this count alone.
- Thanos deduplicates series that differ only in configured replica labels. Application identity must remain distinguishable; removing all distinguishing application labels through replica configuration can merge independent traffic.
- The recording-rule YAML uses documented fields and a valid recording metric name. `rule_files` and `promtool check rules` are current interfaces. To check a saved file, supply its path, for example `promtool check rules /path/to/example.rules.yml`; the CLI also supports standard input when no file is specified.
- Recording rules write additional derived series; they do not delete their raw inputs. Historical debugging remains subject to the configured retention policy.
- The 3 + 7 = 10 and duplicated 20 examples correctly illustrate additive independent traffic and double counting, assuming stable observed rates over the query window. Real rate estimates depend on scrape coverage and extrapolation.
- The identity examples are explicitly described as incomplete exposition samples. The queries assume the actual ingested data has the selected `job="checkout-pods"` label and the intended grouping labels.
- All post links were opened and resolved to the intended documentation or author profile. No pinned software versions or deprecated APIs appear in the examples; the Thanos link targets rolling tip documentation.
- This was a documentation-based review. No live Prometheus, Kubernetes, or Thanos deployment was exercised, and promtool was not available locally. README.md required no changes.
