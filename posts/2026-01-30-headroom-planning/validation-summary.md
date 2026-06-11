# Validation Summary: How to Create Headroom Planning

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- Prometheus and PromQL
- Grafana dashboard JSON
- Kubernetes resource limits and kube-state-metrics
- Capacity planning and SRE headroom modeling

## Sources Consulted
- Python `dataclasses` documentation: https://docs.python.org/3/library/dataclasses.html
- Python `statistics` documentation: https://docs.python.org/3/library/statistics.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- Python `enum` documentation: https://docs.python.org/3/library/enum.html
- Python `json` documentation: https://docs.python.org/3/library/json.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The growth projection example used `timedelta(days=30 * month)`, which can duplicate or skip displayed calendar months depending on the start date. Added calendar-month arithmetic and a fixed `start_date` for reproducible example output.
- The growth projection output said scaling was needed in May 2026 even though the first projected capacity breach is March 2026. Updated the output to match the code.
- The seasonal capacity output did not match the formula for months with seasonal multipliers below or above 1. Updated the expected capacity and gap values.
- The provisioning example defined `DATACENTER_RACK` in the enum but did not include a matching provisioning profile, causing the loop over all resource types to raise a `KeyError`. Added a data center rack profile and updated the output table.
- The cost optimization snippet used `math.exp()` without importing `math` in that snippet. Added the missing import and updated rounded output values.
- The Prometheus CPU headroom examples used `avg(rate(container_cpu_usage_seconds_total...)) / sum(limits)`, which mixes average per-series usage with total limits. Changed CPU usage aggregation to `sum(rate(...)) / sum(limits)`.
- The Grafana "Days Until Headroom Exhausted" expression mixed percent units with a raw utilization derivative. Reworked the expression to divide raw remaining headroom by the raw utilization slope and convert seconds to days.
- The Python monitoring script used `datetime.now()` without importing `datetime`, and used the same incorrect CPU aggregation as the Prometheus examples. Added the import and corrected the aggregation.

## Review Notes
The Python snippets were parsed and executed together successfully after fixes. The JSON dashboard snippet and YAML alert rules parse successfully. `promtool` was not installed locally, so PromQL was reviewed against official Prometheus syntax and function documentation rather than validated with `promtool`.
