# Validation Summary: How to Set Up Fleet for Edge Cluster Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- Helm
- GitOps
- K3s

## Sources Consulted
- Fleet cluster registration docs: https://fleet.rancher.io/how-tos-for-operators/cluster-registration
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet GitRepo targeting docs: https://fleet.rancher.io/how-tos-for-users/gitrepo-targets
- Fleet custom resources reference: https://fleet.rancher.io/reference/ref-crds
- Fleet namespaces docs: https://fleet.rancher.io/0.14/namespaces
- Fleet configuration docs for Rancher-managed installs: https://fleet.rancher.io/ref-configuration
- Official Fleet Helm chart values for `fleet-agent`: https://github.com/rancher/fleet/blob/main/charts/fleet-agent/values.yaml
- Official Fleet Helm chart values for `fleet`: https://github.com/rancher/fleet/blob/main/charts/fleet/values.yaml
- Official Fleet source repository: https://github.com/rancher/fleet

## Issues Found
- The token retrieval command was incorrect. `ClusterRegistrationToken` status does not expose a `manifestNamespace` field for agent bootstrap. I changed the flow to wait for the generated Secret and decode `.data.values` into `values.yaml`, which matches Fleet’s documented registration process.
- The edge registration script used unsupported or misleading Helm values, including `clusterName`, and manually supplied values that Fleet already generates inside the token Secret. I replaced the script with the supported `--values ./values.yaml` installation flow and kept cluster identification as registration-time labels.
- The `fleet.yaml` example used `targets`, which is not valid in `fleet.yaml`. I changed it to `targetCustomizations`, the documented field for per-target bundle customization.
- The `fleet.yaml` example presented chart values such as `offline` and `syncIntervalMinutes` as if they were Fleet-native settings. I clarified that they are example application values passed through to the chart.
- The intermittent connectivity section implied that `GitRepo.spec.pollingInterval` reduces edge-cluster bandwidth. That field controls how often the Fleet manager polls Git, so I corrected the explanation accordingly.
- The agent connectivity snippet used unsupported `fleet-agent` values (`clientTimeout` and `checkInInterval`). Because the post prerequisites assume Rancher-managed Fleet, I replaced that snippet with the supported `rancher-config` ConfigMap form using valid settings such as `agentTLSMode` and `agentCheckinInterval`.
- The cluster labeling commands used the generic `cluster` resource name, which is ambiguous. I changed them to `clusters.fleet.cattle.io` and added `--overwrite` to make the examples safer for reruns.
- The bundle deployment status command targeted `fleet-default`, but `BundleDeployment` resources live in per-cluster namespaces. I changed that example to query `bundledeployments.fleet.cattle.io -A`.
- The monitoring comment claimed a command would identify disconnected clusters, but it only printed last check-in timestamps. I corrected the wording to match what the command actually returns.
- The conclusion used an absolute convergence claim that was too strong for intermittently connected clusters. I softened it so the behavior is described as convergence after connectivity returns.

## Review Notes
- The post does not pin a Fleet or Rancher version, so the examples were validated against the current official Fleet documentation and current `main` chart/source references available on April 30, 2026.
- The example values under `helm.values` are valid as Fleet input, but whether `offline.cacheEnabled`, `offline.cacheSize`, and `syncIntervalMinutes` do anything depends entirely on the application chart being deployed.
