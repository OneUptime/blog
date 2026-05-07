# Validation Summary: How to Use RKE Templates for Consistent Cluster Provisioning

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager
- RKE / RKE1
- Kubernetes
- Rancher RKE templates
- Rancher v3 API
- Docker-based Rancher node registration

## Sources Consulted
- Rancher: About RKE1 Templates — https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates
- Rancher: Creating and Revising RKE Templates — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/manage-rke1-templates
- Rancher: Applying Templates — https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/apply-templates
- Rancher: Access and Sharing — https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/access-or-share-templates
- Rancher: RKE Cluster Configuration Reference — https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- Rancher: RKE Hardening Guides — https://ranchermanager.docs.rancher.com/v2.10/reference-guides/rancher-security/hardening-guides/rke1-hardening-guide
- RKE1: Default Kubernetes Services — https://rke.docs.rancher.com/config-options/services
- RKE1: Authorization — https://rke.docs.rancher.com/config-options/authorization
- RKE1: Recurring Snapshots — https://rke.docs.rancher.com/etcd-snapshots/recurring-snapshots
- RKE1: Audit Log — https://rke.docs.rancher.com/config-options/audit-log
- RKE1: Rate Limiting — https://rke.docs.rancher.com/config-options/rate-limiting
- RKE1: Encrypting Secret Data at Rest — https://rke.docs.rancher.com/config-options/secrets-encryption
- RKE1: Configuring Pod Security Admission (PSA) — https://rke.docs.rancher.com/config-options/services/pod-security-admission

## Issues Found
- The post originally treated RKE templates as broadly current. I scoped it to legacy RKE1 environments and corrected the prerequisite range because RKE1 reached end of life on July 31, 2025, and Rancher 2.12.0 and later no longer support downstream RKE1 clusters.
- The template enforcement model was described as a lock icon workflow. I corrected this to Rancher's documented **Allow User Override** model, which is how template owners control whether users can change settings.
- The RKE YAML examples were structured incorrectly for Rancher templates. I nested configuration under `rancher_kubernetes_engine_config` and moved `authorization.mode` out of `services.kube-api`, matching the documented Rancher/RKE config layout.
- The Canal network option and etcd snapshot S3 field names were inconsistent with the official Rancher/RKE examples. I corrected the examples to use Rancher-compatible template YAML and `s3backupconfig`.
- The post referenced Pod Security Policies while also using Kubernetes 1.28/1.29-era examples. I replaced that guidance with Pod Security Admission for Kubernetes v1.25+ and added Rancher's PSA template setting.
- The template revision workflow used unverified API details and an `Add Revision` flow that does not match the documented UI. I corrected the workflow to use **Edit** / **New Revision from Default** and replaced the API example with a version-safe note to use Rancher's `/v3` API browser or captured UI request.
- The cluster creation flow was inaccurate about where templates are selected. I updated it to Rancher's documented **Use an existing RKE template and revision** option under **Cluster Options**.
- The node registration example hard-coded a Rancher agent image version and implied a static command. I changed it to a version-matched placeholder and clarified that Rancher generates the exact registration command.
- The export/import section described a cross-installation workflow that is not documented in the official RKE template docs. I replaced it with the supported in-product sharing workflow for templates within the same Rancher installation.

## Review Notes
- The post is now technically correct for legacy RKE1 environments only.
- For new deployments, Rancher's current cluster template guidance is different and is centered on newer provisioning models such as RKE2 and Helm-based cluster templates.
- The Kubernetes version in the main template example is intentionally left as a placeholder because supported RKE1 versions depend on the Rancher version and metadata available in that environment.
