# Validation Summary: How to Implement Blue-Green Deployments in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes Deployments
- Kubernetes Services
- EndpointSlices
- Readiness probes
- `kubectl`
- Blue-green deployment

## Sources Consulted
- Rancher: Access a Cluster with Kubectl and kubeconfig: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Kubernetes: Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes: EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes: Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes: `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes: `kubectl create namespace`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes: `kubectl rollout`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The post described the Service selector switch as "atomic" and "instant." I changed that wording to reflect Kubernetes' actual behavior: the Service update is a single API change, but traffic shifts as EndpointSlices and node-level proxy rules reconcile.
- The walkthrough assumed the `my-app` namespace already existed. I added `kubectl create namespace my-app` so the example works on a fresh cluster.
- The rollback wording implied the selector could always be flipped back. I clarified that this only works before the blue deployment is deleted, and I adjusted the cleanup wording to preserve that rollback window.

## Review Notes
- The manifests use current, non-deprecated Kubernetes APIs: `apps/v1` for Deployments and `v1` for Services.
- Rancher is not adding a separate blue-green primitive in this post; the workflow is standard Kubernetes applied to a Rancher-managed cluster through `kubectl`.
- Rancher documentation notes that resources created with `kubectl` are discovered by Rancher, but the first Rancher UI/API operation on them can trigger recreation because those resources may initially lack Rancher-specific annotations.
