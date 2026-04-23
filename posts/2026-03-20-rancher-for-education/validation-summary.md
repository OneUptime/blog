# Validation Summary: How to Set Up Rancher for Education - For

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager projects, namespaces, RBAC, and external authentication
- Kubernetes ResourceQuota, LimitRange, NetworkPolicy, Jobs, and namespaces
- Helm
- JupyterHub / Zero to JupyterHub
- OAuthenticator / OpenID Connect
- Shibboleth SAML and Azure AD integration patterns
- NVIDIA GPU scheduling and device plugins

## Sources Consulted
- Rancher: Projects and Kubernetes Namespaces with Rancher - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher: How Resource Quotas Work in Rancher Projects - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher: Configuring Shibboleth (SAML) - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/configure-shibboleth-saml
- Rancher: Configure Azure AD - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config/configure-azure-ad
- Kubernetes: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes: Schedule GPUs - https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Helm: helm install - https://helm.sh/docs/v3/helm/helm_install
- Zero to JupyterHub: Authentication and authorization - https://z2jh.jupyter.org/en/4.0.0/administrator/authentication.html
- Zero to JupyterHub: Configuration Reference - https://z2jh.jupyter.org/en/4.2.0/resources/reference.html
- OAuthenticator: Generic provider setup - https://oauthenticator.readthedocs.io/en/latest/tutorials/provider-specific-setup/providers/generic.html
- OAuthenticator: GenericOAuthenticator reference - https://oauthenticator.readthedocs.io/en/latest/reference/api/gen/oauthenticator.generic.html
- Docker Hub: jupyter/datascience-notebook tags - https://hub.docker.com/r/jupyter/datascience-notebook/tags
- Docker Hub: pytorch/pytorch tags - https://hub.docker.com/r/pytorch/pytorch/tags

## Issues Found
- The JupyterHub values file used `singleuser.resources`, which is not the current Zero to JupyterHub chart schema. I changed it to `singleuser.memory.limit` and `singleuser.cpu.limit`, which are the documented keys.
- The JupyterHub example uses the Docker Stacks image `jupyter/datascience-notebook`. For Zero to JupyterHub, this image pattern should be paired with `singleuser.cmd: null`, so I added that setting to match the documented deployment pattern.
- The `GenericOAuthenticator` example was incomplete for an OIDC flow and was labeled as SAML even though the endpoints shown were OIDC endpoints. I added `JupyterHub.authenticator_class: generic-oauth`, a placeholder `client_secret`, `userdata_url`, `username_claim`, `login_service`, and scopes, and updated the comment to OIDC so the example matches the current JupyterHub and OAuthenticator docs.
- The Rancher authentication navigation path was outdated. I updated it to the current `Users & Authentication > Auth Provider` flow and replaced the Azure configuration notes with the current identifiers: `Redirect URI`, `Application Secret`, and `Tenant ID`.
- The semester namespace automation created a Kubernetes namespace but did not associate it with a Rancher Project. I changed it to create the namespace with the required `field.cattle.io/projectId` annotation so it is placed in the intended Rancher Project.
- The DNS egress example only allowed UDP port `53`. I added TCP port `53` because DNS fallback to TCP is valid and commonly needed.
- The introduction and conclusion slightly overstated what Rancher Projects do. I adjusted the wording so Projects are described as grouping namespaces and providing RBAC/resource quota control rather than acting as direct namespace-isolation primitives.

## Review Notes
- The post is technically correct after the fixes above, but `jupyter/datascience-notebook:latest` is less reproducible than using a pinned version tag or image digest.
- The network policy example assumes the cluster uses a CNI implementation that enforces Kubernetes `NetworkPolicy`.
- The JupyterHub `client_secret` should be sourced from Kubernetes Secret or Helm secret-management workflow instead of being committed as a literal value.
