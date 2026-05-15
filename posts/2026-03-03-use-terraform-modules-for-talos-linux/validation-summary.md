# Validation Summary: How to Use Terraform Modules for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Terraform modules
- Sidero Labs Talos Terraform provider
- HashiCorp HTTP Terraform provider
- Talos Image Factory
- Terratest

## Sources Consulted
- Sidero Labs Talos Terraform provider documentation: https://registry.terraform.io/providers/siderolabs/talos/latest
- `talos_machine_secrets` resource documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/resources/machine_secrets
- `talos_machine_configuration` data source documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/data-sources/machine_configuration
- `talos_machine_configuration_apply` resource documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/resources/machine_configuration_apply
- `talos_machine_bootstrap` resource documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/resources/machine_bootstrap
- `talos_cluster_kubeconfig` data source documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/data-sources/cluster_kubeconfig
- `talos_client_configuration` data source documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/data-sources/client_configuration
- Talos Linux v1.12 support matrix: https://docs.siderolabs.com/talos/v1.12/getting-started/support-matrix
- Talos Linux Image Factory documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/image-factory
- Talos MachineConfig reference for `machine.nodeLabels` and install image fields: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- Terraform module source documentation: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform CLI `validate` command documentation: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform CLI `fmt` command documentation: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terratest quick start documentation: https://terratest.gruntwork.io/docs/getting-started/quick-start/

## Issues Found
- The Talos provider version was pinned to `~> 0.5.0`, which is outdated relative to the current provider documentation reviewed. Updated the module example to `~> 0.11.0`.
- The example Talos and Kubernetes defaults used older versions (`v1.7.0` and `v1.30.0`). Updated the examples to Talos `v1.12.6` and Kubernetes `v1.35.0`, which are aligned with the Talos v1.12 support matrix.
- The text said the module handled the entire deployment or created a complete cluster, but the shown Terraform config applies Talos machine configuration and bootstraps existing nodes rather than provisioning the underlying machines. Updated the wording to "configure and bootstrap" and "cluster configuration and bootstrap."
- The Image Factory sub-module used the `http` data source but did not declare the `hashicorp/http` provider. Added a `required_providers` block for `hashicorp/http` with version `~> 3.5`.

## Review Notes
The Talos provider resource and data source names, key arguments, and outputs used in the examples match the current provider documentation. The Image Factory schematic shape, POST endpoint, installer image URL pattern, and ISO URL pattern match the official Image Factory documentation. Terraform CLI commands and the Terratest example are structurally correct, but `terraform` is not installed in this workspace, so local `terraform validate` could not be executed.
