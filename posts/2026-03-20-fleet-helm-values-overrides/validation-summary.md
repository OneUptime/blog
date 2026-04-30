# Validation Summary: How to Set Up Fleet with Helm Values Overrides

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Helm
- Kubernetes
- kubectl

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet `GitRepo` reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet troubleshooting guide: https://fleet.rancher.io/troubleshooting
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet create GitRepo resource guide: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-add
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The repository structure showed raw manifests and Kustomize overlays, but the `fleet.yaml` example deploys a Helm chart via `helm.chart: ./chart`. I updated the tree to show a chart directory with `Chart.yaml`, `values.yaml`, and `templates/` so it matches the documented Fleet Helm layout.
- The example used `valuesFiles: - values.yaml` for the chart's default values file. Fleet's documentation states the chart's own `values.yaml` is always used automatically, so I removed that block.
- The example set `helm.version` while referencing a local chart path. I removed it to keep the Helm example aligned with the documented local chart workflow.
- The bundle inspection command used `my-app-gitops` as the Bundle name, but Fleet generates Bundle names from the GitRepo name plus the bundle path. I corrected the example to `my-app-gitops-apps-my-app`.
- The private Git authentication examples omitted the documented secret types. I updated the HTTPS example to use `kubernetes.io/basic-auth` and the SSH example to use `kubernetes.io/ssh-auth`, and I used `ssh-keyscan -H` for the `known_hosts` value to match Fleet's documented SSH secret guidance.
- The troubleshooting resync example used an annotation that is not documented in Fleet's official references. I replaced it with a `spec.forceSyncGeneration` patch that increments the current value, which matches Fleet's documented force-redeploy mechanism and works for repeated manual resyncs.

## Review Notes
- The post assumes a multi-cluster Rancher workspace by using the `fleet-default` namespace. For single-cluster Fleet setups, Fleet docs use `fleet-local` instead.
- Fleet evaluates target customizations in order, so overlapping selectors would make ordering important. The current production and staging selectors are distinct, so the example remains valid.
