# Validation Summary: How to Verify Pod Networking with Calico on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon VPC CNI
- Kubernetes
- kubectl
- Kubernetes NetworkPolicy
- Calico
- Tigera Operator
- calicoctl
- BusyBox

## Sources Consulted
- Tigera Calico EKS installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Tigera Calico installation API reference for TigeraStatus: https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Tigera Calico networking option guidance for AWS: https://docs.tigera.io/calico/latest/networking/determine-best-networking
- Amazon EKS Amazon VPC CNI best practices: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS networking best practices: https://docs.aws.amazon.com/eks/latest/best-practices/networking.html
- Amazon EKS VPC CNI pod IP assignment guide: https://docs.aws.amazon.com/eks/latest/userguide/managing-vpc-cni.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- BusyBox wget help output from BusyBox v1.36.1 installed in the review environment.

## Issues Found
- The BusyBox test pod command passed `sleep 3600` as container arguments. Current `kubectl run` documentation requires `--command --` when the extra words should become the container command. Updated the command to `kubectl run pod-a --image=busybox --restart=Never --command -- sleep 3600`.
- The timeout test used `wget --timeout=5` inside a BusyBox pod. BusyBox `wget` documents `-T SEC` for the network read timeout option, so the example could fail with the image used in the post. Updated it to `wget -T 5 -qO-`.

## Review Notes
The EKS and Calico architecture explanation matches Tigera's EKS guidance for Amazon VPC networking: AWS VPC CNI provides CNI/IPAM, Calico provides policy, BGP is disabled, and pod IPs come from the VPC. The guide assumes Calico is the network policy engine; Tigera's EKS documentation warns not to enable AWS VPC CNI network policy at the same time because it conflicts with Calico. `kubectl` was not installed in the review environment, so kubectl syntax was verified against the official generated Kubernetes reference instead of local help output.
