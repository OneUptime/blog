# Validation Summary: How to Configure IPv6 for Virtual Machine Templates

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- Cloud-init
- Netplan Version 2 network configuration
- NoCloud seed images
- QEMU / KVM
- VMware vSphere guest customization
- pyVmomi
- Packer QEMU builder

## Sources Consulted
- Cloud-init network configuration: https://docs.cloud-init.io/en/latest/topics/network-config.html
- Cloud-init Networking Config Version 2: https://docs.cloud-init.io/en/latest/reference/network-config-format-v2.html
- Cloud-init NoCloud datasource: https://docs.cloud-init.io/en/latest/reference/datasources/nocloud.html
- Cloud-init CLI reference (`clean`): https://docs.cloud-init.io/en/latest/reference/cli.html
- Cloud-init local testing / `cloud-localds --network-config`: https://docs.cloud-init.io/en/23.4/howto/predeploy_testing.html
- Netplan YAML reference: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- Ubuntu autoinstall quick start: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/autoinstall-quickstart.html
- Packer QEMU builder: https://developer.hashicorp.com/packer/integrations/hashicorp/qemu/latest/components/builder/qemu
- Packer communicators and SSH communicator: https://developer.hashicorp.com/packer/docs/communicators and https://developer.hashicorp.com/packer/docs/communicators/ssh
- VMware vSphere Web Services API customization objects: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.customization.IPSettings.html, https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.customization.IPSettings.IpV6AddressSpec.html, https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.customization.FixedIpV6.html, https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.customization.Specification.html
- VMware vSphere Web Services API clone spec: https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.vm.CloneSpec.html
- Ubuntu 22.04 release checksums: https://releases.ubuntu.com/22.04/SHA256SUMS
- `virt-customize` reference: https://libguestfs.org/virt-customize.1.html
- systemd `machine-id` and DHCPv6 identity context: https://www.freedesktop.org/software/systemd/man/devel/machine-id.html and https://www.freedesktop.org/software/systemd/man/257/networkd.conf.html

## Issues Found
- The post described the primary cloud-init network example as `user-data`, but cloud-init documents that user-data cannot change an instance's network configuration. I changed the example to a `network-config` / `/etc/cloud/cloud.cfg.d` example and updated the KVM NoCloud seed flow to use `cloud-localds --network-config=...`.
- The primary YAML example had active DHCP settings and active static addressing in the same interface stanza while describing them as alternatives. I turned the static section into a commented alternative and replaced deprecated `gateway4` / `gateway6` usage with `routes`.
- The examples hard-coded `eth0`, which is not dependable on current Ubuntu guests. I switched the examples to a netplan/cloud-init device ID with `match.name` so the guidance is not tied to a legacy interface name.
- The VMware pyVmomi sample called an undefined helper, used the wrong type for the IPv6 gateway field, and omitted required customization / clone spec pieces (`globalIPSettings`, `location`, and explicit non-template clone behavior). I added the helper and corrected the object construction.
- The Packer example used a placeholder ISO checksum, claimed bridged networking without configuring a bridge, and omitted the SSH and shutdown settings needed for the file and shell provisioners to run. I replaced the checksum with the official Ubuntu 22.04.5 SHA256, added bridge and communicator settings, and quoted the NoCloud `seedfrom` argument so the embedded semicolon is not misparsed by GRUB.
- The pre-boot checklist used a `grep` pattern that would not actually find the netplan keys mentioned in the explanatory comment. I replaced it with a pattern that checks for the relevant automatic and static IPv6 markers.

## Review Notes
- The post is technically sound after correction, but the concrete examples are Ubuntu-oriented because they rely on cloud-init, netplan, and Ubuntu autoinstall behavior.
- The `br0` bridge name in the QEMU and Packer examples is an example host-side bridge and must match the actual bridge name on the build host.
- The `match: { name: "e*" }` pattern is suitable for simple single-NIC templates. Multi-NIC templates should use a more specific match rule or platform-specific naming strategy.
