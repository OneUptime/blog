# Validation Summary: How to Cordon and Drain Nodes in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- kubectl
- jq
- PodDisruptionBudget

## Sources Consulted
- Rancher Manager docs: Nodes and Machine Pools (v2.12): https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/nodes-and-machine-pools
- Kubernetes docs: `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes docs: `kubectl cordon` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes docs: `kubectl uncordon` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_uncordon/
- Kubernetes docs: Safely Drain a Node: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes docs: Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes docs: Disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes docs: kubectl Quick Reference: https://kubernetes.io/docs/reference/kubectl/quick-reference

## Issues Found
- The introduction and drain definition overstated drain behavior by implying that drain evicts all running or all non-DaemonSet pods. I corrected this to reflect official Kubernetes behavior: drain cordons the node and evicts only drainable pods, while controller-managed workloads are typically recreated elsewhere.
- The Rancher drain options table included hard-coded default values that are not documented in the current Rancher node-management guide, and the `Force` / `Delete Empty Dir Data` descriptions were imprecise. I removed the unsupported defaults and corrected the option descriptions to match Kubernetes drain behavior.
- The event-sorting example used `--sort-by='.lastTimestamp'`, which is no longer the preferred field in current Kubernetes examples. I updated it to `--sort-by='.metadata.creationTimestamp'`.
- The `emptyDir` detection command could produce incomplete or duplicate results. I updated the `jq` filter to reliably detect pods with `emptyDir` volumes and print `namespace/name`.
- The standalone-pod section was too narrow and did not match the official `kubectl drain` rules. I corrected the explanation to cover mirror pods and the supported controller kinds, and updated the `jq` example accordingly.
- The verification note after drain said only DaemonSet pods should remain. I corrected this to note that mirror pods can also remain after a drain.
- The best-practices section implied that users must always cordon manually before draining. I corrected this to note that drain already cordons the node, while manual cordoning can still be useful earlier in a maintenance workflow.

## Review Notes
- The post is now technically accurate against the official Rancher and Kubernetes documentation reviewed on 2026-05-07.
- Rancher UI wording and available drain controls can vary slightly by Rancher version and cluster type, so avoiding undocumented default values is the safer long-term approach.
