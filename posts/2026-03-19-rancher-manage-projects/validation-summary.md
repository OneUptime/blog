# Validation Summary: How to Create and Manage Projects in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Rancher `management.cattle.io/v3` Project resources
- Rancher v3 API
- `kubectl`
- Terraform Rancher2 provider

## Sources Consulted
- Rancher project workflow docs: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher projects and namespaces docs: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher project resource quota docs: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- How resource quotas work in Rancher projects: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher Pod Security Standards and Pod Security Admission docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/pod-security-standards
- Rancher PSA configuration template docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/psa-config-templates
- Rancher previous v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API keys docs: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher API reference: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Terraform Rancher2 provider `rancher2_project` docs: https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/project.md
- Terraform Rancher2 provider `rancher2_namespace` docs: https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/namespace.md

## Issues Found
- The `kubectl` project creation example used `kubectl apply` together with `metadata.generateName`. Rancher documents that `generateName` must be used with `kubectl create`, so the command was corrected.
- The post did not state that Rancher `Project` resources are created on the Rancher management cluster. A short clarification was added so the `kubectl` example is runnable in the correct context.
- The UI section implied PSA labels are configured per project. Rancher documents PSA as a cluster-level setting, so that line was corrected to keep PSPs as the project-level option only where PSP is still supported.
- The namespace example manually set a `field.cattle.io/projectId` label. Rancher’s documented namespace assignment method is the `field.cattle.io/projectId` annotation, so the extra label was removed and the downstream-cluster context was clarified.
- The project quota example included `usedLimit`, which is usage data rather than a value users configure when editing a project quota. It was removed from the configuration snippet.
- The `kubectl` listing example relied on a `field.cattle.io/namespacesCount` annotation path that is not the documented way to list Rancher projects from Kubernetes. It was replaced with the documented `kubectl --namespace <cluster-id> get projects` form.
- The deletion section incorrectly said namespaces move to the `Default` project after a project is deleted. Rancher documents that they remain on the cluster and appear under `Not in a Project`, so that behavior was corrected.

## Review Notes
- Rancher’s legacy `/v3` API is still available, but Rancher documents it separately from the newer Rancher Kubernetes API (RK-API). Users on newer Rancher versions should be aware that legacy v3 API tokens are being phased out starting with Rancher v2.14.0.
- Project network isolation depends on a network provider that enforces Kubernetes `NetworkPolicy`. For imported clusters, Rancher documents that network policy must already be enabled before project network isolation can be used.
- Pod Security Policies are only relevant on clusters and Kubernetes versions that still support PSPs. Modern Rancher environments generally use Pod Security Admission at the cluster level instead.
