# Validation Summary: How to Automate Rancher Tasks with the API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager API
- Rancher Kubernetes API (`management.cattle.io/v3` and `ext.cattle.io/v1`)
- Kubernetes API
- Bash
- `curl`
- `jq`
- `kubectl`
- GitLab CI
- GitHub Actions

## Sources Consulted
- Rancher: Users workflow - https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher: Kubeconfigs workflow - https://ranchermanager.docs.rancher.com/api/workflows/kubeconfigs
- Rancher: API Reference - https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher: API Keys - https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher: How Resource Quotas Work in Rancher Projects - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- SUSE Rancher for AWS: Managing HPAs with kubectl - https://documentation.suse.com/en-us/cloudnative/rancher-srfa/latest/en/cluster-admin/kubernetes-resources/horizontal-pod-autoscaler/manage-hpas-with-kubectl.html
- Kubernetes: API Concepts - https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes: Namespace API reference - https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/namespace-v1/
- Kubernetes: ResourceQuota API reference - https://kubernetes.io/zh-cn/docs/reference/kubernetes-api/policy-resources/resource-quota-v1/
- Kubernetes: Job API reference - https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/job-v1/
- Kubernetes: Install and Set Up kubectl on Linux - https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ee/ci/yaml/

## Issues Found
- The description claimed the post covered cluster provisioning and backup scheduling, but the body did not. It was corrected to match the actual sections in the post.
- The user onboarding example created users with the `password` field directly on the `User` object. Rancher’s current user workflow documents local user creation as a two-step flow: create the `User`, then create a password `Secret` in `cattle-local-user-passwords`. The example was updated accordingly.
- The onboarding example used outdated role-binding shapes (`globalRoleId`, `userId`, `clusterId`, `roleTemplateId`) and generic `/v3/...Bindings` endpoints. It was corrected to use current RK-API resources and fields: `GlobalRoleBinding` with `globalRoleName` and `userName`, and namespaced `ClusterRoleTemplateBinding` with `clusterName`, `roleTemplateName`, and `userName`.
- The onboarding example accepted an `email` parameter that Rancher’s documented `User` resource does not use, and the batch CSV example depended on an `onboard_user` function that it did not source. The unused email parameter was removed and the batch example was corrected to source the onboarding script.
- The namespace provisioning section claimed to create network policies, but the code only created a namespace and a resource quota. The wording was corrected.
- The namespace provisioning example used incorrect downstream Kubernetes API paths and an unnecessary project label. It was corrected to use `/api/v1/namespaces`, namespaced `resourcequotas`, and Rancher’s documented `field.cattle.io/projectId` annotation format of `<cluster-id>:<project-id>`.
- The cluster health example checked nodes through `/v3/nodes?clusterId=...` and looked for a Rancher node `state`. It was updated to use the downstream Kubernetes nodes API and evaluate the standard `Ready` condition.
- Both CI examples generated kubeconfig through the older cluster action endpoint. They were updated to use the documented `kubeconfigs.ext.cattle.io` resource and read the generated kubeconfig from `.status.value`.
- The GitLab CI example used `curlimages/curl:latest`, but the script also required `jq` and `kubectl`. It was corrected to install the required tools explicitly before deployment. The GitHub Actions example was likewise updated to install the tools it uses.
- The cleanup section claimed to remove evicted pods, expired resources, and jobs older than 24 hours, but the code only deleted completed jobs and used invalid Kubernetes resource paths. The prose was corrected to match the implemented behavior, and the code was updated to use the official `batch/v1` jobs endpoints.
- The shared shell helpers disabled TLS verification by default with `curl -k`. That was removed so the examples align with Rancher’s current CA-validated access patterns.

## Review Notes
- The post now mixes Rancher’s current Kubernetes-style APIs for user, binding, and kubeconfig workflows with the still-documented previous `/v3/clusters` API for cluster listing and state polling. That is technically valid, but future revisions could standardize on one API style for consistency.
- Kubernetes recommends using a `kubectl` version within one minor version of the target cluster. The CI examples install the latest stable binary for brevity, so production pipelines should pin a compatible client version.
