# Validation Summary: Configure Grafana Variables for Multi-Cluster Ceph Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana (template variables, dashboard provisioning, panel repeat)
- Prometheus (PromQL, label_values function)
- Rook operator (Ceph cluster monitoring)
- Ceph (health, OSD, and pool metrics)
- Kubernetes (ConfigMap-based dashboard provisioning)

## Sources Consulted
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana source code — `packages/grafana-data/src/types/templateVars.ts` (VariableRefresh enum, DataSourceVariableModel type)
- Grafana source code — `public/app/features/variables/datasource/reducer.ts` (confirms `query` field used with `matchPluginId()`)
- Grafana template variables documentation: https://grafana.com/docs/grafana/latest/dashboards/variables/
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/

## Issues Found
1. **JSON provisioning used `pluginId` instead of `query` for datasource variable** (line ~106): The datasource-type template variable JSON used `"pluginId": "prometheus"` but Grafana's dashboard JSON model uses the `query` field to specify the datasource plugin type. Changed to `"query": "prometheus"`. The `pluginId` field is not recognized by Grafana's templating engine for datasource variables; the `query` field is what `matchPluginId()` reads internally.

2. **Inconsistent refresh value between YAML description and JSON provisioning** (line ~113): The YAML configuration section described the namespace variable with `Refresh: On dashboard load` (which corresponds to `refresh: 1`), but the JSON provisioning section used `"refresh": 2` (on time range change). Changed JSON to `"refresh": 1` to match the YAML description and maintain consistency between the manual UI steps and programmatic provisioning.

## Review Notes
- The string format `"datasource": "${datasource}"` used in the JSON provisioning is legacy. Modern Grafana (10+) prefers an object format: `{"type": "prometheus", "uid": "${datasource}"}`. The string format still works via backward compatibility/auto-migration, so it is not incorrect, but readers targeting Grafana 10+ may want to use the object format.
- The Ceph metric names used (`ceph_health_status`, `ceph_osd_up`, `ceph_pool_bytes_used`) are valid metrics exported by the Ceph MGR Prometheus module. Metric names may vary slightly across Ceph versions (e.g., Pacific vs. Quincy vs. Reef).
- The `label_values()` function used in variable queries is a Grafana-specific query function for Prometheus datasource variables, not standard PromQL. This is correct usage.
- The panel repeat-by-variable feature described for multi-cluster overview is accurate Grafana functionality.
