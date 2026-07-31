# Validation Summary: What Is the Right Scrape Interval for Host Metrics?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus configuration
- Prometheus node_exporter
- Alertmanager
- Linux host metrics
- Prometheus local storage and remote write

## Sources Consulted

- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus node exporter guide](https://prometheus.io/docs/guides/node-exporter/)
- [Prometheus node_exporter collector documentation](https://github.com/prometheus/node_exporter#collectors)
- [Prometheus node_exporter collector filtering](https://github.com/prometheus/node_exporter#filtering-enabled-collectors)
- [Prometheus metric types](https://prometheus.io/docs/concepts/metric_types/)
- [Prometheus `rate()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording-rule evaluation behavior](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/#failed-rule-evaluations-due-to-slow-evaluation)
- [Prometheus storage guidance](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus scrape-loop implementation](https://github.com/prometheus/prometheus/blob/main/scrape/scrape.go)

## Issues Found

- The counter discussion stated without qualification that a later scrape includes all work accumulated between samples. Counters can reset, and work accumulated before a reset can be unobservable when the reset happens between scrapes. The paragraph now limits the claim to counters that do not reset and notes the reset caveat.
- The timeout discussion could imply that Prometheus overlaps scrapes for one target. The current Prometheus scrape loop processes a target's scrapes sequentially. The wording now describes the actual risk: longer timeouts can prolong resource pressure across many targets.

## Review Notes

- All three YAML configuration snippets passed `promtool check config` with Prometheus 3.13.2.
- All five PromQL selectors passed Prometheus 3.13.2 rule-expression validation.
- The interval and `rate()`-window recommendations are operational heuristics, and the post correctly labels them as recommendations rather than Prometheus requirements or defaults.
- The `systemd` collector in the slow job is disabled by default in current node_exporter releases; the post correctly states that scrape-time `collect[]` filtering does not enable a collector that the process has not enabled.
- All external links in the post resolved successfully during validation.
