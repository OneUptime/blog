# Validation Summary: How to Schedule Pods on Control Plane Nodes in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl patch machineconfig`)
- Kubernetes (taints, tolerations, node affinity, nodeSelector)
- DaemonSets
- Prometheus Node Exporter (`prom/node-exporter:v1.7.0`)
- Fluent Bit (`fluent/fluent-bit:2.2`)
- Calico (`calico/node:v3.27.0`)
- `kubectl` CLI

## Sources Consulted
- Talos v1.7 config reference — `cluster.allowSchedulingOnControlPlanes` field: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos v1.9 configuration patches docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes node controller taints by condition: https://kubernetes.io/docs/concepts/architecture/nodes/#taints-on-nodes-by-condition
- Kubernetes DaemonSet default tolerations: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#taints-and-tolerations

## Issues Found
- **Calico DaemonSet `not-ready` toleration had the wrong effect.** The example tolerated `node.kubernetes.io/not-ready` with `effect: NoSchedule`, but the node controller applies that taint with `NoExecute`. A toleration only matches when both the key and effect match, so the original example would not have actually allowed the DaemonSet to keep running on a not-ready node during bootstrap. Changed `effect: NoSchedule` to `effect: NoExecute` to match the real taint and align with the comment ("Also tolerate not-ready during bootstrap").

## Review Notes
- The control plane taint key (`node-role.kubernetes.io/control-plane:NoSchedule`) is correct for modern Kubernetes (1.24+).
- `cluster.allowSchedulingOnControlPlanes: true` is a valid Talos machine config field; the `talosctl patch machineconfig --nodes ... --patch '{...}'` invocation is correct (Talos auto-detects strategic merge vs. JSON patch format).
- The `nodeSelector` example uses `node-role.kubernetes.io/control-plane: ""`, which is the correct empty-string label value applied by Talos / kubeadm-style control plane nodes.
- The three taint effects listed in "Common Mistakes" (`NoSchedule`, `PreferNoSchedule`, `NoExecute`) and their descriptions are accurate.
- Minor formatting nit (not changed per scope rules): the "Resource Considerations" line on line 290 is missing the `##` heading prefix, so it renders as a paragraph instead of a section header. Worth fixing in a future stylistic pass.
- Container image tags referenced (`prom/node-exporter:v1.7.0`, `fluent/fluent-bit:2.2`, `calico/node:v3.27.0`) are real, published tags but will age — readers should bump to the current stable versions when adopting these manifests.
