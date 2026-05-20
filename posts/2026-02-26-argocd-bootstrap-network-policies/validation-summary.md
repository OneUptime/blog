# Validation Summary: How to Bootstrap Network Policies with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes CNI plugins
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD sync waves and sync options
- Kustomize
- kubectl
- Amazon EKS / AWS VPC CNI
- Azure CNI network policy
- Calico and Cilium

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD directory source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet list generator documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-List/
- Amazon EKS network security best practices: https://docs.aws.amazon.com/eks/latest/best-practices/network-security.html
- Amazon VPC CNI network policy announcement and guidance: https://aws.amazon.com/blogs/containers/amazon-vpc-cni-now-supports-kubernetes-network-policies/
- Azure Kubernetes network policy documentation: https://learn.microsoft.com/en-us/azure/virtual-network/kubernetes-network-policies
- Cilium Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/cilium-network-policy/
- Calico network policy documentation: https://docs.tigera.io/calico/latest/about/about-network-policy

## Issues Found
- The CNI support table said AWS VPC CNI requires the Calico addon. Current EKS documentation describes native Kubernetes NetworkPolicy support in Amazon VPC CNI when network policy is enabled, with Calico still useful for advanced policy capabilities. Updated the table and the EKS note accordingly.
- The ArgoCD namespace policy comment said ingress-nginx reaches the API server. The policy is for the ArgoCD namespace and the listed ports are for ArgoCD server access, so the comment now says ArgoCD server.
- The monitoring namespace example treated Prometheus scraping as ingress into the monitoring namespace. Scraping workloads in other namespaces is outbound traffic from Prometheus, so the ingress rule was changed to allow ingress-nginx to reach Prometheus and Grafana ports instead.
- The ApplicationSet introduction said it was for dynamic namespace creation. The shown list generator creates Applications from a configured list; it does not create namespaces or dynamically discover them. Updated the wording to "managing policies across multiple namespaces."

## Review Notes
- The Kubernetes NetworkPolicy examples use the current `networking.k8s.io/v1` API and valid selector semantics.
- The Argo CD `argocd.argoproj.io/sync-wave` annotation and `ServerSideApply=true` sync option are current and correctly placed.
- The ApplicationSet example uses fasttemplate-style placeholders, which are still documented, but Argo CD documentation now recommends Go templates for newer manifests.
- `kubectl` was not installed in the local workspace, so command validation was performed against the official Kubernetes generated command reference.
