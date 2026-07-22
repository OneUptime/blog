# Validation Summary: Running Groundcover Across EKS, AKS, GKE, and On-Premises Clusters

## Status

validated

## Post Type

Technical deployment and operations guide

## Technologies Covered

- Groundcover and its eBPF sensor
- Kubernetes DaemonSets, Helm, node scheduling, taints, tolerations, and affinity
- Amazon EKS, including EC2-backed node groups, Fargate, and Graviton/ARM nodes
- Azure Kubernetes Service (AKS), including Linux system and user node pools
- Google Kubernetes Engine (GKE) Standard and Autopilot
- Self-managed and on-premises Kubernetes
- Linux kernels, BTF, eBPF CO-RE, x86, and ARM
- GitOps, multi-cluster identity, and Groundcover Fleet Manager
- Groundcover BYOC, on-premises, air-gapped, and high-availability architectures

## Sources Consulted

- [Groundcover Kubernetes requirements](https://docs.groundcover.com/getting-started/requirements/kubernetes-requirements)
- [Groundcover kernel requirements for the eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover supported CPU architectures](https://docs.groundcover.com/getting-started/requirements/cpu-architectures)
- [Groundcover sensor deployment coverage](https://docs.groundcover.com/customization/customize-deployment/configuring-sensor-deployment-coverage)
- [Groundcover Kubernetes installation](https://docs.groundcover.com/getting-started/installation-and-updating/connect-kubernetes-cluster)
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Groundcover high-availability architecture](https://docs.groundcover.com/architecture/byoc/high-availability)
- [Groundcover Fleet Manager](https://docs.groundcover.com/use-groundcover/fleet-manager)
- [Groundcover sensitive-data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Amazon EKS Fargate considerations](https://docs.aws.amazon.com/eks/latest/userguide/fargate.html)
- [AKS system and user node pools](https://learn.microsoft.com/en-us/azure/aks/use-system-pools)
- [Azure Policy for AKS](https://learn.microsoft.com/en-us/azure/aks/use-azure-policy)
- [AKS node images](https://learn.microsoft.com/en-us/azure/aks/node-images)
- [GKE privileged workload admission in Autopilot](https://cloud.google.com/kubernetes-engine/docs/concepts/about-autopilot-privileged-workloads)
- [GKE Autopilot partner workloads](https://cloud.google.com/kubernetes-engine/docs/resources/autopilot-partners)
- [GKE node images](https://cloud.google.com/kubernetes-engine/docs/concepts/node-images)
- [Kubernetes DaemonSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes DaemonSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/)

## Issues Found

No technical issues found.

## Review Notes

- The post contains no runnable code or commands, but it provides substantial technical implementation and operational guidance, so it was reviewed as a technical guide rather than classified as `not-code-blog`.
- Groundcover currently documents Kubernetes 1.21 as its minimum supported version. This is a vendor compatibility statement, not an assertion that Kubernetes 1.21 remains within upstream support; the wording in the post correctly attributes the requirement to Groundcover.
- Groundcover is not listed in Google's current public table of GKE Autopilot partner workloads. The post correctly avoids claiming Autopilot support and directs operators to confirm compatibility for the exact Groundcover version and configuration.
- All external links in the post resolved successfully during validation. Provider node images, managed compute restrictions, admission controls, and partner allowlists are time-sensitive and should be rechecked during future reviews.
