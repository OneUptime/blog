# Validation Summary: How to Configure Fleet with Branch-Based Deployments - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Fleet
- Rancher
- Kubernetes
- GitOps
- Helm

## Sources Consulted
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet troubleshooting: https://fleet.rancher.io/troubleshooting
- Fleet GitRepo targets documentation: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Fleet Git repository contents documentation: https://fleet.rancher.io/explanations/gitrepo-content
- Fleet GitRepo resource reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet private Git repository setup: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The original branch-based deployment example used a single `GitRepo` with one `branch`, but Fleet watches one branch per `GitRepo`. I replaced it with two `GitRepo` resources so staging and production actually track different branches.
- The original repository structure showed raw manifests and an `overlays/` directory described as Kustomize overlays, while the accompanying `fleet.yaml` configured a Helm chart via `helm.chart: ./chart`. I aligned the structure with a Helm-based bundle so the example matches Fleet's documented chart behavior.
- The original `fleet.yaml` used `helm.version` and `valuesFiles` as though a chart version and explicit chart `values.yaml` were needed for a local chart path. I removed those fields to match Fleet's current Helm bundle behavior and avoid implying an incorrect layout.
- The original bundle inspection command assumed the bundle name matched the `GitRepo` name exactly. I changed it to use a placeholder because Fleet derives bundle names from the `GitRepo` and bundle path unless explicitly overridden.
- The original pod/logging guidance placed the local Fleet agent in `cattle-fleet-system`. I corrected the examples to distinguish the management-cluster namespace from the Rancher local-cluster agent namespace documented by Fleet.
- The original private repository secret examples created untyped generic secrets. I updated them to use `kubernetes.io/basic-auth` and `kubernetes.io/ssh-auth`, which Fleet documents for `clientSecretName`.
- The original troubleshooting step used an annotation-based force sync example. I replaced it with `spec.forceSyncGeneration`, which is the documented GitRepo field for forcing a redeployment, and noted that the value must increase on later runs.
- The prerequisites only mentioned management-cluster `kubectl` access even though the guide inspects downstream `fleet-agent` logs. I updated the prerequisite to reflect the access actually needed by the commands in the post.

## Review Notes
- Fleet target selection and `targetCustomizations` are separate concerns: `spec.targets` chooses which clusters receive a bundle, while `targetCustomizations` adjusts how matched clusters are configured.
- I validated the commands and fields against official documentation, but did not execute them in this workspace because `kubectl` is not installed here and no Rancher/Fleet cluster context is available.
