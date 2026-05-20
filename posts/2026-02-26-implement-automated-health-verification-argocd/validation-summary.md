# Validation Summary: How to Implement Automated Health Verification in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Lua health checks
- Argo CD Notifications
- Kubernetes CronJob
- Prometheus Operator ServiceMonitor and PrometheusRule
- kubectl JSONPath

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo CD Notifications trigger documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD annotations and labels documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/metrics/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD FAQ on repository polling and reconciliation: https://argo-cd.readthedocs.io/en/latest/faq/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post described health assessment as checking every resource in every Application on a simple continuous loop controlled by `timeout.reconciliation`. Updated this to match Argo CD behavior: health is assessed during reconciliation and tracked resource updates, while `timeout.reconciliation` controls periodic source polling.
- The post said Application health is the worst status among all resources and used a Pod example without caveat. Updated this to clarify that Argo CD Application health is inferred from immediate child resources, and child resource health is not inherited automatically by parent resources such as Deployments.
- The Lua examples used `string.format`, but Argo CD disables standard Lua libraries by default unless `resource.customizations.useOpenLibs.<group>_<kind>` is enabled. Replaced those calls with Lua string concatenation so the snippets work with the default Lua sandbox.
- The StatefulSet health example checked `currentReplicas`, which can be misleading during rolling updates. Changed it to check `updatedReplicas`, aligning better with Argo CD's built-in workload health behavior.
- The Ingress health example treated any non-empty load balancer ingress entry as healthy. Updated it to require a hostname or IP, matching Argo CD's documented Ingress health criteria.
- The notification trigger examples dereferenced optional `operationState` timestamps directly. Added optional-field guards before parsing `finishedAt` and `startedAt`.
- The CronJob example depended on `jq` while using a kubectl image. Replaced the `jq` commands with supported `kubectl -o jsonpath` expressions.
- The refresh annotation example used `argocd.argoproj.io/refresh: "30"` as if it were an application-specific interval. Replaced it with the documented one-time refresh value `"normal"` and explained that `"hard"` invalidates caches.
- The tuning example used a bare numeric reconciliation timeout and an outdated default comment. Updated the value to `60s` and clarified the current default of 120 seconds plus up to 60 seconds of jitter.

## Review Notes
The Prometheus metric examples use `argocd_app_info` with `sync_status` and `health_status`, which matches Argo CD's documented application controller metrics. The ServiceMonitor selector may still need labels adjusted for a particular Argo CD installation or Helm chart, but the Kubernetes resource shape and metric port concept are valid.
