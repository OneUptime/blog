# Validation Summary: How to Provision Ubuntu VMs on Libvirt/KVM with Terraform

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- KVM (Kernel-based Virtual Machine)
- libvirt / libvirtd / virsh
- QEMU
- Terraform (HashiCorp)
- `dmacvicar/libvirt` Terraform provider
- cloud-init (cloud-config + Netplan v2 network config)
- Ubuntu 22.04 (Jammy) cloud image
- NetworkManager (`nmcli`) bridge networking
- qemu-guest-agent

## Sources Consulted
- dmacvicar/libvirt Terraform provider docs: https://registry.terraform.io/providers/dmacvicar/libvirt/latest/docs
- libvirt_domain resource reference: https://registry.terraform.io/providers/dmacvicar/libvirt/latest/docs/resources/domain
- libvirt_volume, libvirt_cloudinit_disk, libvirt_network resource references on the same registry
- cloud-init documentation: https://cloudinit.readthedocs.io/ (modules: users, packages, runcmd, write_files, timezone, manage_etc_hosts)
- cloud-init network-config v2 / Netplan reference: https://cloudinit.readthedocs.io/en/latest/reference/network-config-format-v2.html
- Ubuntu cloud images: https://cloud-images.ubuntu.com/jammy/current/
- HashiCorp apt repo install instructions: https://developer.hashicorp.com/terraform/install
- Ubuntu package metadata for `cpu-checker` (provides `kvm-ok`), `qemu-kvm`, `libvirt-daemon-system`, `virtinst`, `cloud-image-utils`
- libvirt URI reference: https://libvirt.org/uri.html (verified `qemu:///system` and `qemu+ssh://user@host/system?sshauth=agent`)
- NetworkManager `nmcli` bridge configuration docs (Red Hat / NM upstream)

## Issues Found
- **Missing `cpu-checker` package.** The KVM host setup section instructs the reader to run `kvm-ok` to verify KVM availability, but `kvm-ok` ships in the `cpu-checker` package, which was not in the `apt-get install` list. Without it, the command would fail with "command not found". Fix: added `cpu-checker` to the install list so `kvm-ok` is available.

## Review Notes
- The `dmacvicar/libvirt` provider `~> 0.7` constraint is current and tracks the actively maintained 0.7.x line. The resource attributes used (`libvirt_domain.cloudinit`, `boot_device`, `disk { volume_id, scsi }`, `network_interface { network_name, addresses, wait_for_lease, bridge, mac }`, `cpu { mode }`, `console`, `qemu_agent`, `autostart`, `machine`, `xml { xslt }`) and the `libvirt_volume` `base_volume_id` argument all match the provider's schema.
- `size = disk_gb * 1073741824` actually converts GiB (binary) to bytes. The comment says "GB to bytes", which is the common informal usage; libvirt treats sizes as binary multiples so the math is correct for typical user expectations. Left as-is.
- `gateway4` in Netplan / cloud-init network-config v2 is technically deprecated upstream in favor of `routes: [{to: default, via: ...}]`, but cloud-init still accepts it and applies it correctly on Ubuntu 20.04/22.04. Not changed because it still works and matches what most existing examples use; readers targeting newer Netplan versions may wish to switch.
- The interface name `ens3` is the typical name for the first virtio-net NIC in KVM guests under systemd predictable network naming. It is correct for the default libvirt q35/pc machine with a single NIC, but a reader using a different machine type or multiple NICs may see a different name (e.g. `enp1s0`); could be worth a future caveat.
- `nmcli con add type bridge-slave` still works on current NetworkManager versions; the newer canonical form uses `--type ethernet master <bridge>` or `bridge-port`. Both are accepted, so no edit was made.
- `bridge-utils` is largely superseded by `iproute2` but is harmless to install and still ships in Ubuntu repos.
- The `provider "libvirt" { uri = "qemu+ssh://...?sshauth=agent" }` example is correct per libvirt's URI spec.
- `write_files` writing to `/etc/ssh/sshd_config.d/99-disable-root.conf` relies on Ubuntu's default `Include /etc/ssh/sshd_config.d/*.conf` in `/etc/ssh/sshd_config`, which is present in 20.04 and 22.04 — correct.
- The `runcmd` enabling/starting `qemu-guest-agent` is redundant with the default systemd presets that auto-enable the unit when the package is installed, but it is not incorrect.
