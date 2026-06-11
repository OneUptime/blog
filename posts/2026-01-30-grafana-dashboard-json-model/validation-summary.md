# Validation Summary: How to Create Grafana Dashboard JSON Model

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard classic JSON model
- Grafana dashboard API
- Grafana dashboard provisioning
- Prometheus data source queries and template variables
- JSON, YAML, Bash, curl, jq

## Sources Consulted
- Grafana Dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana variables documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana annotations documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/

## Issues Found
- Clarified that the article focuses on Grafana's classic dashboard JSON model. Current Grafana documentation distinguishes the current V2 Resource schema from the classic model, so the original "Every Grafana dashboard" wording was too broad.
- Updated `schemaVersion` guidance. The original text suggested a fixed 39-42 range as of 2025; current Grafana examples use `41`, and the safest guidance is to use the value exported by the target Grafana version.
- Corrected grid positioning wording. Grafana documents `h` and `y` as grid height units, with each height unit representing 30 pixels; the post previously described `y` as a row number and `h` as rows.
- Updated the dashboard JSON access/export steps to match current Grafana navigation: Edit, Dashboard options, Settings, JSON Model.
- Replaced the outdated and shell-fragile `/api/dashboards/db` curl example with a current Grafana 12+ Dashboard API example that wraps the classic dashboard JSON in `spec` and builds the request body with `jq`.
- Generalized the provisioning note from "dashboard JSON files" to "dashboard definition files" to match current Grafana provisioning documentation, which supports current dashboard definition formats.

## Review Notes
- All JSON code blocks parse successfully with `JSON.parse`.
- The revised Bash snippet passes `bash -n`.
- Ruby was not available in the environment, so I could not run a Ruby YAML parser locally; the YAML snippet was reviewed against Grafana's official provisioning documentation.
