# Validation Summary: How to Use Terraform Rancher2 Provider

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform HCL
- Rancher Manager / Rancher v2
- Rancher2 Terraform provider
- GitHub Actions

## Sources Consulted
- Rancher2 provider overview: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/index.md
- Rancher2 provider compatibility matrix: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/compatibility-matrix.md
- `rancher2_bootstrap` resource docs: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/bootstrap.md
- `rancher2_cluster_v2` resource docs: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/cluster_v2.md
- `rancher2_machine_config_v2` resource docs: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/machine_config_v2.md
- `rancher2_cloud_credential` resource docs: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/cloud_credential.md
- `rancher2_node_template` resource docs: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/node_template.md
- `rancher2_project` resource docs: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/project.md
- `rancher2_namespace` resource docs: https://github.com/rancher/terraform-provider-rancher2/blob/main/docs/resources/namespace.md
- `rancher2_cluster`, `rancher2_project`, `rancher2_namespace`, `rancher2_catalog_v2`, and `rancher2_cloud_credential` data source docs in the official Rancher provider repository: https://github.com/rancher/terraform-provider-rancher2/tree/main/docs/data-sources
- Terraform import overview: https://developer.hashicorp.com/terraform/cli/import
- Terraform import configuration generation: https://developer.hashicorp.com/terraform/language/import/generating-configuration
- `terraform show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- `terraform state show` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/show
- Terraform workspace guidance: https://developer.hashicorp.com/terraform/cli/workspaces and https://developer.hashicorp.com/terraform/language/state/workspaces

## Issues Found
- The post treated Rancher `2.7+` as a generic prerequisite without noting that Rancher publishes recommended `rancher2` provider major versions per Rancher minor release. I corrected the prerequisite and introduction to reflect the official compatibility matrix.
- The authentication section mislabeled `access_key` / `secret_key` as username and password. I corrected the description to match the provider schema.
- The bootstrap example used `telemetry`, which is not a valid `rancher2_bootstrap` argument, and it omitted `initial_password`, which the official docs call out for Rancher `2.6+` installs that use a generated or pre-set bootstrap password. I removed the invalid field and added `initial_password`.
- The import examples used the wrong ID format for `rancher2_cluster_v2` and `rancher2_namespace`. I replaced them with the documented formats and removed the incorrect claim that `terraform show -json` generates Terraform configuration.
- The advanced module example would not work as written. It referenced undefined `rancher2_machine_config_v2` resources, used `cloud_credential_name` where the cluster example needs `cloud_credential_secret_name`, used an invalid unquoted HCL map key (`managed-by`), hardcoded a Kubernetes version that is not valid across all supported Rancher releases, and placed both production and staging modules in the same environment file. I fixed those issues while preserving the original structure and intent.
- The environment examples referenced cloud credential resources across root-module boundaries. I changed them to use the official `rancher2_cloud_credential` data source lookup inside each environment example so the examples are self-consistent.
- The state/workspace section used CLI workspaces for environment isolation even though the post already modeled separate root modules per environment. HashiCorp explicitly recommends separate configurations/backends for that case. I replaced the commands with per-environment state handling and corrected the `terraform state show` address to a real module resource address.
- The CI example exported `TF_VAR_rancher_url` and `TF_VAR_rancher_token`, which do not automatically configure the Rancher provider as shown earlier in the article, and it did not pass the AWS credential variables in the way the Step 5 HCL expected. I updated the workflow to use the provider-supported `RANCHER_URL` / `RANCHER_TOKEN_KEY` environment variables and matching `TF_VAR_aws_access_key` / `TF_VAR_aws_secret_key` variables.
- The node template example used a fixed AMI ID that is brittle over time and described node templates as if they directly mapped to the `cluster_v2` machine-pool flow. I replaced the AMI with a placeholder and clarified that the snippet is for Rancher node-driver usage.

## Review Notes
- `rancher2_node_template` remains documented and valid, but newer downstream cluster provisioning examples in the provider docs center on `rancher2_cluster_v2` with `rancher2_machine_config_v2`.
- The post now uses placeholders such as `<supported-rke2-version>` and `<AMI_ID>` where hardcoded values would otherwise be version- or cloud-specific. Readers still need to choose values supported by their Rancher release and cloud environment.
- I validated the post against official documentation and provider source docs, but I did not execute the Terraform examples locally because the Terraform CLI is not installed in this workspace.
