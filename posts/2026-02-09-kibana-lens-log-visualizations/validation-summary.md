# Validation Summary: How to Use Kibana Lens for Creating Custom Log Visualizations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kibana
- Kibana Lens
- Elasticsearch data views
- Kibana Query Language (KQL)
- Lens formulas
- Log visualization and dashboards

## Sources Consulted
- Elastic Docs: Lens - https://www.elastic.co/docs/explore-analyze/visualize/lens
- Elastic Docs: Lens current guide - https://www.elastic.co/guide/en/kibana/current/lens.html
- Elastic Docs: Build metric charts with Kibana - https://www.elastic.co/docs/explore-analyze/visualize/charts/metric-charts
- Elastic Docs: Build tables with Kibana - https://www.elastic.co/docs/explore-analyze/visualize/charts/tables
- Elastic Docs: Build heat map charts with Kibana - https://www.elastic.co/docs/explore-analyze/visualize/charts/heat-map-charts
- Elastic Docs: Reporting and sharing - https://www.elastic.co/guide/en/kibana/current/reporting-getting-started.html

## Issues Found
- Updated outdated "index pattern" terminology to "data view" for current Kibana Lens usage.
- Clarified Lens access through Visualize Library or dashboards rather than only a generic Visualize menu.
- Corrected the time-series example from "error rate" to "error count" because the described filter produces counts over time, not a rate calculation.
- Clarified that full-text fields are not generally available for Lens grouping and changed the table example from `message` to `message.keyword`.
- Replaced the metric "Compare to previous period" toggle description with the current Lens approach: add a secondary metric, use a time-shifted formula, enable dynamic coloring, and compare to the primary metric.
- Corrected percentage formulas to return ratios and use Percent value formatting, instead of multiplying by 100 and then formatting as percent.
- Clarified that `count() / 60` is only a requests-per-second formula when the date histogram bucket interval is one minute.
- Clarified heatmap color wording so it does not imply all palettes make darker colors mean slower responses.
- Clarified sharing wording because PDF report export depends on reporting availability and permissions, and shared links can use saved filter and time-range context.

## Review Notes
The guide remains version-agnostic, but Kibana Lens UI labels and feature placement can vary between Stack 8.x, Stack 9.x, and Serverless. The examples assume ECS-like log fields such as `log.level`, `service.name`, and `@timestamp`; deployments with custom mappings may need equivalent keyword, numeric, and date fields.
