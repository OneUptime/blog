# Validation Summary: How to Implement Cost-Aware Capacity Planning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (dataclasses, typing, statistics, math, datetime modules)
- YAML configuration
- Mermaid diagrams
- AWS EC2 instance pricing (m5 family) and purchasing models (Reserved, On-Demand, Spot)
- FinOps / cost-aware SRE practices
- Capacity planning concepts (utilization buffers, anomaly detection, tiered strategies)

## Sources Consulted
- Python `datetime` documentation, specifically the deprecation of `datetime.utcnow()` introduced in Python 3.12 (https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow)
- Python `dataclasses` documentation (https://docs.python.org/3/library/dataclasses.html)
- Python `statistics` module documentation (https://docs.python.org/3/library/statistics.html)
- Python `typing` module — `Optional`, `List`, `Dict`, `Tuple` usage (https://docs.python.org/3/library/typing.html)
- AWS EC2 On-Demand pricing reference for the m5 family in the US East (N. Virginia) region (https://aws.amazon.com/ec2/pricing/on-demand/) — m5.large ~$0.096/hr, m5.xlarge ~$0.192/hr, m5.2xlarge ~$0.384/hr (cited in the post as an example)
- Mermaid diagram syntax reference for `flowchart TD`, `flowchart LR`, and `subgraph` (https://mermaid.js.org/syntax/flowchart.html)

## Issues Found
- **Deprecated `datetime.utcnow()` usage**: The original post used `datetime.datetime.utcnow()` in `cost_tracker.py` and `datetime.utcnow()` in `cost_anomaly_detector.py`. Both forms are deprecated in Python 3.12+ and emit `DeprecationWarning`. Replaced with the timezone-aware equivalent: `datetime.datetime.now(datetime.timezone.utc)` and `datetime.now(timezone.utc)` respectively. Added `timezone` to the `from datetime import ...` line in the anomaly detector snippet so the import resolves cleanly.

## Review Notes
- The YAML snippet uses percent-suffixed values (e.g., `target_utilization: 50%`). In YAML these are parsed as strings, not numbers — that is acceptable here because the file is illustrative configuration rather than runnable input, but a real consumer would need to strip the `%` or define a custom schema. Left as-is to preserve author intent.
- The economies-of-scale model in `project_capacity_costs` is a simplified illustrative model (geometric reduction per doubling) rather than a calibrated cost curve; this is appropriately framed by the docstring.
- AWS EC2 pricing for m5 instances is presented explicitly as "AWS EC2 pricing example" — the values shown are consistent with on-demand Linux pricing in US East (N. Virginia) at time of review, but readers should consult the live AWS pricing page for current rates.
- The anomaly detector's severity tiering (`> 3`, `> 2.5`, else `info`) is gated by `abs(deviation) > self.threshold_std_devs` (default 2.0), so with default settings the `info` branch covers deviations between 2.0 and 2.5 std devs — this is internally consistent.
- All Mermaid diagrams parse with valid `flowchart` and `subgraph` syntax.
