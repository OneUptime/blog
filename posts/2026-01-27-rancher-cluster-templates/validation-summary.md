# Validation Summary: How to Build Rancher Cluster Templates

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Rancher Manager RKE1 Cluster Templates
- Rancher Kubernetes Engine (RKE1)
- Kubernetes admission controllers, Pod Security Admission, ResourceQuota, and LimitRange
- Terraform Rancher2 provider
- GitHub Actions, yamllint, Checkov, and Trivy
- OneUptime monitoring

## Sources Consulted
- Rancher Manager docs: About RKE1 Templates - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates
- SUSE Rancher Manager docs: RKE Templates and Infrastructure - https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/rancher-admin/global-configuration/rke1-templates/infrastructure.html
- RKE1 docs: Configuring Pod Security Admission - https://rke.docs.rancher.com/config-options/services/pod-security-admission
- RKE1 docs: Default Kubernetes Services - https://rke.docs.rancher.com/config-options/services
- Terraform Rancher2 provider docs: rancher2_cluster_template - https://registry.terraform.io/providers/rancher/rancher2/latest/docs/resources/cluster_template
- Rancher Terraform provider source docs - https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/cluster_template.md
- Rancher RKE release v1.8.14 - https://github.com/rancher/rke/releases/tag/v1.8.14
- Kubernetes docs: PodSecurityPolicy - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes docs: Scheduling Policies - https://kubernetes.io/docs/reference/scheduling/policies/

## Issues Found
- The post presented RKE1 cluster templates as current without mentioning RKE1 EOL. Added a clear note that RKE1 reached EOL on July 31, 2025, Rancher 2.12.0 and later do not support downstream RKE1 provisioning/management, and new deployments should use RKE2 or K3s.
- The post described native template inheritance. Rancher RKE1 templates do not provide native inheritance between `ClusterTemplate` resources, so the section was changed to template composition using version-controlled base sources and generated environment-specific templates.
- Several examples used Kubernetes versions such as `v1.28.5-rancher1` and `v1.29.2-rancher1`. Updated examples to RKE 1.8 release-style versions such as `v1.30.14-rancher1-1`, `v1.31.14-rancher1-1`, and `v1.32.13-rancher1-3`, and noted Extended Life requirements for post-EOL RKE1 versions.
- The post used "LTS Kubernetes versions" terminology. Replaced this with "approved Kubernetes versions from the Rancher support matrix" because upstream Kubernetes does not define those versions as LTS in this context.
- The RKE API server example enabled `PodSecurityPolicy`, which was removed in Kubernetes v1.25. Replaced it with `PodSecurity`.
- The scheduler example used `policy-config-file`, which is not supported since Kubernetes v1.23. Replaced it with a supported scheduler extra argument.
- The security example used a full `PodSecurityConfiguration` object under `podSecurityConfiguration`. RKE1 supports `pod_security_configuration`/`podSecurityConfiguration` presets of `restricted` or `privileged`; changed the example to `restricted`.
- The resource quota example used invalid cluster template fields for Kubernetes v1.25+ examples, including `defaultPodSecurityPolicyTemplateId` and a cluster-level `clusterResourceQuota` block. Replaced it with valid Kubernetes `ResourceQuota` and `LimitRange` manifests delivered through RKE add-ons.
- The YAML examples placed `questions` under `clusterConfig`, used unsupported `enum`, `options`, `min`, and `max` fields, and used `accessType: member`. Moved questions to the template revision level, limited question types to `boolean`, `int`, and `string`, and changed member access to valid `owner`/`read-only` values.
- The production YAML example used a `locked: true` revision field that is not part of the documented Rancher template revision schema. Removed it and described limiting production customization through narrow questions and ownership.
- The Terraform examples used unsupported `member` access and unsupported `description` fields inside `questions`. Updated them to match the documented `rancher2_cluster_template` schema.

## Review Notes
- YAML code blocks were parsed locally with PyYAML after edits. Terraform/OpenTofu are not installed in this workspace, so Terraform formatting/provider validation could not be run locally.
