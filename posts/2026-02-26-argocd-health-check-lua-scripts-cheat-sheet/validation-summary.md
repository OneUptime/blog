# Validation Summary: ArgoCD Health Check Lua Scripts Cheat Sheet

## Status
validated

## Post Type
Reference / cheat sheet

## Technologies Covered
- Argo CD custom resource health checks
- Lua health check scripts
- Kubernetes Jobs, PersistentVolumeClaims, and StatefulSets
- cert-manager Certificates
- Bitnami Sealed Secrets
- Argo Rollouts
- Crossplane managed resources
- Istio VirtualServices
- argocd CLI, kubectl, and jq

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD troubleshooting tools and resource-overrides health command: https://argo-cd.readthedocs.io/en/stable/operator-manual/troubleshooting/
- Argo CD resource-overrides health command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo/gitops-engine health status constants: https://pkg.go.dev/github.com/argoproj/gitops-engine/pkg/health
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- cert-manager API reference for Certificate status conditions: https://cert-manager.io/docs/reference/api-docs/
- Bitnami Sealed Secrets API reference: https://pkg.go.dev/github.com/bitnami-labs/sealed-secrets/pkg/apis/sealed-secrets/v1alpha1
- Crossplane managed resources documentation: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Istio configuration status field documentation: https://istio.io/latest/docs/reference/config/config-status/
- Argo Rollouts specification: https://argoproj.github.io/argo-rollouts/features/specification/

## Issues Found
- The Argo CD ConfigMap wording implied a single `resource.customizations.health` key. Updated it to describe per-resource data keys named `resource.customizations.health.<group>_<kind>`, matching Argo CD documentation.
- The health return-value description said every script must return both fields. Updated it to say `status` is required and `message` is optional.
- The Job health check treated any nonzero `status.failed` count as Degraded. Kubernetes Jobs can have failed Pods during retries before the Job has failed, so the script now checks terminal `Complete` and `Failed` conditions and handles `spec.suspend`.
- The Istio VirtualService health check looked for `validationMessages[].type == "ERROR"`. Istio status uses `validationMessages[].level`, with values such as `Error` and `Warn`, so the script now checks `msg.level`.
- The timeout-based degradation section claimed it used creation timestamps, but the example did not implement a timeout and Argo CD disables standard Lua libraries by default. Updated the section to accurately describe a long-running Progressing-state pattern and note that timeout degradation generally needs external policy or monitoring.
- The debugging section claimed the listed commands tested Lua scripts before deployment, but the original commands only inspected deployed state. Added the official `argocd admin settings resource-overrides health` command for local health-script testing.

## Review Notes
The remaining examples are generic patterns and may need resource-specific tuning in production, especially around condition ordering and whether `False` readiness should mean Degraded or Progressing for a particular CRD.
