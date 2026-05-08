# Validation Summary: How to Upgrade Calico VPP on Kubernetes Safely

## Status
validated

## Post Type
Tutorial / upgrade guide

## Technologies Covered
- Calico Open Source
- Calico VPP data plane
- Tigera Operator
- Kubernetes DaemonSets
- kubectl
- calicoctl
- VPP CLI

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes, https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Get started with VPP networking, https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico documentation: VPP data plane implementation details, https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico documentation: VPP data plane troubleshooting, https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- Project Calico VPP v3.27.0 manifests, https://raw.githubusercontent.com/projectcalico/vpp-dataplane/v3.27.0/yaml/generated/calico-vpp.yaml
- Project Calico v3.27.0 operator CRDs, https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/operator-crds.yaml
- Kubernetes documentation: DaemonSet, https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes documentation: kubectl set image, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#set-image
- Kubernetes documentation: kubectl drain, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The post used `kubectl exec` without specifying the VPP container and referred to a `<vpp-manager-pod>`. The official VPP DaemonSet pod is `calico-vpp-node`, with containers named `vpp` and `agent`; `vppctl` should be run in the `vpp` container. Updated the commands to use `<calico-vpp-node-pod>` and `-c vpp`.
- The post only applied `tigera-operator.yaml` for an operator upgrade. Current Calico upgrade documentation requires applying the Calico CRDs and Tigera Operator manifests with server-side apply and force conflicts. Added the `operator-crds.yaml` command and corrected the apply flags.
- The post updated a non-existent DaemonSet container name, `vpp-manager`. The official v3.27.0 VPP manifests use container names `vpp` and `agent`, with images `docker.io/calicovpp/vpp:v3.27.0` and `docker.io/calicovpp/agent:v3.27.0`. Updated the `kubectl set image` command accordingly.
- The post implied that cordoning controls the VPP DaemonSet rollout node by node. Kubernetes DaemonSet pods tolerate unschedulable nodes, so cordoning alone does not prevent DaemonSet replacement; draining is needed to evict ordinary workload pods before maintenance. Added `kubectl drain --ignore-daemonsets --delete-emptydir-data` and changed the DaemonSet update to `OnDelete` so each node's VPP pod can be replaced deliberately.
- The post described VPP restarts as resetting connections. This is generally possible but too absolute for all traffic types, so the wording was softened to "can be disrupted."

## Review Notes
- The guide is technically relevant and contains implementation commands, so it was reviewed as a code/technical blog post.
- The VPP project documentation currently emphasizes applying generated VPP manifests. Directly setting DaemonSet images can work for an image-only upgrade, but future VPP releases may include manifest, RBAC, ConfigMap, probe, or volume changes that require applying the generated manifest for the target version.
