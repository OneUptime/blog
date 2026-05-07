# Validation Summary: How to Create Cluster Templates in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Kubernetes Engine (RKE1)
- Kubernetes
- RKE templates
- Rancher v3 API
- `curl`
- `jq`

## Sources Consulted
- SUSE Rancher Manager: About RKE1 Templates: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates
- SUSE Rancher Manager: Creating and Revising RKE Templates: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/manage-rke1-templates
- SUSE Rancher Manager: Applying Templates: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/apply-templates
- SUSE Rancher Manager: Access and Sharing: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/access-or-share-templates
- SUSE Rancher Manager: Overriding Template Settings: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/override-template-settings
- SUSE Rancher Manager: Cluster Templates: https://documentation.suse.com/cloudnative/rancher-manager/v2.9/en/cluster-admin/manage-clusters/cluster-templates.html
- Rancher: Previous v3 Rancher API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- RKE1: Authorization: https://rke.docs.rancher.com/config-options/authorization
- RKE1: Network Plug-ins: https://rke.docs.rancher.com/config-options/add-ons/network-plugins
- RKE1: Audit Log: https://rke.docs.rancher.com/config-options/audit-log
- RKE1: Rate Limiting: https://rke.docs.rancher.com/config-options/rate-limiting
- RKE1: Recurring Snapshots: https://rke.docs.rancher.com/etcd-snapshots/recurring-snapshots
- SUSE Rancher Manager: RKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.10/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration

## Issues Found
- The post used "cluster templates" terminology for a workflow that is actually Rancher's legacy RKE1 `RKE templates` feature. I corrected the title, description, tags, and body so the post matches the documented feature and no longer conflates it with Rancher's separate Helm-based cluster templates.
- The prerequisites were outdated and inaccurate. I changed them to require an RKE1-compatible Rancher release, added the RKE1 end-of-life date of July 31, 2025 plus the Rancher v2.12 support cutoff, and replaced "admin or cluster-owner" with the documented `Create RKE Templates` permission and template ownership requirements.
- The feature overview incorrectly claimed the templates define node pool configuration. I corrected this to reflect Rancher documentation: RKE templates standardize Kubernetes and Rancher settings, while node templates and node pool settings are configured separately.
- The UI workflow details were inaccurate in several places. I updated the navigation to `Cluster Management > RKE1 Configuration > RKE Templates`, changed sharing from `Member` to the documented `User` access type, replaced the non-existent `Required`/`Locked` model with Rancher's `Allow User Override` behavior, and corrected cluster creation to use `Use an existing RKE template and revision`.
- The Kubernetes version example used a wildcard `kubernetes_version` value that would not be a valid exact RKE version string. I removed the invalid snippet and clarified that Rancher stores an exact version selected from the UI.
- Several YAML examples were invalid or misleading. I removed unsupported Calico fields and values, fixed authorization to the documented top-level `authorization.mode`, removed invalid or obsolete etcd snapshot fields plus the unsupported `backup_config.enabled`, and removed the unverified kubelet `streaming-connection-idle-timeout` example.
- The networking section was missing current lifecycle caveats. I added the documented note that Weave is deprecated for RKE with Kubernetes v1.27 and later and removed in v1.30, and clarified that `calico_cloud_provider` only supports `aws` or `gce`.
- The API section used an undocumented create example and a bearer-token pattern that did not match Rancher's documented v3 API guidance. I replaced it with a documented v3 API discovery example and guidance to inspect schemas and UI-generated requests before automating create or update calls.

## Review Notes
- The corrected post is technically accurate as a legacy RKE1 guide. It should not be read as guidance for Rancher's newer cluster templates feature, which is Helm chart-based and does not enforce configuration in the same way.
- Rancher's documentation for creating a template contains some navigation inconsistencies across pages, but the corrected post follows the path consistently documented for template management under `RKE Templates`.
