# Validation Summary: How to Deploy a Django Application with Flux CD

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Django
- Python
- Docker
- Kubernetes Deployments, Services, Secrets, Jobs, probes
- Flux CD GitRepository and Kustomization resources
- PostgreSQL
- Gunicorn
- External Secrets Operator

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Image Update Automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Kubernetes Job TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Django static files deployment documentation: https://docs.djangoproject.com/en/dev/howto/static-files/deployment/
- Django deployment checklist: https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/
- External Secrets Operator documentation/repository: https://github.com/external-secrets/external-secrets

## Issues Found
- The migration Job used `ttlSecondsAfterFinished: 300` while the Flux Kustomization was intended to keep the completed Job present. Kubernetes deletes finished Jobs after the TTL expires, which can cause Flux to recreate the missing Job and rerun the migration. Removed the TTL field and updated the Flux comment to explain that completed Jobs are kept so Flux does not recreate them.
- The manifest path comments did not match the Flux Kustomization paths. Updated the migration manifest comment to `deploy/migrate/migration-job.yaml` and the application manifest comments to `deploy/app/deployment.yaml` and `deploy/app/service.yaml`.
- The introduction and conclusion overstated the guarantee provided by ordered reconciliation. Updated the wording to state that Flux can ensure migrations complete before new application pods roll out, and that dependency management helps coordinate the rollout.
- The best-practices section referred to "`WaitForJobCompletion` style health checks", which is not the Flux field name. Updated it to refer to Flux `healthChecks` or `wait`.

## Review Notes
The remaining snippets are syntactically aligned with current Kubernetes and Flux APIs. In a production implementation, the Django `collectstatic` build step may require build-time settings or environment variables depending on how the project settings are written, and schema migrations still need to be backward-compatible with any old pods serving traffic during a rolling deployment.
