# Validation Summary: How to List Resources Using the Rancher API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher v3 API
- Rancher Kubernetes API (RK-API)
- Kubernetes REST API
- Bash
- `curl`
- `jq`

## Sources Consulted
- Rancher, Previous v3 Rancher API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher, RK-API Quick Start Guide: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher, API Reference: https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher, Projects workflow: https://ranchermanager.docs.rancher.com/api/workflows/projects
- Rancher, Global Resources: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-resources
- Rancher, Managing HPAs with kubectl: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/horizontal-pod-autoscaler/manage-hpas-with-kubectl
- Rancher Norman collection types: https://raw.githubusercontent.com/rancher/norman/master/types/types.go
- Rancher generated management client for legacy v3 nodes: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/client/generated/management/v3/zz_generated_node.go
- Rancher generated management client for legacy v3 clusters: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/client/generated/management/v3/zz_generated_cluster.go
- Rancher generated management client for legacy v3 cluster version info: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/client/generated/management/v3/zz_generated_info.go
- Rancher generated management client for legacy v3 users: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/client/generated/management/v3/zz_generated_user.go
- Rancher generated management client for legacy v3 global role bindings: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/client/generated/management/v3/zz_generated_global_role_binding.go
- Rancher generated management client for legacy v3 cluster role template bindings: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/client/generated/management/v3/zz_generated_cluster_role_template_binding.go
- Rancher catalog types for cluster repositories: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/catalog.cattle.io/v1/types.go
- Rancher catalog types for installed apps: https://raw.githubusercontent.com/rancher/rancher/release/v2.13/pkg/apis/catalog.cattle.io/v1/helm.go
- Kubernetes API Overview: https://kubernetes.io/docs/reference/using-api/
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes API Reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/

## Issues Found
- The post treated all list responses as Rancher v3 collection objects. I updated the explanation to distinguish `/v3/...` responses, which use `data`, from Kubernetes proxy responses, which use `items`.
- The Kubernetes proxy examples used incorrect REST paths such as `/k8s/clusters/.../v1/pods` and `/k8s/clusters/.../v1/apps.deployments`. I replaced them with standard Kubernetes API paths under the Rancher proxy, such as `/api/v1/pods` and `/apis/apps/v1/deployments`.
- The Kubernetes proxy examples parsed `.data[]` and `.data | length`, which is incorrect for Kubernetes list responses. I updated them to use `.items[]` and `.items | length`.
- The namespace example used the older deep `/v3/clusters/${CLUSTER_ID}/namespaces` pattern. I replaced it with the Kubernetes API path and the Rancher project annotation `field.cattle.io/projectId`.
- The role binding examples mislabeled returned fields by naming `globalRoleId` as `globalRoleName` and `userPrincipalId` as `userId`. I corrected the output keys to match the actual returned fields.
- The catalog/app examples used incorrect API paths and an unreliable repository "state" extraction. I updated them to use `/apis/catalog.cattle.io/v1/...` paths and a `Downloaded` condition lookup supported by Rancher’s catalog types.
- The inventory script repeated the same incorrect Kubernetes proxy paths and list handling. I corrected the script to use the standard proxied Kubernetes paths and `.items`.

## Review Notes
- Rancher v2.8+ documents the Rancher Kubernetes API as the current public API, while the previous `/v3` API is still available. The post still uses `/v3` for Rancher-level resources that are valid there, but Kubernetes-native resource examples now use the standard proxied Kubernetes API paths.
- `curl -k` works for examples but disables TLS verification. It is acceptable for lab or demo usage, but it is not ideal for production automation.
