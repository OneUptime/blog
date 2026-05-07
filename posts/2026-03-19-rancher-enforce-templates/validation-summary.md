# Validation Summary: How to Enforce Cluster Templates with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE1 templates
- Kubernetes
- Rancher v3 API
- Terraform Rancher2 provider
- Bash
- `jq`

## Sources Consulted
- Rancher docs: About RKE1 Templates - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates
- Rancher docs: Enforcing Templates - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/enforce-templates
- Rancher docs: Access and Sharing - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/access-or-share-templates
- Rancher docs: Applying Templates - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/about-rke1-templates/apply-templates
- Rancher docs: Cluster Templates - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/manage-cluster-templates
- Rancher docs: RKE1 Example YAML - https://ranchermanager.docs.rancher.com/reference-guides/rke1-template-example-yaml
- Rancher docs: API Reference - https://ranchermanager.docs.rancher.com/v2.10/api/api-reference
- Rancher Terraform provider docs: `rancher2_setting` - https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/setting.md
- Rancher Terraform provider docs: `rancher2_cluster` - https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/cluster.md
- Rancher Terraform provider source registration - https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/rancher2/provider.go
- Rancher source: cluster template types - https://raw.githubusercontent.com/rancher/rancher/master/pkg/apis/management.cattle.io/v3/cluster_template_types.go
- Rancher source: cluster types - https://raw.githubusercontent.com/rancher/rancher/master/pkg/apis/management.cattle.io/v3/cluster_types.go
- Rancher source: settings - https://raw.githubusercontent.com/rancher/rancher/master/pkg/settings/setting.go

## Issues Found
- The post conflated Rancher's modern cluster-template feature with legacy RKE1 template enforcement. I retitled and retagged the post to use `RKE templates`, because Rancher documents that cluster templates do not provide configuration enforcement while RKE1 templates do.
- The prerequisites were too broad. I changed the supported range to Rancher v2.6 through v2.11 and added the RKE1 end-of-life / Rancher 2.12+ support caveat.
- The locked-settings YAML snippet used the wrong structure and field placement. I moved `authorization.mode` under `rancher_kubernetes_engine_config`, changed the service key to `kube_api`, and aligned the example with Rancher's documented RKE template YAML shape.
- The template-sharing section used incorrect access guidance and an invalid API example. I changed the UI guidance to Rancher's documented `User` access type and removed the incorrect `POST /v3/clusterTemplateRevisions` example.
- The testing section included an unsafe API example that could fail for reasons unrelated to template enforcement. I removed that example and kept the documented UI verification flow.
- The exceptions section incorrectly stated that a `cluster-template-owner` role can bypass enforcement. Rancher docs say only administrators are exempt, so I corrected the section accordingly.
- The compliance script would have flagged non-RKE or imported clusters as non-compliant. I narrowed the filter to Rancher-provisioned RKE clusters by checking `driver == "rancherKubernetesEngine"`.
- The Terraform section used a `rancher2_cluster_template` resource example that is not registered in the current provider source. I reduced the example to the verified `rancher2_setting` resource for `cluster-template-enforcement`.

## Review Notes
- This post is now technically correct for legacy RKE1-based Rancher environments only. Rancher 2.12 and later no longer support provisioning or managing downstream RKE1 clusters.
- Rancher's current cluster-template feature is a separate Helm/Fleet-based workflow and does not enforce configuration after provisioning.
