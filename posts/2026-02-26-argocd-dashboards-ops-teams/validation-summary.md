# Validation Summary: How to Set Up ArgoCD Dashboards for Ops Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Prometheus
- PromQL
- Grafana dashboards
- Grafana file provisioning
- Grafana alerting provisioning
- Kubernetes metrics
- Redis exporter metrics

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD high availability and workqueue rate limiting documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD repo-server metrics source: https://github.com/argoproj/argo-cd/blob/master/reposerver/metrics/metrics.go
- Argo CD application-controller queue source: https://github.com/argoproj/argo-cd/blob/master/controller/appcontroller.go
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- Grafana dashboard 14584 listing: https://grafana.com/grafana/dashboards/14584-argocd/

## Issues Found
- The deployment velocity panel counted only `phase="Error"` for failed syncs. Argo CD documents sync phases including both `Error` and `Failed`, so the query now uses `phase=~"Error|Failed"`.
- The Git error-rate query used `argocd_git_request_total{grpc_code!="OK"}`, but `argocd_git_request_total` is labeled by `repo` and `request_type`, not `grpc_code`. The query now uses the dedicated repo-server failure counters `argocd_git_fetch_fail_total` and `argocd_git_lsremote_fail_total`.
- The repo-server load panel described `argocd_repo_pending_request_total` as pending and concurrent manifest generation. Argo CD defines this gauge as pending requests requiring a repository lock, so the panel wording and aggregate query were corrected.
- The Grafana dashboard provisioning snippet combined `folder` with `foldersFromFilesStructure`. Grafana documents that `foldersFromFilesStructure` requires `folder` and `folderUid` to be unset, so the conflicting option was removed.
- The Grafana alerting provisioning snippet was missing required rule metadata and data-source details and had an incomplete threshold expression. It now includes `orgId`, `uid`, `for`, state handling, `datasourceUid`, `relativeTimeRange`, and a threshold expression model matching Grafana file provisioning structure.

## Review Notes
The resource usage panels depend on kubelet/cAdvisor, kube-state-metrics, and Redis exporter metrics being scraped in addition to Argo CD metrics. The post already states Prometheus must scrape Argo CD metrics, but teams should ensure those supporting exporters are available for the resource and Redis panels.
