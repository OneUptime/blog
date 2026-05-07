# Validation Summary: How to Use Podman in a Virtual Machine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Rootless containers
- QEMU/KVM
- qcow2 and `qemu-img`
- cloud-init
- VirtualBox
- Vagrant
- Fedora
- Ubuntu

## Sources Consulted
- Podman `podman(1)` rootless mode documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman `podman-system-service(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman-system-reset(1)` documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-system-reset.1.html
- Podman `podman-network-create(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-search(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- QEMU invocation documentation: https://www.qemu.org/docs/master/system/invocation.html
- QEMU network device documentation: https://www.qemu.org/docs/master/system/devices/net.html
- QEMU `qemu-img` documentation: https://www.qemu.org/docs/master/tools/qemu-img.html
- Oracle VirtualBox Guest Additions manual: https://www.virtualbox.org/manual/topics/guestadditions.html
- Oracle VirtualBox `VBoxManage` manual: https://www.virtualbox.org/manual/topics/vboxmanage.html
- Oracle VirtualBox advanced topics manual: https://www.virtualbox.org/manual/topics/AdvancedTopics.html
- Vagrant forwarded ports documentation: https://developer.hashicorp.com/vagrant/docs/networking/forwarded_ports
- Vagrant shell provisioner documentation: https://developer.hashicorp.com/vagrant/docs/provisioning/shell
- Fedora 42 cloud image index: https://dl.fedoraproject.org/pub/fedora/linux/releases/42/Cloud/x86_64/images/
- Fedora Packages for `cloud-utils-cloud-localds`: https://packages.fedoraproject.org/pkgs/cloud-utils/cloud-utils-cloud-localds/
- Fedora Packages for `passt`: https://packages.fedoraproject.org/pkgs/passt/passt/
- Ubuntu Packages for `cloud-utils`: https://packages.ubuntu.com/noble/cloud-utils
- Ubuntu Packages for `passt`: https://packages.ubuntu.com/noble/passt
- Vagrant Cloud box entry for `fedora/42-cloud-base`: https://portal.cloud.hashicorp.com/vagrant/discover/fedora/42-cloud-base

## Issues Found
- The Fedora cloud image download URL in the post pointed to a dead file name for Fedora 40. I replaced it with a live official Fedora 42 qcow2 image and updated the matching backing-file reference and Vagrant box name so the examples resolve correctly.
- The host setup instructions used `cloud-localds` without installing the package that provides it. I added `cloud-image-utils` on Ubuntu/Debian and `cloud-utils-cloud-localds` on Fedora so the documented command is available.
- The QEMU launch example used older `-net` syntax. I updated it to current `-nic` syntax and made the main launch example consistent with the later virtio performance guidance.
- The cloud-init snippet enabled `podman.socket` as a system service even though the post is describing rootless Podman setup. I removed that rootful socket activation and added `passt` to the package installs because current Podman rootless networking documentation requires `pasta`/`passt`.
- The VirtualBox section implied nested virtualization was part of the Podman setup path. I corrected the text to state that nested virtualization is optional and only needed for running another hypervisor inside the guest.
- The VirtualBox shared-folder example mixed `--automount` with a manual `mount -t vboxsf` command and omitted the Guest Additions prerequisite. I removed `--automount`, added the Guest Additions requirement, and added the missing mount-point creation command.
- The QEMU snapshot commands used `virsh`, but the VM in the post is launched directly with `qemu-system-x86_64` rather than as a libvirt-managed domain. I replaced that section with `qemu-img snapshot` commands that match the documented VM workflow.
- The storage-driver instructions changed `storage.conf` before running `podman system reset`, which conflicts with Podman’s documented migration order. I moved `podman system reset` before the config change.
- The networking example used `sleep infinity` in an Alpine-based container, which is not a reliable BusyBox invocation. I replaced it with `tail -f /dev/null` and made the `ping` example bounded with `-c 1`.

## Review Notes
- The post still mentions VMware and Hyper-V in overview metadata and comparison context, but it only provides step-by-step setup instructions for QEMU/KVM, VirtualBox, and Vagrant. That is a scope/completeness issue rather than a technical correctness error.
- The Fedora examples are version-pinned, so they will age again. Keeping them on a currently supported Fedora release or periodically refreshing the image names will reduce future validation churn.
