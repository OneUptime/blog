# Validation Summary: How to Configure Elemental Network Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Elemental / SUSE Rancher Prime: OS Manager
- NetworkManager
- Cloud-config
- MachineRegistration
- SeedImage
- Ethernet
- Network bonding
- VLANs
- DNS
- Hostname management

## Sources Consulted
- SUSE OS Manager networking guide: https://documentation.suse.com/external-tree/en-us/cloudnative/os-manager/1.5/en/networking.html
- SUSE OS Manager cloud-config reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/cloud-config-reference.html
- SUSE OS Manager MachineRegistration reference: https://documentation.suse.com/cloudnative/os-manager/latest/en/references/machineregistration-reference.html
- SUSE OS Manager hostname customization guide: https://documentation.suse.com/cloudnative/os-manager/1.6/en/hostname.html
- SUSE OS Manager VLAN guide: https://documentation.suse.com/external-tree/en-us/cloudnative/os-manager/1.5/en/networking-vlans.html
- NetworkManager keyfile reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- NetworkManager settings reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager CLI reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager daemon configuration reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- SUSE Linux Enterprise Server NetworkManager guide: https://documentation.suse.com/sles/16.0/html/SLES-networkmanager-nmcli/index.html

## Issues Found
- The introduction implied MachineRegistration cloud-config applies during initial provisioning. SUSE’s OS Manager documentation says MachineRegistration cloud-config is applied only to the installed system after installation and reboot, and that live ISO networking changes must be supplied through a SeedImage. I corrected the introduction and conclusion to reflect that lifecycle.
- The DHCP section said DHCP is configured automatically during registration. SUSE documents DHCP as the default NetworkManager behavior on Ethernet interfaces, not something registration configures. I corrected that explanation.
- The bonding example used `master` and `slave-type`, which current NetworkManager documentation marks as deprecated aliases for `controller` and `port-type`. I updated the bond port profiles to use the current properties.
- The bonding and VLAN examples only wrote keyfiles. NetworkManager’s documentation states that manual keyfile changes must be reloaded with `nmcli connection reload` before they are visible to the daemon. I added `runcmd` steps to reload and activate those profiles so the examples work as described on first boot after installation.
- The custom DNS section bypassed NetworkManager by writing `/etc/resolv.conf` directly and described `dns=none` as disabling `systemd-resolved`, which is not what that setting does. I replaced the example with a NetworkManager keyfile that sets DNS servers and `ignore-auto-dns=true`, which matches the post’s stated NetworkManager-based approach.
- The hostname section used `hostnamectl` from `cloud-config` as the Elemental hostname mechanism. SUSE’s Elemental hostname documentation defines the permanent hostname through `MachineRegistration.spec.machineName`, and that name is later applied from the resulting `MachineInventory`. I replaced the example with the supported `machineName` approach.

## Review Notes
- The examples still use placeholder interface names such as `eth0` and `eth1`. On many modern systems these may instead be names such as `ens160` or `enp1s0`, so readers still need to adapt the profile names to their hardware.
- I did not run the network examples locally because this repository does not provide an Elemental or NetworkManager runtime to exercise them end-to-end.
