# Validation Summary: How to Integrate ArgoCD with Cortex Developer Portal

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Cortex developer portal
- Cortex Custom Data API
- Cortex Deploys API
- Cortex Query Language (CQL)
- Kubernetes CronJob
- Python requests
- OpenAPI-based Cortex entity descriptors

## Sources Consulted
- Cortex ArgoCD integration documentation: https://docs.cortex.io/ingesting-data-into-cortex/integrations/argocd
- Cortex Custom Data API documentation: https://docs.cortex.io/api/rest/custom-data
- Cortex custom data documentation: https://docs.cortex.io/ingesting-data-into-cortex/entities/custom-data
- Cortex Deploys API documentation: https://docs.cortex.io/api/rest/deploys
- Cortex entity descriptor documentation: https://docs.cortex.io/ingesting-data-into-cortex/entities/yaml
- Cortex Kubernetes integration documentation: https://docs.cortex.io/ingesting-data-into-cortex/integrations/kubernetes
- Cortex CQL documentation: https://docs.cortex.io/cql
- Cortex JQ/CQL custom data documentation: https://docs.cortex.io/cql/using-jq
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD notification webhook documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post used a non-existent or undocumented Cortex endpoint, `https://api.getcortexapp.com/catalog/custom-integrations`, to create an integration. Replaced it with the documented Cortex Custom Data API endpoint, `POST /api/v1/catalog/{tagOrId}/custom-data`, and the required `key`, `description`, and `value` payload shape.
- The Python sync example used unversioned Cortex URLs and sent `values` instead of the documented `value` field. Updated the base URL to `https://api.getcortexapp.com/api/v1`, changed the request to `POST /catalog/{tagOrId}/custom-data`, and fixed the JSON payload.
- The Python auto-sync check treated `syncPolicy.automated: {}` as disabled, even though an empty `automated` object enables automated sync in Argo CD. Changed the check to `automated is not None` and safely read `selfHeal` and `prune` from an options object.
- The Python example used `datetime.utcnow()`. Updated it to `datetime.now(timezone.utc)` so the generated timestamp is timezone-aware.
- The Cortex Kubernetes descriptor used separate `identifier` and `namespace` fields. Cortex documents Kubernetes resource identifiers as `namespace/name`, so the example now uses `identifier: payments/payment-service`.
- The CQL examples used `custom("argocd", "field")`, which does not match Cortex's documented custom data access pattern. Updated the examples to read fields from `custom("argocd").field`.
- The CQL time comparison used `relative_time("-24h")`, which is not the documented Cortex CQL date pattern. Updated it to use `datetime(...).fromNow()` with a `duration(...)` comparison.
- The Argo CD notification webhook put a templated Cortex deploy URL in the webhook service `url`. Argo CD documents dynamic request paths in the notification template, so the service now uses `url: https://api.getcortexapp.com` and the template sets `path: /api/v1/catalog/{{.app.metadata.name}}/deploys`.
- The Cortex deploy event snippet omitted the `/api/v1` prefix and used the less precise sync revision field. Updated the deploy API path and used `app.status.operationState.operation.sync.revision`, matching Cortex's documented ArgoCD example.
- The Argo CD notification section did not show how an Application subscribes to the trigger. Added the required `notifications.argoproj.io/subscribe.on-sync-succeeded.cortex` annotation example.

## Review Notes
- The guide assumes Argo CD application names match Cortex entity tags. This is valid when teams enforce that naming convention; otherwise the deploy webhook and custom data sync need a mapping from Argo CD Application to `x-cortex-tag`.
- Cortex custom data is suitable for current deployment state and scorecard checks, while Cortex deploy events are the better source for deployment frequency and historical DORA-style metrics.
