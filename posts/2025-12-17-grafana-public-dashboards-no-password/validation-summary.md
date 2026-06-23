# Validation Summary: How to Set Up Grafana Without Password for Public Dashboards

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Grafana shared dashboards / externally shared dashboards
- Grafana anonymous authentication
- Grafana snapshots and Snapshot API
- Grafana dashboard and data source provisioning
- Docker Compose
- Kubernetes ConfigMap and Deployment manifests
- Nginx reverse proxy rate limiting
- HTML iframe embedding

## Sources Consulted
- Grafana documentation: Externally shared dashboards - https://grafana.com/docs/grafana/latest/visualizations/dashboards/share-dashboards-panels/shared-dashboards/
- Grafana documentation: Anonymous authentication - https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/anonymous-auth/
- Grafana documentation: Configure Grafana - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana documentation: Snapshot API - https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/snapshot/
- Grafana documentation: Provision Grafana - https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana documentation: Data sources - https://grafana.com/docs/grafana/latest/datasources/
- Grafana documentation: Data source management - https://grafana.com/docs/grafana/latest/administration/data-source-management/
- Grafana documentation: What's new in Grafana v9.1 - https://grafana.com/docs/grafana/v9.1/whatsnew/whats-new-in-v9-1/
- Grafana documentation: What's new in Grafana v9.2 - https://grafana.com/docs/grafana/v9.2/whatsnew/whats-new-in-v9-2/
- Grafana documentation: What's new in Grafana v11.5 - https://grafana.com/docs/grafana/latest/whatsnew/whats-new-in-v11-5/

## Issues Found
- The post said Grafana 11.x was released in September 2024 and renamed Public Dashboards to Externally Shared Dashboards. Grafana 11.5 documentation says the feature was renamed to Shared Dashboards, and current docs use Externally Shared Dashboards. Updated the version note and wording.
- The post described the `publicDashboards` feature toggle as required for all Grafana 9.x and 10.x versions. Official docs show it as an alpha/experimental feature toggle in early Grafana 9.x, while current Grafana uses `[public_dashboards] enabled`. Updated the scope and current configuration example.
- Current sharing UI steps use Share externally and Anyone with the link rather than a Public Dashboard tab. Updated the creation and revocation steps.
- The anonymous access INI example placed `hide_version` under the wrong comment and omitted the correct `[auth] disable_login_form` setting. Updated the example and Docker/Kubernetes values.
- The restricting anonymous access example included `editors_can_admin`, which is not relevant to anonymous Viewer access in that snippet. Removed it and clarified `viewers_can_edit`.
- The snapshot configuration included `remove_expired`, which is not a documented Grafana `[snapshots]` setting. Removed it.
- The data source provisioning example implied `httpMethod: GET` and `timeInterval` restrict read/query scope. Updated the text and comments to match official provisioning semantics and noted that data source permissions are Grafana Enterprise/Grafana Cloud features.
- The rate-limiting section used an undocumented `rate_limit_anonymous` Grafana setting. Removed it and kept the reverse-proxy rate limiting example.
- The hide-sensitive-information and complete Docker examples used incorrect or outdated settings for hiding version information and disabling alerting. Updated them to `GF_AUTH_ANONYMOUS_HIDE_VERSION=true` and `GF_UNIFIED_ALERTING_EXECUTE_ALERTS=false`.

## Review Notes
The Snapshot API remains on Grafana's legacy `/api` route. Grafana 13 documentation notes that `/api` endpoints are being deprecated in favor of `/apis`, but legacy endpoints remain fully accessible and operational at the time of review.
