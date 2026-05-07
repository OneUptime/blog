# Validation Summary: How to Configure NodePort Services in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes Services
- NodePort
- `kubectl`
- RKE2
- K3s
- RKE1

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes external traffic policy documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Rancher Services documentation: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-resources-setup/create-services
- Rancher Workload with NodePort quick start: https://ranchermanager.docs.rancher.com/v2.12/getting-started/quick-start-guides/deploy-workloads/nodeports
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher K3s cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/cluster-configuration/rancher-server-configuration/k3s-cluster-configuration
- Rancher RKE cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- RKE1 services configuration reference: https://rke.docs.rancher.com/config-options/services

## Issues Found
- The Rancher UI navigation in Step 3 skipped the current `Cluster Management` and `Explore` flow. I updated the steps to match the documented Rancher UI path.
- The NodePort range section described changing kube-apiserver arguments directly, but Rancher documents a dedicated `NodePort Service Port Range` or `Node Port Range` cluster setting. I updated Step 6 to use the Rancher-managed configuration flow and clarified the older RKE1 equivalent.
- The monitoring and troubleshooting commands used the `Endpoints` API. Kubernetes now documents `EndpointSlice` as the replacement, and the Endpoints API is deprecated in v1.33+. I updated those commands to use `kubectl get endpointslice -l kubernetes.io/service-name=...`.
- The in-cluster connectivity example used `kubectl run` without `--command` and `--restart=Never`, which makes the command unreliable for a one-shot BusyBox probe. I corrected the command and added `-n default` so it runs in the same namespace as the service.

## Review Notes
- `nginx:latest` is technically valid, but pinning a specific image tag would make the walkthrough more reproducible.
- The post is now technically accurate for current Kubernetes behavior and current Rancher UI flows, while treating RKE1 as a legacy case rather than the default path.
