# Validation Summary: How to Set Up Vagrant with KVM Provider on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Vagrant
- vagrant-libvirt plugin
- KVM (Kernel-based Virtual Machine)
- QEMU
- libvirt / virsh
- Ubuntu (apt-get, systemd)
- NFS (nfs-kernel-server)
- networking (nmcli, bridge interfaces, libvirt NAT networks)
- fio (disk benchmarking)

## Sources Consulted
- vagrant-libvirt official docs / README: https://github.com/vagrant-libvirt/vagrant-libvirt
- vagrant-libvirt configuration reference: https://vagrant-libvirt.github.io/vagrant-libvirt/configuration.html
- vagrant-libvirt installation guide: https://vagrant-libvirt.github.io/vagrant-libvirt/installation.html
- HashiCorp Vagrant NFS synced folders docs: https://developer.hashicorp.com/vagrant/docs/synced-folders/nfs
- HashiCorp Vagrant issue #6022 (NFS sudoers reference): https://github.com/hashicorp/vagrant/issues/6022
- Ubuntu KVM installation docs (cpu-checker / kvm-ok)
- libvirt virsh networking and storage pool documentation

## Issues Found

1. **`private_network` IP collided with vagrant-libvirt's reserved management subnet.** The Vagrantfile used `192.168.121.10`, but vagrant-libvirt reserves `192.168.121.0/24` for its internal management network — using it for a guest IP causes routing/DHCP conflicts. Changed the example IP to `192.168.50.10` and added a note explaining the reservation.

2. **Redundant deprecated `volume_cache` option alongside `disk_driver`.** The post set both `libvirt.disk_driver :cache => "writeback"` and `libvirt.volume_cache = "writeback"`. `volume_cache` is the legacy option that `disk_driver` supersedes; setting both is redundant and can produce warnings. Removed the `volume_cache` line and added a brief inline note.

3. **Incorrect NFS sudoers entries.** The post added a `NOPASSWD` rule for `/usr/sbin/rpcbind`, which Vagrant never invokes through sudo, and was missing the entries Vagrant actually needs (`chown`, `mv` to swap in a new `/etc/exports`, `nfs-kernel-server` status/start, and `exportfs -ar`). Replaced the snippet with the canonical `Cmnd_Alias`-based sudoers block from Vagrant's NFS documentation and added `chmod 0440` for correct sudoers file permissions.

4. **Bridge networking example used the wrong API.** The post showed `libvirt.management_network_name = "br0"` to attach a VM to a host bridge. `management_network_name` refers to a libvirt-managed network (it defaults to `vagrant-libvirt`), not a Linux host bridge, so the example would fail or attempt to create a libvirt network named `br0`. Replaced with the correct `config.vm.network :public_network, :dev => "br0", :mode => "bridge", :type => "bridge"` form documented by vagrant-libvirt.

## Review Notes
- The plugin build dependencies listed (`libvirt-dev`, `ruby-libvirt`, `libxml2-dev`, `libxslt-dev`, `zlib1g-dev`) are valid; the vagrant-libvirt docs additionally recommend `ruby-dev` and `ebtables` for some setups, but the listed set is generally sufficient on current Ubuntu releases.
- The post uses `qemu:///system` (root daemon) throughout. This is the most common choice and is correctly noted, but readers running rootless setups should use `qemu:///session` and adjust storage pool paths accordingly — the post mentions this briefly.
- The recommendation to use `generic/*` boxes from Roboxes is still accurate at the time of review, but readers should be aware that HashiCorp's Vagrant Cloud was rebranded to the HCP Vagrant Box Registry; box names remain unchanged.
- Performance figures (20-40% faster disk I/O vs VirtualBox) are presented as ballpark numbers and will vary heavily by hardware and workload; the post correctly suggests benchmarking with fio.
- The `mount_options: ["rw", "vers=4", "tcp", "nolock"]` for NFSv4 is reasonable, though `nfs_version: 4` already implies NFSv4 and `vers=4` in mount_options is somewhat redundant — left as-is since it's not incorrect.
