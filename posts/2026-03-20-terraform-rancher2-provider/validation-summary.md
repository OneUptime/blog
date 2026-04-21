# Validation Summary: How to Use Terraform Rancher2 Provider - Rancher2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Terraform
- Rancher2 Terraform provider
- RKE2 and K3s cluster provisioning
- Rancher catalogs and Helm charts
- cert-manager
- Rancher registry credentials

## Sources Consulted
- Rancher2 provider documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/index.md
- `rancher2_cluster_v2` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/cluster_v2.md
- `rancher2_cluster` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/cluster.md
- `rancher2_machine_config_v2` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/machine_config_v2.md
- `rancher2_cloud_credential` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/cloud_credential.md
- `rancher2_catalog_v2` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/catalog_v2.md
- `rancher2_app_v2` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/app_v2.md
- `rancher2_project` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/project.md
- `rancher2_registry` resource documentation: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/registry.md
- SUSE Rancher support matrix: https://www.suse.com/suse-rancher/support-matrix
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- Jetstack Helm chart index: https://charts.jetstack.io/index.yaml
- Terraform output block documentation: https://developer.hashicorp.com/terraform/language/block/output

## Issues Found
- The post claimed the provider exposes the full Rancher API and covers the complete management plane. The provider documentation says it interacts with resources supported by Rancher v2, so the wording was narrowed to "many" and "much of" the Rancher management plane.
- The resources overview treated RKE/RKE1 as a current provisioning target. Rancher documentation notes that RKE1 is no longer supported by Rancher 2.12 and later, so the overview now calls out RKE1 only for Rancher versions that still support it.
- The RKE2 example called `rancher2_machine_config_v2` a node template. It is a machine config v2 resource, so the comment was corrected.
- The AWS machine config omitted the required `zone` argument for `amazonec2_config`. Added `zone = "a"` to match the provider schema.
- The RKE2 cluster used `rancher2_cloud_credential.aws.name` for `cloud_credential_secret_name`. Provider examples use the cloud credential `id`, so the root cluster and machine pool references were changed to `rancher2_cloud_credential.aws.id`.
- The fixed RKE2 version `v1.28.8+rke2r1` is stale for current Rancher support ranges. Replaced it with a placeholder that tells readers to use an RKE2 version supported by their Rancher version.
- The cert-manager app example used `repo_name = "rancher-stable"` and chart version `1.14.4`. Current cert-manager Helm docs use the Jetstack chart repository and chart versions with a leading `v`; added a `rancher2_catalog_v2` resource for `https://charts.jetstack.io`, changed the app to reference that catalog, and updated the chart to `v1.20.2`.
- The cert-manager CRD value used the older `installCRDs` key. Current cert-manager chart values use `crds.enabled`, so the `yamlencode` values were updated.
- The registry example referenced `rancher2_project.myapp.id` without defining the project. Added a minimal `rancher2_project` resource so the example is internally coherent.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were checked manually against the official provider schemas and current cert-manager/Terraform documentation.
