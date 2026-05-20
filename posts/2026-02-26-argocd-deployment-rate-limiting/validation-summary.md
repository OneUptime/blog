# Validation Summary: How to Implement Deployment Rate Limiting with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Argo CD sync waves, hooks, and sync windows
- Argo Rollouts
- Kubernetes Deployments, Jobs, ConfigMaps, and AppProjects
- Prometheus and Prometheus Operator rules
- Shell scripting with curl

## Sources Consulted
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD high availability and controller processor documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD ApplicationSet Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo Rollouts canary strategy documentation: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The sync wave example used Kubernetes Job and Deployment resources without required pod templates, selectors, or containers. Added minimal valid `spec` sections so the resources are syntactically valid Kubernetes manifests.
- The controller configuration described `controller.repo.server.timeout.seconds` as API rate limiting. Changed the comment and explanation to identify it correctly as the repo-server RPC timeout.
- The controller args example used `--app-resync` to set a three-minute polling interval. Removed it because current Argo CD documentation recommends `timeout.reconciliation` in `argocd-cm` for reconciliation polling, and the example did not need polling changes to demonstrate deployment rate limiting.
- The ApplicationSet RollingSync section omitted the required Progressive Syncs enablement. Added the documented `applicationsetcontroller.enable.progressive.syncs: "true"` setting.
- The Argo Rollouts example omitted the required selector and pod template. Added minimal valid fields so the Rollout resource can work as described.
- The webhook gate script captured the response body and status code together, then used `tail -c 4`, which can misread the HTTP status if the body is non-empty. Changed it to write the body to a file and capture only `%{http_code}`.
- The Prometheus recording rule subtracted `count()` values on a counter, which does not calculate deployments in the last hour and can produce misleading results. Replaced it with `sum(rate(argocd_app_sync_total{phase="Succeeded"}[1h]))` and adjusted the alert expression to compare hourly volume.

## Review Notes
The examples use placeholder image names, repository URLs, and cluster API URLs that must be replaced in a real environment. ApplicationSet Progressive Syncs are documented as a beta feature in current Argo CD documentation and must be explicitly enabled.
