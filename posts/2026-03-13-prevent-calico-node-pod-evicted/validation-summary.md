# Validation Summary: How to Prevent Calico Node Pod Eviction

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Calico (calico-node DaemonSet, FelixConfiguration)
- Kubernetes (DaemonSets, PriorityClass, kubelet, node-pressure eviction)
- kubectl CLI

## Sources Consulted
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes node-pressure eviction docs: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes kubelet configuration reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico installation/operator docs: https://docs.tigera.io/calico/latest/
- kubectl patch documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#patch

## Issues Found
- **Misleading section header in Prevention 3.** The original header read "Set eviction threshold higher for calico-node namespace". This was technically inaccurate because kubelet eviction thresholds (`evictionHard`, `evictionSoft`) are configured at the node/kubelet level, not per-namespace. The configuration shown in the code block was actually correct kubelet-level config. Changed the header to "Configure kubelet eviction thresholds" to accurately reflect the scope of the setting.

## Review Notes
- `system-node-critical` is the correct built-in PriorityClass for node-critical daemons like calico-node and kube-proxy. Kubelet considers Pod Priority when ranking pods for node-pressure eviction, so this guidance is sound.
- The kubectl jsonpath query (`{.spec.template.spec.priorityClassName}`) correctly targets a DaemonSet's pod template.
- The DaemonSet YAML snippet is structurally valid and the resource requests/limits (250m/256Mi requests, 1000m/512Mi limits) are reasonable for typical clusters; very large clusters with many endpoints may need higher memory limits, but the values are appropriate as a baseline.
- `logSeverityScreen` is a valid FelixConfiguration field. Accepted values include Debug, Info, Warning, Error, and Fatal; "Warning" is correctly used.
- The `kubectl patch felixconfiguration default --type merge` command syntax is correct (the resource name in Calico is `felixconfiguration`/`felixconfigurations`, with `default` being the cluster-wide instance).
- The example kubelet eviction values are illustrative; operators should tune these to their environment rather than copy verbatim. No change needed since the surrounding comments make this clear.
