# Validation Summary: How to Use Plugin Generator in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet Plugin generator
- Kubernetes ConfigMaps, Secrets, Deployments, Services, and NetworkPolicies
- Python Flask
- kubectl
- Go templates

## Sources Consulted
- Argo CD Plugin Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Plugin/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD v3 plugin service Go package reference: https://pkg.go.dev/github.com/argoproj/argo-cd/v3/applicationset/services/plugin
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The post described the plugin response as a top-level `parameters` array. Argo CD expects responses under `output.parameters`, so the response examples and Flask handlers were updated.
- The post said each output parameter must be a string key-value map. The current Argo CD plugin service response type is a list of object maps, so the requirement was corrected.
- The post said the default request timeout is 3 seconds. Argo CD documents the plugin `requestTimeout` default as 30 seconds, so the requirement and troubleshooting note were corrected.
- The post said the controller sends the request on every reconciliation cycle. Argo CD documents plugin polling through `requeueAfterSeconds`, so the explanation was corrected.
- The ConfigMap token reference did not match the separate Secret shown in the post, and the Secret was missing the required Argo CD label for non-`argocd-secret` lookup. The ConfigMap now uses `$argocd-applicationset-plugin-token:plugin.token`, and the Secret includes `app.kubernetes.io/part-of: argocd`.
- The ConfigMap `baseUrl` did not match the Service created later in the post. It now points to `service-registry-plugin.argocd.svc.cluster.local`.
- The Deployment declared a readiness probe for `/health`, but the sample Flask service did not implement that route. A minimal `/health` route was added.
- The authentication snippet used `os.environ` without importing `os`. The snippet now includes the import.
- The troubleshooting section recommended top-level `parameters` for empty responses and listed non-string values as invalid. It now recommends `{"output": {"parameters": []}}` and calls out the response wrapper instead.

## Review Notes
The examples are version-sensitive to current Argo CD ApplicationSet Plugin generator behavior. The Go template example is consistent with Argo CD's documented Go template support and Sprig function availability.
