# Validation Summary: How to Cordon and Uncordon Nodes in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes (kubectl)
- DaemonSets
- Node taints and tolerations
- jq (for JSON parsing)

## Sources Consulted
- Kubernetes documentation on Safely Drain a Node: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- kubectl cordon/uncordon reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#cordon
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- DaemonSets and default tolerations: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#taints-and-tolerations
- Talos Linux talosctl reference: https://www.talos.dev/v1.7/reference/cli/
- Talos Linux upgrade documentation: https://www.talos.dev/v1.7/talos-guides/upgrading-talos/
- Sidero Labs installer image registry: ghcr.io/siderolabs/installer

## Issues Found
- The "Resource Pressure Situations" subsection heading was missing its `###` Markdown heading prefix. It appeared as plain text within the "Cordon and Talos Linux Operations" section. Added `###` to make it a proper subsection heading consistent with its siblings ("Before Talos Upgrades", "Before Configuration Changes").

## Review Notes
- The technical content is accurate: `kubectl cordon` sets `spec.unschedulable: true`, and the node lifecycle controller then adds the `node.kubernetes.io/unschedulable:NoSchedule` taint. The post phrases this as cordon doing both, which is a common and reasonable shorthand.
- DaemonSet default tolerations correctly include `node.kubernetes.io/unschedulable:NoSchedule`, so the claim that DaemonSets ignore the unschedulable taint is accurate.
- The `maintenance=true:NoExecute` custom taint example correctly evicts DaemonSet pods, since DaemonSets do not tolerate arbitrary custom NoExecute taints by default.
- Talos v1.7.0 in the upgrade example is somewhat older relative to the post's publication date (2026-03-03), but it remains a valid example and the `ghcr.io/siderolabs/installer` image path is correct.
- The Kubernetes v1.29.0 example version in the `kubectl get nodes` output is older but still valid for illustration purposes.
- The `kubectl get node ... -o jsonpath='{.spec.unschedulable}'` behavior described (returns "true" when cordoned, empty when not) is correct since the field is absent on uncordoned nodes.
- The bulk operation selectors (`!node-role.kubernetes.io/control-plane`, `topology.kubernetes.io/zone=...`) use standard Kubernetes label selector syntax and are correct.
