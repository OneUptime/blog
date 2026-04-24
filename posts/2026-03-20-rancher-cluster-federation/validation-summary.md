# Validation Summary: How to Implement Cluster Federation with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Fleet
- KubeFed
- Submariner
- Helm
- kubectl

## Sources Consulted
- Fleet documentation: Mapping to Downstream Clusters https://fleet.rancher.io/0.13/gitrepo-targets
- Fleet documentation: Custom Resources Spec https://fleet.rancher.io/reference/ref-crds
- Fleet documentation: Namespaces https://fleet.rancher.io/0.10/namespaces
- KubeFed archived repository README https://github.com/kubernetes-retired/kubefed
- KubeFed chart installation guide https://github.com/kubernetes-retired/kubefed/blob/master/charts/kubefed/README.md
- KubeFed cluster registration guide https://github.com/kubernetes-retired/kubefed/blob/master/docs/cluster-registration.md
- KubeFed user guide https://github.com/kubernetes-retired/kubefed/blob/master/docs/userguide.md
- Submariner deployment with subctl https://submariner.io/operations/deployment/subctl/
- Submariner usage guide https://submariner.io/operations/usage/

## Issues Found
- The Fleet `GitRepo` example placed `helm.values` under `spec.targets`. Fleet documents `targets` as cluster selection only; per-cluster Helm overrides belong in `fleet.yaml` via `targetCustomizations`. I removed the invalid block and replaced it with an accurate note.
- The post presented KubeFed as a current project. The official repository is archived, so I updated the intro, table, and conclusion to reflect that status and pinned the install example to chart version `0.10.0`, the last chart release documented in the archived chart repo.
- The `ReplicaSchedulingPreference` example used `spec.targetName`, but the KubeFed API only defines `targetKind`, `totalReplicas`, and optional cluster preferences. I removed the invalid `targetName` field.
- The Submariner install example used the operator chart as a broker install path and passed `--set broker.server=true`, which does not match current official deployment guidance. I replaced it with the documented `subctl deploy-broker` workflow.
- The Submariner join commands used `--kubecontext`, but current `subctl` documentation uses the common `--context` flag. I updated both join examples accordingly.
- The KubeFed monitoring command queried `.status.clusters[].readyReplicas`, which does not match the documented propagation status shape. I replaced it with a valid `kubectl get federateddeployment myapp -n production -o yaml` check.
- The table described Submariner as a "SUSE-backed project". The official project site identifies Submariner as a CNCF sandbox project, so I corrected that wording.

## Review Notes
KubeFed remains archived as of 2026-04-24, so this post is only technically correct when treated as guidance for the archived `0.10.0` release line. Fleet and Submariner sections are current against the consulted docs. For a future refresh, the Submariner monitoring section could also mention `subctl verify` for deeper end-to-end validation.
