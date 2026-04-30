# Validation Summary: How to Set Up Fleet with Monorepo Structure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- Kubernetes
- GitOps
- Helm
- Git repository authentication with HTTPS and SSH

## Sources Consulted
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Fleet architecture: https://fleet.rancher.io/explanations/architecture
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet GitRepo resource reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet Git repository contents: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet troubleshooting guide: https://fleet.rancher.io/troubleshooting

## Issues Found
- Step 1 implied the Fleet agent runs in `cattle-fleet-system` on the management cluster. I corrected the verification commands so the management cluster checks `fleet-controller` and `gitjob` in `cattle-fleet-system`, while the local cluster agent is checked in `cattle-local-fleet-system`, which matches the current Fleet/Rancher docs.
- The repository layout in Step 3 did not match the `fleet.yaml` example in Step 4. The post showed raw manifests and Kustomize overlays, while the configuration actually referenced a Helm chart at `./chart` plus a separate Fleet values file. I updated the structure to reflect the Helm-based example.
- The `helm.version` field was shown alongside a local chart path. I removed it because the official Fleet reference documents `version` as a chart-download setting, while this example uses a local chart path.
- The bundle inspection command used the GitRepo name as the Bundle name. I changed it to `my-app-gitops-apps-my-app`, which matches Fleet's documented bundle naming pattern of `$gitrepoName-$path`.
- The private Git authentication examples created generic secrets without the required secret types. I updated them to use `kubernetes.io/basic-auth` for HTTPS and `kubernetes.io/ssh-auth` for SSH, and changed the SSH example to use `ssh-keyscan -H` when populating `known_hosts`.
- The manual resync example used a custom annotation instead of Fleet's documented force-sync field. I replaced it with a patch to `spec.forceSyncGeneration` and noted that the value must be increased on later manual resyncs.

## Review Notes
- Fleet automatically uses a chart's own `values.yaml`; the separate `valuesFiles` entry remains valid here because it refers to an additional file stored alongside `fleet.yaml`.
- Rancher documentation notes that if the Helm chart has dependencies, the resolved dependency artifacts under `charts/` should be committed to the Git repository before Fleet deploys the chart.
