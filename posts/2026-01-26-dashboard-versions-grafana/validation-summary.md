# Validation Summary: How to Manage Dashboard Versions in Grafana

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana dashboard version history
- Grafana dashboard JSON model
- Grafana HTTP APIs
- Grafana dashboard provisioning
- Grafana alerting provisioning API
- Bash, curl, and jq
- GitHub Actions
- Kubernetes ConfigMaps

## Sources Consulted
- Grafana documentation: Manage dashboard version history - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/manage-version-history/
- Grafana documentation: Configure Grafana, `[dashboards]` settings - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana documentation: Dashboard JSON model - https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana documentation: Dashboard APIs - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana documentation: Folder/Dashboard Search HTTP API - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/folder_dashboard_search/
- Grafana documentation: Provision Grafana dashboards - https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana documentation: Alerting Provisioning HTTP API - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/alerting_provisioning/
- actions/checkout documentation - https://github.com/actions/checkout
- actions/github-script documentation - https://github.com/actions/github-script

## Issues Found
- The post said Grafana keeps all dashboard versions by default and showed `0 = unlimited`. Grafana's current documentation says the default is 20 versions per dashboard and the minimum is 1, so the retention text and comment were corrected.
- The `min_refresh_interval` comment described a minimum interval between saves. Grafana documents this as the minimum allowed dashboard refresh interval, so the comment was corrected.
- The version history and JSON model UI steps used older dashboard settings wording. They were updated to the current Edit > Dashboard options > Settings flow documented by Grafana.
- The compare action was labeled "Compare"; Grafana documents the button as "Compare versions", so the wording was corrected.
- The restore flow included a separate confirmation step that is not present in the current Grafana documentation. That step was removed.
- The comparison example was fenced as strict JSON while it contains comments and multiple JSON objects. The fence was changed to `jsonc`.
- The provisioning section said provisioning prevents UI modifications in all cases, but `allowUiUpdates: true` allows UI edits to be saved to Grafana's database. The wording was changed to say provisioning can prevent UI modifications.
- GitHub Actions examples used older JavaScript action major versions. `actions/checkout` was updated from v4 to v5 and `actions/github-script` from v6 to v8 based on the current action documentation.

## Review Notes
The Grafana `/api` endpoints used by the export/import examples are legacy endpoints. Grafana's current documentation says legacy `/api` routes remain accessible and operative, but starting in Grafana 13 they are deprecated in favor of the newer `/apis` resource APIs where exact replacements are still being migrated. The examples are acceptable as legacy automation examples, but a future revision should consider either the new `/apis` model or Grafana's provisioning/Git Sync workflows for new dashboard-as-code implementations.
