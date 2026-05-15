# Validation Summary: How to Manage RHEL Virtual Machines with Terraform and Libvirt

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/QEMU virtualization
- libvirt
- Terraform
- dmacvicar/libvirt Terraform provider
- cloud-init
- HCL

## Sources Consulted
- Red Hat Enterprise Linux 9 virtualization documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/assembly_enabling-virtualization-in-rhel-9_configuring-and-managing-virtualization
- HashiCorp Terraform install documentation: https://developer.hashicorp.com/terraform/install
- Terraform template provider deprecation documentation: https://registry.terraform.io/providers/hashicorp/template/latest/docs
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- Terraform `pathexpand` function documentation: https://developer.hashicorp.com/terraform/language/functions/pathexpand
- dmacvicar/libvirt provider v0.8.3 `libvirt_pool` documentation: https://raw.githubusercontent.com/dmacvicar/terraform-provider-libvirt/v0.8.3/website/docs/r/pool.html.markdown
- dmacvicar/libvirt provider v0.8.3 `libvirt_volume` documentation: https://raw.githubusercontent.com/dmacvicar/terraform-provider-libvirt/v0.8.3/website/docs/r/volume.html.markdown
- dmacvicar/libvirt provider v0.8.3 `libvirt_domain` documentation: https://raw.githubusercontent.com/dmacvicar/terraform-provider-libvirt/v0.8.3/website/docs/r/domain.html.markdown
- dmacvicar/libvirt provider v0.8.3 `libvirt_cloudinit_disk` documentation: https://raw.githubusercontent.com/dmacvicar/terraform-provider-libvirt/v0.8.3/website/docs/r/cloudinit.html.markdown
- dmacvicar/libvirt provider migration notes for v0.9 schema changes: https://github.com/dmacvicar/terraform-provider-libvirt
- Red Hat Enterprise Linux 9 cloud-init documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_and_managing_cloud-init_for_rhel_9
- cloud-init networking config v2 documentation: https://docs.cloud-init.io/en/latest/reference/network-config-format-v2.html

## Issues Found
- The RHEL virtualization setup used `systemctl enable --now libvirtd` and `lsmod | grep kvm`. Red Hat's RHEL 9 documentation starts the modular libvirt virtualization sockets and verifies host readiness with `virt-host-validate`, so the commands were updated accordingly and `virt-viewer` was added to match the documented package set.
- The Terraform install commands used `dnf-plugins-core` and `dnf config-manager --add-repo` for RHEL. HashiCorp's official RHEL instructions use `yum-utils`, `yum-config-manager`, and `yum`, so the commands were aligned with the official installation path.
- The provider version constraint was `~> 0.7`, which can select newer pre-1.0 releases including the v0.9 provider line with a different schema. The examples use the legacy v0.8 schema, so the constraint was changed to `~> 0.8.0`.
- The `libvirt_pool` example used the deprecated top-level `path` argument. It was changed to the documented `target { path = ... }` block.
- The cloud-init example used the deprecated `hashicorp/template` provider's `template_file` data source without declaring that provider. It was replaced with Terraform `locals` and heredoc strings.
- The SSH public key interpolation used `file("~/.ssh/id_rsa.pub")`. Terraform does not expand `~` in `file`; the example now uses `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- The cloud-init network config targeted `eth0`, which is unreliable on RHEL 9 guests using predictable interface names. It now uses a version 2 `match` rule for Ethernet-like interface names.
- The architecture diagram and troubleshooting text referred specifically to `libvirtd`. They were updated to refer to libvirt daemons/sockets, matching RHEL 9's modular service model.

## Review Notes
The tutorial is valid for the dmacvicar/libvirt v0.8 provider line. The current v0.9 provider line has a substantially different schema, so a future post update could either migrate all examples to v0.9 or explicitly explain that the tutorial targets v0.8.
