# Validation Summary: How to Configure the Linode Provider in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Linode Terraform/OpenTofu provider (`linode/linode`)
- HashiCorp Configuration Language (HCL)
- Linode Compute Instances
- Linode Kubernetes Engine (LKE)

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- Linode provider index: https://github.com/linode/terraform-provider-linode/blob/dev/docs/index.md
- Linode instance resource documentation: https://github.com/linode/terraform-provider-linode/blob/dev/docs/resources/instance.md
- Linode LKE cluster resource documentation: https://github.com/linode/terraform-provider-linode/blob/dev/docs/resources/lke_cluster.md
- Linode guide for provisioning with Terraform: https://www.linode.com/docs/applications/configuration-management/how-to-build-your-infrastructure-using-terraform-and-linode/

## Issues Found
- The post used a placeholder provider (`hashicorp/example`) and `provider "example"` block, which would not configure Linode at all. I replaced these with the real Linode provider source `linode/linode` and a valid `provider "linode"` configuration.
- The authentication section used nonexistent environment variables (`PROVIDER_API_KEY`, `PROVIDER_TOKEN`, `PROVIDER_ORG`). I changed this to `LINODE_TOKEN`, which the official Linode provider supports directly.
- The variable examples were generic and did not match the resources being created. I replaced them with variables that the Linode examples actually use: `environment`, `region`, `root_pass`, `ssh_public_key`, and `k8s_version`.
- The resource examples (`example_project`, `example_team`, `example_alert`, `example_backup_policy`) do not exist in the Linode provider. I replaced them with real `linode_instance` and `linode_lke_cluster` resources, plus supported advanced settings such as `backups_enabled`, `alerts`, and `control_plane`.
- The advanced settings snippet was previously based on unsupported resource types. I rewrote it as complete, valid HCL resource examples using arguments documented by the Linode provider.
- The outputs referenced nonexistent project resources. I updated them to valid outputs from the Linode instance and LKE cluster resources.
- The rate-limiting advice recommended `depends_on` for serialization. The official Linode provider documentation instead recommends reducing concurrency, so I changed the guidance to `tofu plan -parallelism=1` or `tofu apply -parallelism=1`.
- The conclusion claimed the provider managed a generic service rather than the concrete Linode resources shown in the article. I corrected the wording to accurately reflect compute instances and Kubernetes clusters.

## Review Notes
- The example keeps the provider version pinned to `~> 3.0`, which is a valid major-version constraint for the current Linode provider line and is more reproducible than leaving the version unspecified.
- The example `k8s_version` default of `1.32` matches the current Linode LKE resource documentation reviewed on 2026-04-29, but Kubernetes version examples should be revisited periodically because supported LKE versions change over time.
- The local workspace did not have the `tofu` CLI installed, so command verification was performed against the official OpenTofu CLI documentation rather than local `tofu --help` output.
