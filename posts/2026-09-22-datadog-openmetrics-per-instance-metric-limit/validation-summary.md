# Validation Summary: How to Keep a Datadog OpenMetrics Check Within Its Per-Instance Metric Limit

## Status

validated

## Post Type

Technical guide for configuring and troubleshooting metric collection.

## Technologies Covered

- Datadog Agent and the generic OpenMetrics V2 check
- Prometheus/OpenMetrics counters, classic histograms, and labels
- YAML integration configuration
- Linux Agent diagnostic commands

## Sources Consulted

- [Datadog OpenMetrics integration documentation](https://docs.datadoghq.com/integrations/openmetrics/)
- [Datadog OpenMetrics configuration reference](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example)
- [OpenMetrics V2 base implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/base.py)
- [OpenMetrics V2 scraper implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/scraper/base_scraper.py)
- [OpenMetrics V2 metric transformation configuration](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transform.py)
- [OpenMetrics histogram transformer](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transformers/histogram.py)
- [Datadog Agent commands](https://docs.datadoghq.com/agent/configuration/agent-commands/)
- [Datadog Agent check troubleshooting](https://docs.datadoghq.com/agent/troubleshooting/agent_check_status/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Prometheus metric types](https://prometheus.io/docs/concepts/metric_types/)

## Issues Found

No technical issues found.

## Review Notes

- Confirmed the documented 2,000-metric per-instance limit and the V2 default. Agent status is the documented place to inspect returned counts. The post correctly distinguishes collection measurements from billing rather than claiming that counting families predicts either one.
- Verified the three Agent subcommands. The shell examples are suitable for a Linux host installation; container and cluster runners require invoking the binary in the appropriate runtime. Datadog also documents running standalone checks as the `dd-agent` user.
- Checked the YAML structure and option types against the official configuration. Named mappings, namespace, static tags, regex inclusion/exclusion, and label-based exclusion are supported. The second YAML block is an instance configuration fragment.
- Confirmed that counter selectors omit `_total`; Datadog documents this behavior starting with Agent 7.32.0. The example uses the current `openmetrics_endpoint` configuration, not legacy `prometheus_url` mode.
- Confirmed that disabling histogram buckets preserves sum and count handling in the example. Enabling `histogram_buckets_as_distributions` implicitly re-enables bucket collection; the supplied configuration does not enable that override.
- Confirmed that label-based sample exclusion happens before label renaming. Excluded labels are omitted from tags without aggregating source samples, supporting the post's warning about collapsing contexts.
- Label exclusion values are regex searches in the current implementation. The example value `sandbox` also matches values containing that substring; use `^sandbox$` if exact equality is required in a particular deployment.
- Verified the 20 × 5 × 10 = 1,000 label-combination estimate and the classic-histogram expansion explanation. Avoiding unbounded labels agrees with Prometheus guidance.
- The integration documentation requires unique endpoint URLs. The post appropriately asks readers to check uniqueness before splitting collection across instances.
- The linked integration documentation, configuration reference, and V2 base source resolve to the intended resources. GitHub `master` links are moving references, so behavior should be compared with the installed Agent version when troubleshooting.
- Review used official documentation and implementation inspection. No live Datadog Agent, exporter, or production traffic was exercised; endpoint reachability, actual submission counts, and dashboard/alert coverage still require the operational verification described in the post.
- README.md was left unchanged.
