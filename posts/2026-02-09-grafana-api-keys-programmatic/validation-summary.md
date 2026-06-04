# Validation Summary: How to Use Grafana API Keys for Programmatic Access

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana HTTP API
- Grafana service accounts and service account tokens
- Deprecated Grafana API keys
- Grafana dashboards, data sources, and alerting provisioning APIs
- Kubernetes Secrets, CronJobs, Jobs, and kubectl
- Bash, curl, and jq

## Sources Consulted
- Grafana HTTP API reference: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Grafana service accounts: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana service account HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/serviceaccount/
- Grafana API key migration guide: https://grafana.com/docs/grafana/latest/administration/service-accounts/migrate-api-keys/
- Grafana dashboard API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana data source API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/data_source/
- Grafana alerting provisioning API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/alerting_provisioning/
- Grafana internal metrics documentation: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-monitoring/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kubectl/

## Issues Found
- The post presented Grafana API keys as the preferred current authentication method. Updated the article to explain that API keys are deprecated and service account tokens are the recommended replacement.
- The UI path for creating API credentials was outdated. Replaced it with the current Administration > Users and access > Service accounts flow.
- The API key creation examples used the deprecated `/api/auth/keys` endpoint. Replaced them with `POST /api/serviceaccounts` and `POST /api/serviceaccounts/:id/tokens`.
- Kubernetes examples stored and consumed an API key. Updated the secret names, environment variables, and examples to use service account tokens.
- The CronJob and setup Job used `curlimages/curl` while relying on `jq`. Replaced the image with Alpine and installed required tools in the container commands.
- The backup CronJob used `emptyDir`, which would not persist backups after the pod is removed. Replaced it with a `persistentVolumeClaim`.
- The dashboard panel example used the old `graph` panel type. Updated it to `timeseries`.
- The alert rule creation body was incomplete for Grafana-managed alert provisioning. Added `ruleGroup`, `folderUID`, `orgId`, and an expression condition query matching Grafana's documented alerting provisioning format.
- The rotation script rotated deprecated API keys. Reworked it to rotate service account tokens using service account token endpoints.
- The startup automation example wrote generated tokens to an ephemeral volume. Updated it to create or update Kubernetes Secrets.
- The monitoring section referenced undocumented API-key-specific metric names. Replaced it with documented Grafana HTTP metrics guidance and service account inventory commands.
- Troubleshooting guidance referred to enabling API keys. Updated it to check token expiration, service account status, and RBAC or role permissions.

## Review Notes
Some Grafana `/api` routes used in the examples are legacy routes. Grafana 13 deprecates legacy `/api` endpoints in favor of newer `/apis` endpoints where available, but the official documentation states legacy routes remain accessible and operative while migration is ongoing.
