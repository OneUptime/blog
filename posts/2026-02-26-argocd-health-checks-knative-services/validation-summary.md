# Validation Summary: How to Configure Health Checks for Knative Services in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD custom resource health checks
- Lua health scripts
- Kubernetes ConfigMaps and manifests
- Knative Serving Service, Route, Revision, and Configuration resources
- Knative Eventing Broker and Trigger resources

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD CLI command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD CLI command reference for `argocd app sync`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Knative Serving API reference: https://knative.dev/docs/serving/reference/serving-api/
- Knative Eventing API reference: https://knative.dev/docs/eventing/reference/eventing-api/
- Knative Serving API Go package reference: https://pkg.go.dev/knative.dev/serving/pkg/apis/serving/v1
- Knative Eventing API Go package reference: https://pkg.go.dev/knative.dev/eventing/pkg/apis/eventing/v1

## Issues Found
- The Revision health check claimed to specially handle scale-to-zero, but the original Lua returned as soon as it found the `Ready` condition, so the later `Active=False` / `NoTraffic` branch would not normally be reached. I changed the script to detect `Active=False` with reason `NoTraffic` before evaluating `Ready`, then keep the health status `Healthy` with an accurate scaled-to-zero message when the revision is otherwise ready.
- The testing section said to create a Knative Service through ArgoCD but used a direct `kubectl apply` command. A directly applied resource is not necessarily part of the Argo CD application being checked. I changed the instructions to add the manifest to the Git repository tracked by the Argo CD application, then run `argocd app sync` and `argocd app get --refresh`.

## Review Notes
The custom health checks follow Argo CD's documented `resource.customizations.health.<group>_<kind>` ConfigMap format and use Knative's documented `status.conditions` model. The examples intentionally remain generic and do not pin Argo CD or Knative versions; future updates should re-check condition reason strings if the post targets a specific Knative release.
