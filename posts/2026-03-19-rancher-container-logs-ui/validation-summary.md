# Validation Summary: How to View Container Logs in the Rancher UI

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- Container logging

## Sources Consulted
- Rancher docs: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Rancher docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods
- Kubernetes docs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Rancher Dashboard source: https://github.com/rancher/dashboard
- Rancher Dashboard source file: `shell/components/Window/ContainerLogs.vue`
- Rancher Dashboard source file: `shell/detail/pod.vue`
- Rancher Dashboard source file: `shell/models/pod.js`

## Issues Found
- The post used the older `Workload` navigation label. The current Rancher UI uses `Workloads`, so those paths were corrected.
- The post said the pod details page has a dedicated `Logs` tab. In the current Rancher dashboard, logs are opened from `View Logs` row actions, so that section was corrected.
- The post described live log viewing as a generic auto-scroll toggle. The current UI implements this as follow behavior with a `Follow` action, so that wording was corrected.
- One `kubectl logs` example claimed to show logs for all pods in a deployment but actually used a label selector. That command was corrected to `kubectl logs deployment/my-app -n <namespace> --all-pods=true` to match the Kubernetes reference.
- The label-selector example was tightened to `--all-containers=true --prefix` so the command matches the described behavior more precisely.
- The built-in Rancher `Kubectl Shell` access steps were updated to match the official Rancher path: `☰ > Cluster Management`, then `Explore`, then `Kubectl Shell`.

## Review Notes
- Rancher’s log window also supports a configurable log range, wrap toggle, timestamp toggle, previous-container logs, download, and text filtering, all confirmed in the current dashboard source.
- Rancher documents a known limitation for some hardened RKE1 setups where pod exec and log viewing do not work when custom nodes are registered with only a public IP. That caveat does not invalidate the post, but it is version- and environment-specific.
