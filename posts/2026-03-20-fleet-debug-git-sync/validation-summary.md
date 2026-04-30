# Validation Summary: How to Debug Fleet Git Repository Sync Issues - Part 2

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitOps
- Helm
- Fleet CLI
- `kubectl`

## Sources Consulted
- Fleet bundle lifecycle: https://fleet.rancher.io/0.14/explanations/ref-bundle-stages
- Fleet namespaces: https://fleet.rancher.io/0.14/explanations/namespaces
- Fleet status fields reference: https://fleet.rancher.io/reference/ref-status-fields
- Fleet GitRepo creation guide: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Fleet GitRepo resource reference: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet target mapping guide: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-targets
- Fleet troubleshooting guide: https://fleet.rancher.io/troubleshooting
- Fleet CLI `fleet apply`: https://fleet.rancher.io/reference/cli/fleet-cli/fleet_apply
- Fleet CLI `fleet deploy`: https://fleet.rancher.io/reference/cli/fleet-cli/fleet_deploy
- Kubernetes `kubectl exec`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl rollout restart`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/

## Issues Found
- The sync-flow diagram implied the Fleet manager directly cloned the repository and created Bundles. I corrected it to match Fleet's documented lifecycle: `gitjob-controller` creates the job, the GitJob clones the repository and creates the Bundle, and `fleet-controller` creates `BundleDeployment` resources.
- The post listed GitRepo status conditions as `Synced`, `Ready`, and `Error`. I replaced those with Fleet's documented GitRepo conditions: `Ready`, `GitPolling`, `Reconciling`, `Stalled`, and `Accepted`.
- The log-troubleshooting step only pointed readers at `fleet-controller` logs. I added GitJob pod log inspection for clone, auth, and polling failures because Fleet documents those errors in the GitJob path.
- The authentication example created a generic secret without the documented Fleet secret type requirements and treated `known_hosts` as mandatory for all SSH secrets. I corrected the secret type guidance and clarified that SSH auth requires `ssh-privatekey`, with `known_hosts` added when explicit host keys are needed.
- The network-connectivity example tested from the controller pod even though Git cloning happens in the GitJob path. I moved the example to the GitJob pod and made the `curl` availability assumption explicit.
- The target-cluster examples used ambiguous `cluster` resource names. I updated them to `clusters.fleet.cattle.io` to match Fleet's documented cluster resource.
- The BundleDeployment commands incorrectly targeted the `fleet-default` namespace. I corrected them to use `bundledeployments.fleet.cattle.io -A` and documented that BundleDeployments live in per-cluster namespaces such as `cluster-<workspace>-<cluster>-<suffix>`.
- The best-practices section referenced a non-existent `fleet apply --dry-run` flag. I replaced it with the supported `fleet apply -o - my-bundle ./path` workflow for inspecting rendered Bundles locally.

## Review Notes
- The post is technically relevant and salvageable; after the corrections above, it aligns with current Fleet and Kubernetes documentation.
- Validation was done against official documentation pages because `fleet` and `kubectl` binaries were not installed in this workspace.
