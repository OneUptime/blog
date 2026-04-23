# Validation Summary: How to Use Terraform to Manage Rancher Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Terraform
- Rancher2 Terraform provider
- RKE2
- Kubernetes
- Helm / Rancher catalog apps
- AWS EC2 node-driver clusters
- Rancher RBAC

## Sources Consulted
- Rancher2 provider overview: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/index.md
- Rancher2 provider compatibility matrix: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/compatibility-matrix.md
- `rancher2_cluster_v2` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/cluster_v2.md
- `rancher2_machine_config_v2` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/machine_config_v2.md
- `rancher2_cloud_credential` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/cloud_credential.md
- `rancher2_project` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/project.md
- `rancher2_namespace` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/namespace.md
- `rancher2_user` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/user.md
- `rancher2_global_role_binding` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/global_role_binding.md
- `rancher2_project_role_template_binding` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/project_role_template_binding.md
- `rancher2_role_template` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/role_template.md
- `rancher2_app_v2` resource docs: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/main/docs/resources/app_v2.md
- Rancher charts index: https://charts.rancher.io/index.yaml
- Rancher monitoring chart guidance: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/helm-chart-options
- RKE2 networking and Cilium guidance: https://docs.rke2.io/networking/basic_network_options
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform S3 backend docs: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- The introduction overstated the provider as covering the full Rancher API. I changed that to the narrower, documented claim that it supports Rancher v2 resources.
- The provider example pinned `rancher/rancher2` to `~> 4.0`, which the official compatibility matrix ties to Rancher 2.8.x. I removed the stale hard pin and replaced it with explicit compatibility guidance.
- The cluster example used a hardcoded RKE2 version and an invalid `upgrade_strategy.drain_nodes` field. I replaced the version with a supported-version placeholder and switched the drain configuration to the documented `control_plane_drain_options` and `worker_drain_options` blocks.
- The Step 2 cluster was actually a custom cluster because it had no `machine_pools`, but the post did not say that. I added a note telling readers to register nodes before creating projects, namespaces, or apps, or to use the node-driver example instead.
- The AWS node-pool example referenced an undefined cloud credential, used `cloud_credential_secret_name = ...name` instead of the documented credential ID, omitted the control-plane `etcd_role`, duplicated the `production_cluster` resource name, and hardcoded a stale AMI/version. I corrected each of those points.
- The project example did not wait for a newly created cluster to become active. I added `wait_for_cluster = true` to make the single-apply flow match provider behavior more closely.
- The RBAC example omitted the documented `user-base` global role binding required for a newly created Rancher user to log in. I added that binding.
- The RBAC example referenced `var.devops_password` without defining it. I added the missing sensitive variable and updated the command examples to pass or export it.
- The custom project role was named `readonly-with-deploy` but did not permit `create` on deployments. I added `create` so the example matches its stated purpose.
- The App V2 section pinned stale chart versions and used `cert-manager` from `rancher-charts`, which is not present in the current Rancher charts index. I replaced it with `rancher-monitoring-crd` plus `rancher-monitoring`, which are current built-in Rancher catalog charts, and removed the stale chart version pins.

## Review Notes
- The post now correctly distinguishes between a custom cluster in Step 2 and an alternative AWS node-driver cluster in Step 3.
- Exact provider and chart versions still depend on the Rancher minor release in use. The tutorial now points readers to the compatibility relationship instead of hardcoding mismatched versions.
- Rancher monitoring storage values are consistent with current Rancher monitoring guidance, including the 50Gi storage example.
- Terraform CLI was not installed in the local review environment, so CLI flag validation relied on HashiCorp's official command references rather than local `terraform --help` output.
