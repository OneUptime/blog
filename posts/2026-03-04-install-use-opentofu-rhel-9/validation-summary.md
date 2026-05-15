# Validation Summary: How to Install and Use OpenTofu on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- RHEL / RPM-based Linux
- OpenTofu CLI
- OpenTofu HCL configuration
- OpenTofu provider requirements
- HashiCorp local provider
- dmacvicar/libvirt provider
- Shell aliases

## Sources Consulted
- OpenTofu RPM installation documentation: https://opentofu.org/docs/intro/install/rpm/
- OpenTofu migration documentation: https://opentofu.org/docs/intro/migration/
- OpenTofu settings and `terraform` block documentation: https://opentofu.org/docs/language/settings/
- OpenTofu CLI `init` documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- HashiCorp local provider `local_file` resource documentation: https://github.com/hashicorp/terraform-provider-local/blob/main/docs/resources/file.md
- dmacvicar/libvirt provider README and current provider guidance: https://github.com/dmacvicar/terraform-provider-libvirt
- dmacvicar/libvirt provider `libvirt_volume` resource documentation: https://github.com/dmacvicar/terraform-provider-libvirt/blob/main/docs/resources/volume.md
- dmacvicar/libvirt provider `libvirt_domain` resource documentation: https://github.com/dmacvicar/terraform-provider-libvirt/blob/main/docs/resources/domain.md
- Terraform Registry provider version API for dmacvicar/libvirt: https://registry.terraform.io/v1/providers/dmacvicar/libvirt/versions

## Issues Found
- The migration section stated that existing Terraform files work as-is and implied the state file format is simply compatible. OpenTofu's migration guidance says most Terraform code works without modification and recommends initializing, verifying, and applying after review. Updated the wording to be less absolute and added `tofu apply` after the verification step.
- The libvirt example pinned `dmacvicar/libvirt` to `~> 0.7` and used legacy provider syntax such as `source`, top-level `format`, `disk`, and `network_interface`. The current libvirt provider is `0.9.x` and uses the newer XML-shaped schema. Updated the version constraint to `~> 0.9` and changed the volume and domain examples to current `target`, `create.content.url`, `devices.disks`, and `devices.interfaces` syntax.
- The closing sentence said existing HCL files, providers, and modules work without modification. Updated it to "Most existing..." to match OpenTofu's migration documentation.

## Review Notes
- The OpenTofu RPM repository and installer-script commands match the official OpenTofu RPM installation documentation closely. The official docs also include an `opentofu-source` repository entry, but it is not required for installing the `tofu` package.
- The sample `local_file` configuration uses the documented `terraform` block, `required_providers`, `content`, and `filename` arguments.
- The alias section is technically valid, though aliasing `terraform` to `tofu` can be surprising on machines where both CLIs are intentionally installed.
