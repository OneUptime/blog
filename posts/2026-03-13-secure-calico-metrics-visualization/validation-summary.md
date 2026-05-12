# Validation Summary: How to Secure Calico Metrics Visualization

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- Calico (Kubernetes CNI)
- Grafana (HTTP API, RBAC, folder permissions, data source provisioning)
- Prometheus (as a Grafana data source)
- Kubernetes ConfigMaps (Grafana sidecar-style data source provisioning)
- Mermaid (flowchart diagram)

## Sources Consulted
- Grafana Folder Permissions HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/folder_permissions/
- Grafana Folder HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/folder/
- Grafana Team HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/team/
- Grafana data source provisioning reference: https://grafana.com/docs/grafana/latest/administration/provisioning/#data-sources
- Grafana Prometheus data source `jsonData` fields (`httpMethod`, `prometheusType`, `customQueryParameters`): https://grafana.com/docs/grafana/latest/datasources/prometheus/configure-prometheus-data-source/

## Issues Found
- **Folder permissions API body structure was malformed.** The original snippet sent a raw JSON array (`[{"teamId": 1, "permission": 1}]`) as the body of `POST /api/folders/:uid/permissions`. Per the Grafana HTTP API docs, this endpoint expects an object with an `items` array (`{"items": [{"teamId": 1, "permission": 1}]}`). Without the wrapper, Grafana returns a 400 and no permissions are applied. Updated the curl `-d` payload to use the documented `{"items": [...]}` wrapper. The permission integer (`1` = View) remains correct.

## Review Notes
- The team-creation (`POST /api/teams`) and folder-creation (`POST /api/folders`) calls match the documented request bodies and methods.
- Permission integers used (`1 = View`) match Grafana's documented legacy folder permission model (1 = View, 2 = Edit, 4 = Admin).
- The Grafana sidecar discovery label `grafana_datasource: "1"` is the standard convention for the kiwigrid/k8s-sidecar (and the Grafana Helm chart sidecar) data-source loader.
- `jsonData.httpMethod`, `jsonData.prometheusType`, and `jsonData.customQueryParameters` are all valid Prometheus data-source fields in Grafana provisioning YAML.
- Caveat (not a bug, but worth flagging to readers): the inline comment "This data source can only query calico-prefixed metrics" is somewhat misleading. `customQueryParameters` appends URL parameters to every request the data source makes to Prometheus — it does not, on its own, filter what metrics a user can query. True per-data-source metric scoping typically requires multi-tenant tooling (e.g., Cortex/Mimir/Thanos tenant headers, or a proxy that enforces label selectors). The YAML itself is syntactically and semantically valid, and the author also calls out the Thanos angle in the surrounding comment, so this was left in place rather than rewritten.
- Section 3 ("Dashboard Encryption for Sensitive Data") contains only commentary in bash code fences and no executable commands, so there is nothing to validate there — the references to Grafana Enterprise fine-grained access control and dashboard variable filtering are accurate at a high level.
- The Mermaid flowchart parses with standard `flowchart TD` syntax (including the `B & D & F --> I` fan-in shorthand, which has been supported since Mermaid 8.7+).
