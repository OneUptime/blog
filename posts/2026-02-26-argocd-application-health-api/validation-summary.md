# Validation Summary: How to Get Application Health via ArgoCD API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD REST API
- Argo CD application and resource health
- Kubernetes resources
- Bash, curl, and jq
- Python requests
- Prometheus text exposition format

## Sources Consulted
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD OpenAPI/Swagger specification: https://raw.githubusercontent.com/argoproj/argo-cd/master/assets/swagger.json
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The introduction said Argo CD aggregates every managed resource into application health. Argo CD documentation states that application health is inferred from the worst health of the application's immediate child resources, and child resource health is not inherited automatically. Updated the wording to match the documented behavior.
- The examples used `.status.health.message` for application-level health messages. In the Argo CD OpenAPI schema, `v1alpha1AppHealthStatus.message` is deprecated and not used. Replaced application-level message usage with `lastTransitionTime` where an app-level health detail was needed, while keeping resource-level health messages because `v1alpha1HealthStatus.message` is still valid for resources.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python documentation. Replaced it with `datetime.now(timezone.utc)`.
- The rollback script exited successfully after a health-check timeout because it used `break` with no later non-zero exit. Changed the timeout path to `exit 1`.

## Review Notes
The REST endpoints used in the post are present in the Argo CD OpenAPI specification: `GET /api/v1/applications/{name}`, `GET /api/v1/applications/{applicationName}/resource-tree`, `GET /api/v1/applications`, and `POST /api/v1/applications/{name}/sync`. The sync request fields `revision` and `prune` are also present in the documented request schema. The rollback examples are appropriate for simple single-source applications; multi-source applications may require `revisions` and `sourcePositions`.
