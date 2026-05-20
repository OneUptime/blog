# Validation Summary: How to Implement Custom Health Checks via ArgoCD API

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD custom resource health checks
- Argo CD REST API and CLI
- Kubernetes ConfigMaps and kubectl
- Lua health scripts
- Cert-Manager Certificate resources
- Istio VirtualService resources

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd admin settings resource-overrides health` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/
- Argo CD Settings service source (`/api/v1/settings` is a GET endpoint): https://github.com/argoproj/argo-cd/blob/master/server/settings/settings.proto
- Argo CD Application service source (`/api/v1/applications/{applicationName}/resource-tree`): https://github.com/argoproj/argo-cd/blob/master/server/application/application.proto
- Argo CD / GitOps Engine health source: https://github.com/argoproj/gitops-engine/blob/master/pkg/health/health.go
- Istio Configuration Status Field documentation: https://istio.io/latest/docs/reference/config/config-status/
- Kubernetes `kubectl patch` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said unsupported resources fall back to a generic health check that reads standard conditions. Argo CD's health implementation only runs configured custom checks or built-in checks, and resources without a check are skipped for resource health. Updated the explanation and flowchart.
- The post said health checks could be updated through the Argo CD settings API. The settings API exposes a GET endpoint for reading settings; health check definitions are stored in `argocd-cm` and should be updated through Kubernetes. Updated the section text and command comments.
- The Istio VirtualService example checked `status.validationStatus`, which is not the documented Istio status shape. Updated it to use `status.conditions` with `type: PassedAnalysis` and `status.validationMessages`.
- The replica-based Lua pattern assumed `obj.spec` was always present. Updated it to handle a missing `spec` table safely.

## Review Notes
- The `argocd admin settings resource-overrides health RESOURCE_YAML_PATH --argocd-cm-path ...` command matches the current Argo CD command reference.
- The resource customization key format `resource.customizations.health.<group>_<kind>` matches Argo CD documentation.
- The Kubernetes `kubectl patch configmap ... --type merge -p ...` approach is valid for updating `argocd-cm`.
