# Validation Summary: How to Set Up Rancher for Education

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- Kubernetes RBAC
- `ResourceQuota`
- `LimitRange`
- Horizontal Pod Autoscaler
- OpenLDAP / LDAP authentication
- JupyterHub
- Helm
- code-server
- NVIDIA GPU scheduling
- Longhorn

## Sources Consulted
- Rancher Projects and Namespaces: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher Project Resource Quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher OpenLDAP configuration: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/configure-openldap
- Rancher Helm Charts and Apps: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/helm-charts-in-rancher
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes GPU scheduling: https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Zero to JupyterHub installation guide: https://z2jh.jupyter.org/en/stable/jupyterhub/installation.html
- Zero to JupyterHub user resource customization: https://z2jh.jupyter.org/en/latest/jupyterhub/customizing/user-resources.html
- Zero to JupyterHub configuration reference: https://z2jh.jupyter.org/en/4.2.0/resources/reference.html
- code-server Helm chart values: https://github.com/coder/code-server/blob/main/ci/helm-chart/values.yaml
- code-server Helm chart deployment template: https://github.com/coder/code-server/blob/main/ci/helm-chart/templates/deployment.yaml
- code-server Helm chart secret template: https://github.com/coder/code-server/blob/main/ci/helm-chart/templates/secrets.yaml

## Issues Found
- The Rancher UI paths in Steps 1 and 7 used outdated navigation labels. I updated them to the current Rancher UI paths from the official docs so readers can actually find the relevant screens.
- The student namespace automation script created plain Kubernetes namespaces without assigning them to a Rancher project. I added the `field.cattle.io/projectId` annotation at namespace creation time because Rancher project quotas and membership inheritance only apply when the namespace belongs to the project.
- The RBAC snippet claimed to grant "full access" while binding the built-in `edit` ClusterRole. I corrected the description to "edit access" because Kubernetes documents `edit` as broad namespaced write access, not full namespace administration.
- The JupyterHub example used an `apps/v1` `Deployment` that was not a working JupyterHub installation and omitted the required `selector`. I replaced it with the official Zero to JupyterHub Helm-based install flow and a valid `config.yaml` example for per-user CPU, memory, and storage settings.
- The development-environment example used a non-existent `codeServer:` values structure. I replaced it with the official `code-server` Helm chart values shape, including documented persistence settings and extension installation through `extraInitContainers`.
- Step 5 referred to Rancher's legacy "catalog" terminology. I updated it to Rancher Apps, which is the current name in Rancher documentation.
- Step 6 described the provided example as cluster autoscaling, but the manifest was a Horizontal Pod Autoscaler. I corrected the wording and noted the `metrics.k8s.io` prerequisite.
- The GPU quota example used `limits.nvidia.com/gpu`, which Kubernetes quota docs do not support for extended resources. I removed that field and added the required device-plugin prerequisite for `nvidia.com/gpu` scheduling.

## Review Notes
- The JupyterHub section now reflects the supported installation path, but JupyterHub authentication itself is still deployment-specific and is not configured in this post.
- In Step 3, the `subjects[].name` value must match the identity actually presented to the downstream Kubernetes cluster; in some Rancher-authenticated setups this may not be the user's email address.
