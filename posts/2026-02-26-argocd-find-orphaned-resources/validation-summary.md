# Validation Summary: How to Find Orphaned Resources in Your Cluster with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- jq
- Prometheus / PromQL
- Grafana
- Kubernetes CronJob

## Sources Consulted
- Argo CD orphaned resources monitoring documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/orphaned-resources/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd proj get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_get/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD API type definitions for orphaned resources and application trees: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- Kubernetes Service / Endpoints documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job cleanup documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post showed `argocd proj get production -o json | jq '.status.orphanedResources'` as the CLI path for retrieving orphaned resources. Argo CD documents orphaned resources as application tree data visible from the application details page and via `argocd app resources APPNAME --orphaned`; `argocd proj get` returns project details, not the orphaned resource list shown. Updated the CLI command, sample output, and UI instructions.
- The post stated that Argo CD labels managed resources with tracking labels. Current Argo CD documentation lists annotation-based tracking as the default, with label and annotation+label as configurable alternatives. Updated the wording to refer to tracking metadata and explain that the command depends on the configured tracking method.
- The PVC check claimed to find PVCs not bound to a running pod, but the command inspected all pods regardless of phase. Updated the jq filter to only count pods with `.status.phase == "Running"` and aligned the output text.
- The Service check used the deprecated Endpoints API. Kubernetes v1.33+ deprecates Endpoints in favor of EndpointSlices. Updated the command to query `endpointslices.discovery.k8s.io` by `kubernetes.io/service-name`.
- The cross-namespace scan included empty or null destination namespaces from applications that do not set a target namespace. Added a jq filter to skip null and empty namespace values.
- The dashboard section described project/namespace aggregation incorrectly for the Argo CD orphaned resource metric, which is documented as a per-application gauge. Updated the dashboard label to application, changed the project query to `sum by (project)`, and changed the total wording to applications.
- The PromQL growth example used `rate()` on `argocd_app_orphaned_resources_count`, which Argo CD documents as a gauge. Prometheus documents `rate()` for counters and `delta()` for gauges, so the example now uses `delta()`.
- The best practice claiming minimal overhead was too broad. Current Argo CD documentation warns that orphaned resource monitoring can have significant performance impact in namespaces with many unmanaged resources. Updated the recommendation to use well-scoped projects.

## Review Notes
The remaining kubectl examples are practical heuristics rather than exact substitutes for Argo CD's orphaned resource monitor. In particular, `kubectl get all` does not cover every namespaced resource type, and label-based checks should be adjusted for installations that use annotation-only or custom-label tracking.
