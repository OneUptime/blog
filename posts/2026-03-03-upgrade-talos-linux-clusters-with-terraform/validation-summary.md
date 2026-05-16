# Validation Summary: How to Upgrade Talos Linux Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Terraform
- Sidero Labs Talos Terraform provider
- Kubernetes
- AWS EC2 AMIs
- talosctl

## Sources Consulted
- Sidero Labs Talos v1.12 upgrade documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Sidero Labs Talos v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos v1.12 support matrix: https://docs.siderolabs.com/talos/v1.12/getting-started/support-matrix
- Sidero Labs Talos v1.12 AWS documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/cloud-platforms/aws
- Sidero Labs Talos v1.12 boot assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Sidero Labs Talos Terraform provider documentation for `talos_machine_configuration`: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/data-sources/machine_configuration
- Sidero Labs Talos Terraform provider documentation for `talos_machine_configuration_apply`: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/resources/machine_configuration_apply
- Sidero Labs Talos Terraform provider documentation for `talos_machine_secrets`: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/resources/machine_secrets
- HashiCorp Terraform `depends_on` documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on

## Issues Found
- The examples used Talos `v1.8.0` and Kubernetes `1.30.0`, which were outdated for the current Talos v1.12 documentation. Updated the examples to Talos `v1.12.1` and Kubernetes `1.35.0`.
- The post implied that `talos_version` in the Terraform provider upgrades the installed OS. Clarified that it controls the version contract used for generated secrets and machine configuration, while the installer image controls install or upgrade target OS version.
- The Terraform examples attempted to serialize `count` instances with `depends_on = [resource[count.index - 1]]`, which is not valid Terraform dependency modeling and fails for index `0`. Removed the invalid self-references and added explicit `terraform apply -parallelism=1` guidance for one-node-at-a-time applies.
- The `talosctl upgrade` examples used `--preserve`, which is not present in the current Talos v1.12 CLI. Removed it and used current `--wait` and `--timeout` options.
- The AWS AMI example relied on a guessed AMI name lookup pattern. Replaced it with a `talos_ami_id` variable sourced from the official release `cloud-images.json` file, matching Sidero Labs AWS documentation.
- The failure-handling section said failed upgrades automatically roll back on reboot. Narrowed this to failed boots after an upgrade and added `talosctl rollback` as the manual rollback command.

## Review Notes
The post is technically relevant and reviewable. For production use, readers should also consult the specific Talos release notes for every intermediate minor version because Sidero Labs recommends upgrading through the latest patch release of each intermediate minor version.
