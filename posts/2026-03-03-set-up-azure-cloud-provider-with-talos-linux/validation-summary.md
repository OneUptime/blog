# Validation Summary: How to Set Up Azure Cloud Provider with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Azure (Azure CLI, Azure Resource Manager, Azure Load Balancer, Azure Managed Disks, Azure Managed Identity)
- Kubernetes
- cloud-provider-azure (Azure Cloud Controller Manager)
- Helm
- kubectl
- talosctl

## Sources Consulted
- [cloud-provider-azure Load Balancer documentation](https://cloud-provider-azure.sigs.k8s.io/topics/loadbalancer/)
- [cloud-provider-azure GitHub repository](https://github.com/kubernetes-sigs/cloud-provider-azure)
- [cloud-provider-azure Helm chart values.yaml](https://raw.githubusercontent.com/kubernetes-sigs/cloud-provider-azure/master/helm/cloud-provider-azure/values.yaml)
- [Talos Linux configuration reference](https://www.talos.dev/v1.9/reference/configuration/)
- [Talos Linux Azure installation guide](https://www.talos.dev/v1.10/talos-guides/install/cloud-platforms/azure/)

## Issues Found

1. **Invalid load balancer SKU annotation** — The test service YAML used `service.beta.kubernetes.io/azure-load-balancer-sku: Standard`, which is not a real annotation in cloud-provider-azure. The load balancer SKU is a cluster-wide setting configured via the `loadBalancerSku` field in the cloud config (already set to `"Standard"` earlier in the post) and cannot be overridden per-service. Removed the annotation and added a one-line clarification noting that the SKU is set cluster-wide.

## Review Notes

- The `helm install` example sets both `cloudControllerManager.cloudConfig=/etc/kubernetes/azure.json` and `cloudControllerManager.cloudConfigSecretName=azure-cloud-provider`. When using a secret, the upstream chart example sets `cloudConfig` to `null` so the secret is used exclusively; setting both is not technically wrong (the chart prefers the secret when present) but is slightly redundant. Left as-is since it is not technically incorrect.
- The post references `master` branch URLs for the cloud-provider-azure manifests and Helm repo. These work today, but pinning to a tagged release would be more reproducible. Not changed since it does not break the example.
- The `externalCloudProvider` Talos cluster config field with `enabled` and `manifests` sub-keys is correct and matches the v1alpha1 cluster config schema.
- The Azure cloud config field names (`tenantId`, `subscriptionId`, `aadClientId`, `aadClientSecret`, `useManagedIdentityExtension`, `userAssignedIdentityID`, `loadBalancerSku`, `cloudProviderBackoff*`, `cloudProviderRateLimit*`, etc.) all match the upstream `Config` struct in cloud-provider-azure.
- The `az ad sp create-for-rbac` and `az network` commands and their flags are valid current Azure CLI syntax.
- The `service.beta.kubernetes.io/azure-load-balancer-internal: "true"` annotation is valid and current.
