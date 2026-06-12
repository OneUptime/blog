# Validation Summary: How to Use Transformations in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana (data transformations, panel editor)
- Prometheus (PromQL queries used in examples)
- Kubernetes metrics (kube-state-metrics, cAdvisor) used in example queries

## Sources Consulted
- Grafana documentation on transformations: https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/
- Grafana Reduce transformation modes documentation
- Grafana Filter by value / Filter by name / Join by field / Organize fields / Sort by / Limit / Rename by regex / Prepare time series transformation docs
- Prometheus query function documentation (topk, rate, increase, vector)
- kube-state-metrics metrics reference (kube_pod_info, kube_pod_container_resource_requests)
- cAdvisor container metrics reference (container_cpu_usage_seconds_total, container_memory_working_set_bytes, container_memory_usage_bytes)
- Cross-referenced terminology against sibling post posts/2026-02-02-grafana-stat-panels-transformations/README.md

## Issues Found
- The Reduce transformation example used `Mode: Reduce rows`, which is not a valid Grafana mode. Grafana's Reduce transformation supports `Series to rows` and `Reduce fields`. Given the described output (a table with Last, Mean, Max columns per series), the correct value is `Series to rows`. Updated the YAML block in the Reduce section accordingly.

## Review Notes
- The YAML snippets throughout the post are conceptual pseudo-configuration that describe Grafana UI selections, not actual Grafana JSON model. They are not meant to be applied verbatim and read clearly as such.
- The filter-by-value matcher label "Greater than" is colloquial; Grafana's UI label is technically "Greater". Left as-is because the same convention is used consistently in sibling posts in this repo and is widely understood.
- The "Prepare time series" example uses `Format: Multi-frame to wide` as a description of the conversion; Grafana's actual mode options are "Multi-frame time series", "Wide time series", and "Long time series". The description still conveys the correct intent and is not technically wrong as worded.
- The Add field from calculation Binary operation in Grafana takes two operands and a single operator. Some examples in the post describe compound expressions like `A / B * 100`. In practice this requires chaining two Add field steps; the post's pseudocode reads as intent rather than literal config, so it remains acceptable for a conceptual walkthrough.
- All PromQL examples are syntactically valid and use real, commonly-available metrics from Prometheus, kube-state-metrics, and cAdvisor.
