# Validation Summary: How to Use Library Panels in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana library panels
- Grafana dashboards
- Grafana dashboard JSON model
- Grafana Library Element HTTP API
- Grafana provisioning
- Prometheus / PromQL

## Sources Consulted
- Grafana documentation: Manage library panels - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/manage-library-panels/
- Grafana documentation: Panel overview - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/panel-overview/
- Grafana documentation: Library Element HTTP API - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/library_element/
- Grafana documentation: Provision Grafana - https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana documentation: Folder access control - https://grafana.com/docs/grafana/latest/administration/roles-and-permissions/folder-access-control/
- Prometheus documentation: Querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The panel conversion instructions used older/inaccurate UI wording: "Panel Menu > More > Create library panel." Updated this to the documented edit-mode flow, "Panel Actions > More > New library panel," and noted that the dashboard must be saved after creating the library panel.
- The post stated that users could create a library panel directly from the Library panels page using "New library panel." Current Grafana documentation describes creating library panels from dashboard panels. Updated the section to explain that a user should create a regular dashboard panel first and then convert it to a library panel.
- The dashboard editor instructions described a left-side "Library panels" tab and dragging a panel to the dashboard. Current Grafana documentation describes selecting a panel and using "Use library panel" to open the panel library drawer. Updated the workflow text and command-style path.
- The "Linked dashboards" wording was more specific than the documented UI. Updated it to say users can open Dashboards > Library panels, select the panel, and review where it is used.
- The provisioning section showed a non-existent `provisioning/library-panels/panels.yaml` format. Grafana classic provisioning supports dashboard provider configuration and dashboard files, not a separate library panel YAML provisioning file. Replaced the invalid example with a Library Element HTTP API JSON body and kept dashboard JSON references by `libraryPanel.uid`.
- The troubleshooting section said "Library panel not found" can happen when a panel is moved. Moving folders should not invalidate a UID reference. Updated the wording to focus on missing access, deletion, or UID mismatch.
- The "Changes Not Propagating" advice attributed the issue to browser cache. Grafana documentation states saved library panel changes propagate to linked instances, so the advice was changed to verify the library panel edit was saved and refresh already-open dashboards.

## Review Notes
The PromQL examples are syntactically valid. The `histogram_quantile` example is minimal; in production dashboards, teams often aggregate histogram buckets with labels such as `le` and service dimensions before calling `histogram_quantile`, depending on the metric cardinality and desired grouping.
