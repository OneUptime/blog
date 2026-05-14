# Validation Summary: How to Apply Tolerations to the Cilium EKS Add-On

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes DaemonSets, taints, and tolerations
- Amazon EKS
- Helm
- kubectl

## Sources Consulted
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- AWS EKS Hybrid Nodes Cilium CNI documentation: https://docs.aws.amazon.com/eks/latest/userguide/hybrid-nodes-cni.html
- Amazon EKS add-ons documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The post described Cilium as an EKS add-on and a managed DaemonSet. Cilium is installed and managed with Helm for EKS use cases; AWS supports Cilium for EKS Hybrid Nodes through AWS-maintained Helm charts, while it is not an Amazon EKS managed add-on for cloud nodes. Updated the title, description, prerequisites, introduction, and Helm section to reflect this.
- The post included Windows nodes as a target for Cilium agent scheduling. Cilium requires Linux hosts and the official Helm chart defaults the agent node selector to `kubernetes.io/os: linux`. Removed Windows-node claims and scoped the guidance to Linux nodes.
- The first Helm command replaced the default wildcard toleration without preserving it, which contradicted the earlier warning that overriding tolerations can prevent scheduling on other tainted nodes. Updated the example to keep `tolerations[0].operator=Exists` and added `--reuse-values`.
- The architecture diagram said a node was missing CNI when the Cilium pod was not scheduled. Updated this to "Node missing Cilium agent" for accuracy.
- The verification section said every node should have a corresponding Cilium pod. Updated it to every Linux node that Cilium manages, since Cilium's default Helm values target Linux nodes.

## Review Notes
The command syntax for `kubectl get ds`, JSONPath access to DaemonSet tolerations, `kubectl get nodes -o custom-columns`, and Helm `--set` array paths is consistent with Kubernetes and Helm usage. The post could later distinguish upstream Cilium Helm charts from AWS-maintained ECR Public charts for EKS Hybrid Nodes in more detail, but the corrected guidance is technically valid.
