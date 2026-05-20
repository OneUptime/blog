# Validation Summary: How to Extend ArgoCD with Custom Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD custom resource health checks
- Kubernetes ConfigMaps and custom resources
- Lua health check scripts
- Zalando PostgreSQL Operator
- Strimzi Kafka Operator
- Istio VirtualService
- cert-manager Certificate
- External Secrets Operator
- Prometheus Operator ServiceMonitor
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Argo CD install manifest for application controller workload type: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD bundled cert-manager Certificate health check: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/cert-manager.io/Certificate/health.lua
- Argo CD bundled Strimzi Kafka health check: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/kafka.strimzi.io/Kafka/health.lua
- Zalando PostgreSQL Operator cluster manifest documentation: https://opensource.zalando.com/postgres-operator/docs/reference/cluster_manifest.html
- Zalando PostgreSQL Operator CRD: https://github.com/zalando/postgres-operator/blob/master/charts/postgres-operator/crds/postgresqls.yaml
- Strimzi deploying and managing documentation: https://strimzi.io/docs/operators/latest/deploying
- Istio configuration status field documentation: https://istio.io/latest/docs/reference/config/config-status/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- Prometheus Operator API reference and design documentation: https://prometheus-operator.dev/docs/api-reference/api/ and https://prometheus-operator.dev/docs/getting-started/design/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post said all CRDs lack Argo CD health knowledge and may show "Missing" or "Unknown". Argo CD includes built-in checks for some CRDs, and "Missing" is part of application health aggregation rather than the documented custom Lua return set. Updated the wording to "many CRDs" and "Unknown".
- The custom health status list included `Missing` and `Unknown`. Argo CD documents custom Lua checks as returning `Healthy`, `Progressing`, `Degraded`, or `Suspended`, so the list and example fallbacks were corrected.
- Several examples returned `Unknown` or used `tostring()` unnecessarily. Updated fallbacks to return `Progressing` and removed the `tostring()` usage so the examples align with Argo CD's documented custom-check statuses.
- The Strimzi Kafka example treated any non-true Ready condition as degraded and treated `NotReady` as progressing. Updated it to follow the bundled Argo CD health-check behavior: `Ready=True` is healthy, `NotReady=True` with `reason=Creating` is progressing, and other `NotReady=True` states are degraded.
- The cert-manager example checked `condition.reason == "Issuing"` under the Ready condition. Argo CD's bundled cert-manager check handles a separate `Issuing=True` condition first. Updated the example accordingly.
- The ServiceMonitor example required `selector.matchLabels`, but Prometheus Operator supports a Kubernetes label selector object, including match expressions. Updated the check to require `spec.selector` rather than specifically `matchLabels`.
- The ServiceMonitor text said ServiceMonitors do not have a status field. Current Prometheus Operator CRDs include a status subresource, though it may not be populated unless the relevant feature gate is enabled. Updated the wording to "often do not have a populated status field".
- The alternative ConfigMap example used an invalid list format with `group`, `kind`, and `health.lua` fields. Replaced it with the documented `resource.customizations` map keyed by `group/kind`.
- The debugging commands targeted `deployment/argocd-application-controller`, but the standard Argo CD install runs the application controller as a StatefulSet. Updated the commands to use `statefulset/argocd-application-controller`.

## Review Notes
The example scripts are illustrative and may need operator-version-specific adjustments in real clusters. Argo CD also ships bundled health checks for some popular CRDs, so users should check their installed Argo CD version before adding duplicate customizations.
