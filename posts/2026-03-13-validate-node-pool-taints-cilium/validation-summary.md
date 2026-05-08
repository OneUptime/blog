# Validation Summary: Validate Node Pool Taints with Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Cilium
- Kubernetes DaemonSets
- Kubernetes taints and tolerations
- kubectl
- Cilium CLI

## Sources Consulted
- Kubernetes documentation: Taints and Tolerations, https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes documentation: DaemonSet taints and tolerations, https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes documentation: kubectl patch reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation: Update API Objects in Place Using kubectl patch, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Cilium documentation: Helm values reference, https://docs.cilium.io/en/stable/helm-values/
- Cilium documentation: cilium connectivity test command reference, https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium source code: connectivity test toleration handling, https://github.com/cilium/cilium

## Issues Found
- The DaemonSet patch example stated that existing Cilium tolerations would be kept, but Kubernetes strategic merge patches replace the `tolerations` list instead of merging it. Updated the example to make clear that the patch replaces tolerations with the complete desired list.
- The toleration patch listed redundant specific taint tolerations after broad `Exists` tolerations. Updated it to the simpler Cilium-style catch-all toleration, `operator: Exists`, which matches all taint keys and effects and is consistent with Cilium's Helm default for agent scheduling.
- The Cilium connectivity test command targeted a tainted node label but did not add a toleration for the test pods. Added `--tolerations workload-type` so the connectivity test pods can schedule onto nodes tainted with the `workload-type` key.

## Review Notes
The post is technically relevant and current. Cilium's Helm chart defaults already include a catch-all agent toleration in standard installations, but validating the rendered DaemonSet remains useful because managed add-ons, GitOps overlays, or custom chart values may alter the deployed tolerations.
