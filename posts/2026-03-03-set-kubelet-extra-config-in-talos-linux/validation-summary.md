# Validation Summary: How to Set Kubelet Extra Config in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine.kubelet configuration block, machine.nodeLabels)
- Kubernetes kubelet (KubeletConfiguration v1beta1 API)
- talosctl CLI
- kubectl CLI
- Kubernetes feature gates (GracefulNodeShutdown, TopologyManager, CPUManager)

## Sources Consulted
- Talos v1.11 v1alpha1 MachineConfig reference: https://www.talos.dev/v1.11/reference/configuration/v1alpha1/config/
- Kubernetes KubeletConfiguration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubelet CLI reference (deprecation notes): https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes node-pressure eviction docs: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes reserve compute resources for system daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Cloud provider externalization (in-tree removed by 1.29): https://kubernetes.io/blog/2023/12/14/cloud-provider-integration-changes/
- Sibling validated Talos posts in this repo for `machine.nodeLabels` / `machine.nodeTaints` conventions

## Issues Found
1. **Incorrect `cluster.kubelet.*` config path** — The "Kubelet Configuration in Talos" section opened by claiming Talos exposes kubelet config under `cluster.kubelet.extraArgs` and `cluster.kubelet.extraConfig`. The Talos v1alpha1 schema has no `cluster.kubelet` key — kubelet lives **only** under `machine.kubelet`. Rewrote the intro paragraph to state this correctly, and removed the trailing "Note that ... kubelet settings can appear under both `machine.kubelet` and `cluster.kubelet`" sentence, which was the same incorrect claim.
2. **Missing `##` on Resource Reservation heading** — The "Resource Reservation" line was plain text rather than a markdown H2, so it would not render as a section header alongside the other sections. Added the `##` prefix.
3. **Invalid YAML folded scalar for `feature-gates`** — The Feature Gates example used `feature-gates: >-` with one entry per line. The `>-` folded scalar joins lines with **spaces**, producing `GracefulNodeShutdown=true, TopologyManager=true, CPUManager=true` (with spaces after the commas). The kubelet `--feature-gates` parser rejects whitespace inside the comma-separated list. Rewrote the value as a single quoted string with no spaces, and added a one-line note explaining the constraint so future readers don't reintroduce it.
4. **Deprecated `container-runtime-endpoint` CLI arg** — The "Kubelet Extra Args" example showed `container-runtime-endpoint` under `extraArgs`. This flag is deprecated by the kubelet in favor of `containerRuntimeEndpoint` inside the KubeletConfiguration file. Removed the deprecated example line and added a short note directing readers to set `extraConfig.containerRuntimeEndpoint` instead.

## Review Notes
- `registerWithTaints` is shown under `machine.kubelet.extraConfig` in the "Node Labels and Taints via Kubelet" section. That is valid (it is a real KubeletConfiguration field passed through), but Talos also exposes a native `machine.nodeTaints` field that is the parallel of `machine.nodeLabels`. Left the example as-is since it is technically correct; a future iteration could add a "preferred way" snippet for taints similar to the labels one.
- `rotate-server-certificates`, `node-ip`, `cloud-provider`, `node-labels`, and `feature-gates` extraArgs are all still accepted by the kubelet. `cloud-provider` only meaningfully accepts `""` or `external` now that in-tree cloud providers were removed in Kubernetes 1.29.
- All KubeletConfiguration field names used in the post (`maxPods`, `serializeImagePulls`, `imageGC*`, `eviction*`, `systemReserved`, `kubeReserved`, `enforceNodeAllocatable`, `containerLogMax*`, `maxParallelImagePulls`, `registryPullQPS`, `registryBurst`, `cpuManagerPolicy`, `topologyManagerPolicy`, `shutdownGracePeriod*`, `registerWithTaints`) are valid in the v1beta1 KubeletConfiguration as of Kubernetes 1.30+.
- The graceful shutdown math ("regular pods 40 seconds (60s minus 20s), critical pods an additional 20 seconds") is correct: total = `shutdownGracePeriod`, of which `shutdownGracePeriodCriticalPods` is reserved at the end for critical pods.
- The `kubectl get --raw .../proxy/configz` verification command is correct and works against any node where the kubelet's read-only port / proxied configz endpoint is reachable through the API server.
