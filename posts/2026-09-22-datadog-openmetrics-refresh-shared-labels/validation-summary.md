# Validation Summary: How to Refresh Shared OpenMetrics Metadata Labels in Datadog After They Change

## Status
validated

## Post Type
Technical troubleshooting guide with YAML configuration, metric exposition, and Agent commands.

## Technologies Covered
- Datadog Agent and the OpenMetrics v2 check
- Prometheus/OpenMetrics metric exposition
- Shared metadata labels and conditional label matching
- YAML and Linux Agent CLI commands

## Sources Consulted
- [Datadog OpenMetrics configuration reference](https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example): instance options, metric mapping, shared labels, cache defaults, and memory considerations.
- [Datadog shared-label implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/labels.py): caching, cleanup, buffering, match sets, and label collision behavior.
- [Datadog OpenMetrics scraper implementation](https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/scraper/base_scraper.py): prefix removal, enrichment before metric selection, and sample labeling.
- [Datadog Agent commands](https://docs.datadoghq.com/agent/configuration/agent-commands/): `configcheck` and `check` subcommands.
- [Datadog host collection guide](https://docs.datadoghq.com/integrations/guide/prometheus-host-collection/): configuration location, metric naming, and restart requirements.
- [Datadog integration troubleshooting](https://docs.datadoghq.com/agent/troubleshooting/integrations/): restarting after file configuration changes.
- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/): gauge exposition, Info family/sample naming, and EOF marker.
- [Datadog Metrics Summary](https://docs.datadoghq.com/metrics/summary/): metric tag inspection and time-window context.

## Issues Found
1. **Configuration activation was omitted.** Added the initial Agent restart needed to load a file-based configuration change. The metadata-change test then runs without further restarts. Clarified that the standalone diagnostic command does not test the running Agent's cache.
2. **Info suffix wording was ambiguous.** The gauge example has no `_info` suffix. Scoped the naming explanation to an OpenMetrics 1.0 Info family and distinguished its sample name from its family name.
3. **Missing match-key behavior needed precision.** Explained that an absent `queue` label can create an empty match set and apply metadata to unrelated measurements; the implementation does not reject that row automatically.
4. **Cluster matching instructions were incomplete.** Specified that the cluster identifier must be present on metadata rows as well as measurement rows and in the `match` list.

## Review Notes
- The configuration snippet required no changes. It uses valid instance options and maps the measurement to `workers.queue.depth`.
- Parsed the YAML successfully and exercised the downloaded upstream `LabelAggregator` in an isolated Python harness, substituting only its unrelated `no_op` import. Two successive payloads confirmed refreshed ownership with caching disabled, retained ownership with caching enabled, correct queue isolation, cleanup after processing, and successful enrichment with metadata before or after measurements.
- Source inspection confirmed that prefix removal occurs before shared-label lookup and metadata need not be selected for ordinary submission. Duplicate matching rows and conflicting measurement labels can overwrite values, supporting the post's deterministic matching advice.
- The gauge text and command syntax were reviewed against official references. No live exporter, installed Datadog Agent, or Datadog account was used; end-to-end submission and tag-menu retention were not experimentally verified.
- Historical data and tag suggestions are not sufficient evidence of current cache behavior. No fixed tag-menu retention period is asserted.
- Upstream `master` is mutable. The post appropriately advises checking the implementation bundled with the deployed Agent, particularly for ordering behavior. No minimum version for the buffering behavior is claimed.
- Both technical reference links in the original post resolve to the intended official repository resources. Changes preserve the original sections and configuration example.
