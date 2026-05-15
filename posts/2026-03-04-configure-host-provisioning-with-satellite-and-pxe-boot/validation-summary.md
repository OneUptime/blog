# Validation Summary: How to Configure Host Provisioning with Satellite and PXE Boot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Satellite
- Hammer CLI
- PXE boot
- DHCP, DNS, and TFTP provisioning services
- Kickstart provisioning templates

## Sources Consulted
- Red Hat Satellite 6.16 Provisioning Hosts, Configuring network services: https://docs.redhat.com/en/documentation/red_hat_satellite/6.16/html/provisioning_hosts/Configuring_Networking_provisioning
- Red Hat Satellite 6.18 Provisioning Hosts, Adding a subnet by using Hammer CLI: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/provisioning_hosts/preparing-networking
- Red Hat Satellite 6.19 Provisioning Hosts, Preparing client platforms: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/html/provisioning_hosts/preparing-client-platforms
- Red Hat Satellite 6.18 Hammer Reference, os command: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-os
- Red Hat Satellite 6.18 Hammer Reference, host command: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-host
- Red Hat Satellite 6.18 Hammer Reference, hostgroup command: https://docs.redhat.com/en/documentation/red_hat_satellite/6.18/html/hammer_reference/hammer-hostgroup
- Red Hat Satellite 6.2 Hammer CLI Guide, activation key host group parameter: https://docs.redhat.com/en/documentation/red_hat_satellite/6.2/single/hammer_cli_guide/chap-cli_guide-managing_hosts

## Issues Found
- The `satellite-installer` example enabled DHCP, DNS, and TFTP but omitted the managed-service flags and DHCP/DNS server settings used in Red Hat's provisioning workflow. Added `--foreman-proxy-dhcp-managed`, `--foreman-proxy-dhcp-server`, `--foreman-proxy-dns-managed`, `--foreman-proxy-dns-server`, and `--foreman-proxy-tftp-managed`.
- The subnet example did not define Satellite IPAM or the allocation range in the subnet object. Added `--ipam DHCP`, `--from`, and `--to` to match Red Hat's Hammer subnet provisioning example.
- The operating system example used a nonstandard OS title for the later host group reference and did not associate the provisioning template during creation. Updated the OS name to `Red Hat Enterprise Linux`, added `--provisioning-templates`, and updated the host group OS title.
- The `hammer os set-default-template` example used unsupported options for the current Hammer reference. Replaced `--provisioning-template` and `--template-kind` with a template ID lookup and `--provisioning-template-id`.
- The host group example used `--root-password`, but Hammer documents the option as `--root-pass`. Updated the option.
- The activation key was listed as a prerequisite but never assigned to the host group or host. Added `hammer hostgroup set-parameter` with `kt_activation_keys`, which is the documented registration parameter.
- The host creation example omitted `--managed true`, which Red Hat includes in PXE provisioning host creation examples. Added it.
- The verification example used `hammer host reports list`, but the Hammer command is `hammer host reports`. Updated the command to use `--name`.

## Review Notes
- The commands still use environment-specific placeholder names and IDs, such as Capsule ID `1`, `RHEL9-Base`, and `RHEL9-Activation-Key`; users must replace these with values from their own Satellite environment.
