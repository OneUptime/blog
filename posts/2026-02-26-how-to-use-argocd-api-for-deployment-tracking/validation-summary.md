# Validation Summary: How to Use ArgoCD API for Deployment Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD REST API
- Argo CD Application status and operation history
- Argo CD Notifications
- Kubernetes ConfigMaps and annotations
- Prometheus and PromQL
- Python
- GitHub REST API
- jq and curl

## Sources Consulted
- Argo CD API Docs: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- GitHub REST API commit endpoint documentation: https://docs.github.com/en/rest/commits/commits
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The operation phase list omitted `Terminating`. Updated the phase list and polling code to recognize `Terminating`, matching Argo CD's documented sync operation phase label values.
- The polling service recorded `Running` operations in `last_operation` and then skipped recording the same operation when it later reached `Succeeded`, `Failed`, or `Error`. Changed the completed-operation check to record terminal phases when the stored phase differs.
- `get_deployment_stats(hours=24)` accepted an `hours` argument but did not filter by that time window. Added cutoff filtering against `finished_at`.
- The PromQL success-rate query used raw counters while claiming a 24-hour window. Updated it to use `increase(...[24h])`.
- The PromQL average-duration query used `argocd_app_sync_duration_seconds_sum` and `argocd_app_sync_duration_seconds_count`, which are not the current documented Argo CD metric names. Updated it to use `argocd_app_sync_duration_seconds_total` divided by `argocd_app_sync_total` over a 24-hour window.
- The jq examples assumed `status.history`, `syncResult.revision`, and `syncResult.resources` always existed. Added defaults so the examples do not fail on applications without those fields populated.
- The GitHub API example used `Authorization: token`. Updated it to `Authorization: Bearer`, matching current GitHub REST API examples.

## Review Notes
The Argo CD examples are accurate for single-source Applications. Multi-source Applications may require reading `sources` and per-source revision fields instead of only `source` and `revision`.
