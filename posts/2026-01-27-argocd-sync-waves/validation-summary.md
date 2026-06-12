# Validation Summary: How to Implement ArgoCD Sync Waves

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD sync waves
- Argo CD resource hooks and hook delete policies
- Kubernetes manifests, Jobs, Services, StatefulSets, Deployments, Ingress, RBAC, Secrets, ConfigMaps, and PVCs
- Argo CD CLI
- kubectl
- OneUptime telemetry and incident APIs

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/resource_hooks/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Job TTL-after-finished documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OneUptime Syslog documentation: https://oneuptime.com/docs/en/telemetry/syslog
- OneUptime API reference: https://oneuptime.com/docs/en/api-reference/api-reference
- OneUptime Incident API reference: https://oneuptime.com/reference/en/incident

## Issues Found
- The post overstated that, without sync waves, Argo CD applies all resources in parallel. Updated the wording to reflect Argo CD's documented ordering by phase, wave, kind, and name.
- The wave progression text said Argo CD simply waits for all resources in a wave before proceeding. Updated it to match the documented repeated wave processing until resources are in sync and healthy.
- The Ingress examples used the deprecated `kubernetes.io/ingress.class` annotation. Updated them to use `spec.ingressClassName`.
- The `Skip` hook description implied manual/debug execution. Updated it to the documented behavior: Argo CD skips applying the annotated manifest.
- The PreSync hook examples referenced namespaces, Secrets, PVCs, and Services that would not exist during a first sync if they were created later in the same application. Added prerequisite comments, and corrected the complex migration hook to wait for `postgres-primary`.
- The OneUptime telemetry example used an undocumented `https://oneuptime.com/api/telemetry/metrics` endpoint. Replaced it with the documented Syslog ingestion endpoint and `x-oneuptime-token` header for deployment status reporting.
- The OneUptime incident example used the wrong plural endpoint and telemetry token header. Updated it to the documented `/api/incident` endpoint, `ApiKey` header, and `data` request body shape.
- The troubleshooting command `argocd app resources myapp --output wide` used an unsupported output value. Updated it to `--output tree=detailed`.
- The hook debugging command attempted to select Jobs with `-l argocd.argoproj.io/hook`, but hook is an annotation, not a Kubernetes label. Changed the command to list Jobs for inspection.
- The TTL best practice did not mention Argo CD's warning that Kubernetes TTL cleanup can make hook resources appear OutOfSync. Updated the recommendation to prefer hook delete policies for Argo CD hooks.

## Review Notes
- Most Kubernetes manifests use current stable API versions such as `apps/v1`, `batch/v1`, `networking.k8s.io/v1`, and `apiextensions.k8s.io/v1`.
- The example images and hostnames are placeholders and would need to be replaced for a real deployment.
- PreSync database migrations are correct for upgrade workflows where the database and its access credentials already exist. First-time bootstrap workflows should create those dependencies in a separate application or earlier deployment step.
