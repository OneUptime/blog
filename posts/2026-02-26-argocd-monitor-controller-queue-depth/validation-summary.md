# Validation Summary: How to Monitor ArgoCD Controller Queue Depth

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD application controller
- Kubernetes
- Prometheus and PromQL
- Grafana
- Kubernetes manifests

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD application controller command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-application-controller/
- Argo CD upstream controller source for workqueue names: https://github.com/argoproj/argo-cd/blob/master/controller/appcontroller.go
- Argo CD upstream metrics source and tests: https://github.com/argoproj/argo-cd/tree/master/controller/metrics
- Kubernetes client-go workqueue metrics behavior, as used by Argo CD: https://github.com/kubernetes/client-go/tree/master/util/workqueue

## Issues Found
- The workqueue label values used in the post were incorrect. Updated `app_reconciliation` to `app_reconciliation_queue` and `app_operation` to `app_operation_processing_queue`, matching Argo CD's application controller source.
- Removed `namespace="argocd"` from workqueue metric selectors. Raw client-go workqueue metrics are labeled by queue `name`; namespace may be added by some Prometheus scrape setups, but it is not an Argo CD workqueue metric label.
- Fixed PromQL histogram examples to aggregate buckets with `sum by (le)` or `sum by (le, name)` before `histogram_quantile`.
- Corrected the queue throughput panel to use `workqueue_work_duration_seconds_count` instead of `workqueue_adds_total`, because additions are enqueue rate, not completed processing throughput.
- Corrected the application reconciliation histogram from `argocd_app_reconcile_duration_seconds_bucket` to `argocd_app_reconcile_bucket`, matching Argo CD documentation and source.
- Updated the slow reconciliation diagnostic wording and query because current `argocd_app_reconcile` labels identify namespace and destination server, not individual application name.
- Replaced the non-existent `argocd_cluster_api_server_connectivity` metric with the documented `argocd_cluster_connection_status == 0` query.
- Added histogram bucket aggregation to the `argocd_git_request_duration_seconds_bucket` query.

## Review Notes
The controller processor defaults and `argocd-cmd-params-cm` keys were accurate. The sharding example is accurate for the documented StatefulSet-based sharding model; Argo CD also has an alpha dynamic cluster distribution mode that uses a Deployment, but that is not required for this post.
