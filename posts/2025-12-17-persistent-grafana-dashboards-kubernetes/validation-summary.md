# Validation Summary: How to Add Persistent Grafana Dashboards in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Kubernetes
- Helm
- Grafana Helm chart
- ConfigMaps
- PersistentVolumeClaims
- Kustomize
- Argo CD
- GitOps
- curl
- jq

## Sources Consulted
- Grafana dashboard provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana legacy Folder/Dashboard Search HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/folder_dashboard_search/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana Helm chart values: https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/grafana/values.yaml
- Grafana Helm chart sidecar provider template: https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/grafana/templates/_config.tpl
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Local CLI help for curl and jq.

## Issues Found
- The introduction and problem statement said UI-created dashboards disappear on pod restart as an unconditional fact. Updated the wording to clarify that this happens when Grafana's backing database or data directory is stored on ephemeral pod storage.
- The dashboard provisioning example used `foldersFromFilesStructure: true` while also setting `folder` and `folderUid`. Grafana documentation says `folder` and `folderUid` must be unset when using filesystem-derived folders, so those fields were removed from that example.
- The `apps/v1` Deployment example omitted the required `spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` so the manifest is structurally valid.
- The complete Helm values example was labeled as a standalone Grafana Helm chart values file but used a `grafana:` wrapper, which only applies when Grafana is nested under a parent chart. Removed the wrapper and made the values top-level.
- The complete Helm values example mixed the sidecar's generated dashboard provider with a separate `dashboardProviders` block for the same dashboard path. Removed the duplicate provider block and configured `sidecar.dashboards.provider.allowUiUpdates` instead.
- The troubleshooting note implied UI changes to provisioned dashboards can be made persistent only by enabling editability. Updated it to explain that `allowUiUpdates` saves UI edits to Grafana's database, not back to provisioning files, and file provisioning can later overwrite those database changes.

## Review Notes
- The legacy `/api/search` and `/api/dashboards/uid/:uid` examples remain usable, but Grafana 13 documentation marks `/api` routes as legacy in favor of newer `/apis` endpoints where available.
- `kubectl` was not installed in the local environment, so Kubernetes command validation was performed against official Kubernetes documentation rather than local `kubectl --help`.
- YAML snippets without placeholder content were parsed successfully with PyYAML. The folder organization examples contain intentional `{ ... }` placeholders and were treated as illustrative snippets.
