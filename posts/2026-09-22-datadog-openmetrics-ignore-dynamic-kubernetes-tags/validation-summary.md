# Validation Summary: How to Fix Datadog OpenMetrics ignore_tags Rules That Leave Dynamic Kubernetes Tags Behind

## Status

validated

## Post Type

Technical troubleshooting guide.

## Technologies Covered

- Datadog Agent, Autodiscovery, and Cluster Check Runners
- Datadog OpenMetrics V2 integration
- Prometheus/OpenMetrics labels and metric identity
- Kubernetes workload tags
- YAML configuration
- Python regular expressions

## Sources Consulted

- [Datadog OpenMetrics configuration example](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example): instance fields, metric mappings, tag filtering, and shared labels.
- [Datadog OpenMetrics V2 scraper source](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/scraper/base_scraper.py): configured and dynamic tag filtering, label exclusion, and renaming order.
- [Datadog OpenMetrics V2 base check source](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/base.py): forwarding dynamic tag updates to scrapers.
- [Datadog Agent commands](https://docs.datadoghq.com/agent/configuration/agent-commands/): Linux and Kubernetes command forms and the purpose of configcheck and status.
- [Datadog Cluster Check Runners](https://docs.datadoghq.com/containers/guide/clustercheckrunners/): where cluster checks execute.
- [Datadog Agent metric submission](https://docs.datadoghq.com/metrics/custom_metrics/agent_metrics_submission/): gauge submission behavior and why removing identifying tags does not aggregate independent values.
- [Datadog Metrics Summary](https://docs.datadoghq.com/metrics/summary/): historical tag values in metric discovery.
- [Python regular expression documentation](https://docs.python.org/3/library/re.html): re.search and anchored expressions.

## Issues Found

- The Kubernetes instructions told readers to run the preceding Linux commands, which use `sudo datadog-agent`, inside the Agent container. Datadog documents the container executable as `agent`. Updated that sentence to specify `agent configcheck` and `agent status` without `sudo`. The Linux command block remains valid and unchanged.

## Review Notes

- Confirmed that the current scraper applies ignore_tags regex searches to configured tags and dynamic updates, while the base check forwards those updates to its scrapers. This is not a universal filter for downstream enrichment or payload labels.
- Confirmed that exclude_labels is evaluated before rename_labels. Shared labels are populated before sample label filtering. The exclusion snippet belongs under the applicable instance.
- Checked the endpoint, namespace, metrics mapping, ignore_tags, and tags fields against the official configuration example. Both YAML examples parsed successfully with PyYAML.
- Executed the Python example successfully. Its assertion confirms regex behavior only, as the post correctly explains.
- Confirmed that Cluster Check Runners can execute cluster checks independently of node Agents. The warning about multiple producers and the recommendation to isolate a canary are sound diagnostic guidance.
- Gauge submissions do not automatically sum independent measurements whose contexts become identical. Preserving necessary identity dimensions is appropriate.
- Metrics Summary retains tag search values for a period after their last submission, supporting the distinction between discovery menus and fresh metric points.
- All three technical GitHub links resolve to the intended official resources. They track master, so the installed Agent and integration versions must still be inspected; no minimum fixed release is asserted or inferred.
- No live Datadog Agent, Kubernetes workload, or Datadog account was used for this review. Agent commands were checked against official documentation; actual endpoint availability, downstream enrichment, and pod-replacement behavior require verification in the target deployment.
