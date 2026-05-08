# Validation Summary: Validate Cilium Requirements on GKE

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Google Kubernetes Engine
- GKE Dataplane V2
- Google Cloud IAM
- eBPF

## Sources Consulted
- Google Cloud GKE Dataplane V2 documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud Dataplane V2 usage guide: https://cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Google Cloud VPC-native clusters documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/alias-ips
- Google Cloud VPC-native cluster creation and verification guide: https://cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- Google Cloud GKE node images documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/node-images
- Google Cloud GKE IAM roles documentation: https://cloud.google.com/iam/docs/roles-permissions/container
- Google Cloud GKE node service account documentation: https://docs.cloud.google.com/kubernetes-engine/security/configure-node-service-accounts
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium installation using Helm, GKE tab: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium GKE IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/gke.html
- Cilium taints and unmanaged pods guidance: https://docs.cilium.io/en/stable/installation/taints.html

## Issues Found
- The post said to check GKE Dataplane V2 by grepping for `cilium` pods. Google documents the GKE Dataplane V2 agent as the `anetd` DaemonSet in `kube-system`, so the command was changed to `kubectl -n kube-system get pods -l k8s-app=anetd`.
- The requirements diagram used `Kernel >= 5.4`. Current Cilium documentation lists Linux kernel `>= 5.10` or equivalent for Cilium running from the container image, so the diagram was updated.
- The NetworkPolicy check did not distinguish legacy dataplane behavior from Dataplane V2. Google documents NetworkPolicy enforcement as built in for Dataplane V2 and not separately enabled or disabled, so comments were clarified.
- The IAM note mentioned ENI/networking operations, which is AWS terminology and not applicable to GKE. The note was corrected to focus on the GKE node service account minimum role, `roles/container.defaultNodeServiceAccount`.
- The post presented VPC-native mode as an unconditional Cilium requirement. The wording was narrowed to GKE Dataplane V2 and modern Cilium-on-GKE deployments, matching Google Dataplane V2 guidance and current GKE networking defaults more closely.
- The best practices referenced Workload Identity by its older short name. It was updated to Workload Identity Federation for GKE.
- The post omitted Cilium's GKE-specific guidance about creating clusters or node pools with the `node.cilium.io/agent-not-ready=true:NoExecute` taint, or using another documented unmanaged-pod strategy, for upstream Cilium on non-Dataplane V2 GKE. A best-practice bullet was added.

## Review Notes
The `gcloud container clusters describe`, `gcloud container node-pools list`, `kubectl get nodes -o jsonpath=...`, and IAM policy inspection commands are structurally valid. The review environment did not have the `gcloud` CLI installed, so command syntax was verified against official documentation rather than local CLI help.
