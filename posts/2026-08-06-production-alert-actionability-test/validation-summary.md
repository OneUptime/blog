# Validation Summary: Use an Actionability Test for Every Production Page

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus alerting rules
- Prometheus Alertmanager
- Service level objectives (SLOs), service level indicators (SLIs), and error budgets
- Multiwindow, multi-burn-rate alerting
- On-call operations and incident response
- Observability and monitoring

## Sources Consulted

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: On-Call](https://sre.google/workbook/on-call/)
- [Prometheus: Alerting Practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus: The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus: Alertmanager Overview](https://prometheus.io/docs/alerting/latest/overview/)
- [Prometheus: Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

## Issues Found

- The recovery-stability guidance referred generically to a "hold duration," which could obscure the different Prometheus behaviors involved. Replaced it with the explicit `for` and `keep_firing_for` settings: `for` delays transition from pending to firing, while `keep_firing_for` keeps an alert firing for a configured period after its expression stops matching and can reduce flapping or false resolutions.

## Review Notes

- The burn-rate formula and example are correct: for a 99.9% SLO, `0.0144 / 0.001 = 14.4`.
- The longer and shorter windows in multiwindow, multi-burn-rate alerting are described correctly: the longer window establishes material error-budget consumption, and the shorter window confirms that consumption is ongoing.
- The alert-contract YAML is a valid illustrative metadata schema, not a native Prometheus alerting-rule file. Its `example.net` links are intentionally non-production placeholders.
- All six external documentation links in the post were reachable and pointed to the stated official Google SRE or Prometheus resources at review time.
