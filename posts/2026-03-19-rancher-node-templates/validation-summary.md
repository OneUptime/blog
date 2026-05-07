# Validation Summary: How to Configure Node Templates in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher RKE1 node templates
- Rancher cloud credentials
- Amazon EC2
- Microsoft Azure
- VMware vSphere
- Kubernetes labels and taints
- Docker daemon configuration
- Rancher v3 API

## Sources Consulted
- Rancher docs: Node Template Configuration: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/node-template-configuration
- Rancher docs: Managing Node Templates: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/manage-node-templates
- Rancher docs: Managing Cloud Credentials: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/manage-cloud-credentials
- Rancher docs versions page: https://ranchermanager.docs.rancher.com/versions
- Rancher archived v2.6 docs source: Managing Node Templates: https://github.com/rancher/rancher-docs/blob/main/archived_docs/en/version-2.6/reference-guides/user-settings/manage-node-templates.md
- Rancher archived v2.6 docs source: Managing Cloud Credentials: https://github.com/rancher/rancher-docs/blob/main/archived_docs/en/version-2.6/reference-guides/user-settings/manage-cloud-credentials.md
- Rancher archived v2.6 docs source: EC2 Node Template Configuration: https://github.com/rancher/rancher-docs/blob/main/archived_docs/en/version-2.6/reference-guides/cluster-configuration/downstream-cluster-configuration/node-template-configuration/amazon-ec2.md
- Rancher archived v2.6 docs source: Azure Node Template Configuration: https://github.com/rancher/rancher-docs/blob/main/archived_docs/en/version-2.6/reference-guides/cluster-configuration/downstream-cluster-configuration/node-template-configuration/azure.md
- Rancher archived v2.6 docs source: VMware vSphere Node Template Configuration: https://github.com/rancher/rancher-docs/blob/main/archived_docs/en/version-2.6/reference-guides/cluster-configuration/downstream-cluster-configuration/node-template-configuration/vsphere.md
- Rancher archived v2.6 docs source: Launching Kubernetes on New Nodes in an Infrastructure Provider: https://github.com/rancher/rancher-docs/blob/main/archived_docs/en/version-2.6/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/use-new-nodes-in-an-infra-provider.md
- Rancher source: node template and node pool schema fields: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/machine_types.go
- Rancher source: generated node pool API fields: https://github.com/rancher/rancher/blob/main/pkg/client/generated/management/v3/zz_generated_node_pool.go
- Docker docs: `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker docs: Configure logging drivers: https://docs.docker.com/engine/logging/configure/
- Kubernetes docs: Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes docs: Node Labels Populated By The Kubelet: https://kubernetes.io/docs/reference/node/node-labels
- Kubernetes docs: Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The post said node templates applied to "Rancher v2.6 or later." This was outdated. I changed the prerequisite and surrounding wording to scope the guide to Rancher v2.6 through v2.11, because current Rancher documentation states Rancher v2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters with node templates.
- The navigation path to node templates was wrong. I changed it from the user-avatar dropdown flow to the documented path: `☰ > Cluster Management > RKE1 Configuration > Node Templates`.
- The vSphere example used `Disk Size: 80 GB`, but Rancher's vSphere node template reference documents disk size in MB. I changed the example to `81920 MB` and aligned the field label to `Cloud Init`.
- The label example used Kubernetes-reserved and kubelet-populated label keys. I replaced those with custom user-defined labels to avoid recommending manual use of reserved `kubernetes.io` / `node.kubernetes.io` keys.
- The Docker section referred to setting a `Docker Version` directly. Rancher documentation for node templates documents `Docker Install URL` / `Docker Engine Install URL` as the supported control. I updated the wording and example accordingly.
- The template permissions section incorrectly claimed templates could be shared via `Private` / `Public` access settings. Rancher documentation states node templates are bound to the creator's user profile and cannot be shared among non-admin users. I rewrote that section to match documented ownership and admin behavior.
- The cleanup section used an unsupported `useCount` field in the `v3/nodeTemplates` API example. I replaced it with a supported workflow: list node templates, then query `v3/nodePools` by `nodeTemplateId` before deleting a template.

## Review Notes
- Node templates are now a legacy/archived Rancher feature tied to downstream RKE1-era workflows. Rancher documentation states RKE1 reached end of life on July 31, 2025, and Rancher v2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters with node templates. The post is now accurate because it is explicitly scoped to releases that still support the feature.
