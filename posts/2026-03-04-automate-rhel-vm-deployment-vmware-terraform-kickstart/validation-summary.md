# Validation Summary: How to Automate RHEL VM Deployment in VMware Using Terraform and Kickstart

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart and Anaconda installer boot options
- VMware vSphere
- Terraform
- VMware vSphere Terraform provider
- open-vm-tools
- Red Hat subscription-manager

## Sources Consulted
- Red Hat Enterprise Linux 9 Automatically installing RHEL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat Enterprise Linux 9 Boot options for RHEL installer documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/boot_options_for_rhel_installer/index
- VMware vSphere Terraform provider documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs
- VMware vSphere Terraform provider `vsphere_virtual_machine` resource documentation: https://registry.terraform.io/providers/vmware/vsphere/latest/docs/resources/virtual_machine
- VMware vSphere Terraform provider source documentation: https://github.com/hashicorp/terraform-provider-vsphere/blob/main/docs/resources/virtual_machine.md

## Issues Found
1. **Overstated automation claim**: Changed the introduction from automating the entire VM lifecycle to automating the deployment workflow, because the ISO boot path still requires the installer to receive the `inst.ks` boot option before Kickstart starts.

2. **Moved Terraform provider source**: Changed the provider source from `hashicorp/vsphere` to `vmware/vsphere`, matching the current Terraform Registry namespace for the vSphere provider.

3. **Outdated provider version constraint**: Updated the provider constraint from `~> 2.6` to `~> 2.11` to keep the example aligned with the current vSphere provider release series.

4. **Missing Terraform variable declarations**: Added `vsphere_user`, `vsphere_password`, and `vsphere_server` variable blocks so the sample configuration is complete enough for `terraform plan`.

5. **Incorrect implication that `guestinfo.kickstart` starts Kickstart**: Changed the comment to clarify that `guestinfo.kickstart` is optional VM metadata and that Anaconda uses the `inst.ks` boot option shown later in the post.

6. **vSphere network waiter unsuitable for ISO installs**: Added `wait_for_guest_net_timeout = 0` and `wait_for_guest_ip_timeout = 0` so Terraform does not wait for VMware Tools guest networking while the OS is still being installed from ISO.

7. **Scaling claim omitted boot automation requirement**: Updated the final scaling statement to require PXE or a custom ISO that includes the Kickstart boot option.

## Review Notes
- The Kickstart command examples use valid RHEL 9 syntax, but the placeholder root password hash and Red Hat subscription credentials must be replaced with real environment-specific values.
- `allow_unverified_ssl = true` is valid for lab environments but should generally be avoided in production.
- Terraform was not installed in the local environment, so syntax was reviewed against provider documentation rather than by running `terraform validate`.
