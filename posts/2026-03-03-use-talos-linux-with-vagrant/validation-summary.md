# Validation Summary: How to Use Talos Linux with Vagrant

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Vagrant
- vagrant-libvirt
- libvirt/KVM
- Kubernetes
- talosctl
- kubectl
- qemu-img

## Sources Consulted
- Talos Linux v1.7 Vagrant & Libvirt documentation: https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/virtualized-platforms/vagrant-libvirt
- Talos Linux VirtualBox documentation: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/local-platforms/virtualbox
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux support matrix: https://docs.siderolabs.com/talos/v1.12/getting-started/support-matrix
- Talos Linux GitHub releases: https://github.com/siderolabs/talos/releases
- Vagrant package command documentation: https://developer.hashicorp.com/vagrant/docs/cli/package
- Vagrant base box documentation: https://developer.hashicorp.com/vagrant/docs/boxes/base
- vagrant-libvirt box documentation: https://vagrant-libvirt.github.io/vagrant-libvirt/boxes.html

## Issues Found
- The post claimed Talos could be installed manually from the ISO and packaged as a standard Vagrant box before configuration. Talos enters maintenance mode from ISO boot and installs after machine configuration is applied, so the workflow was changed to boot the ISO directly with vagrant-libvirt.
- The post used static Vagrant private network IPs. Talos does not use Vagrant's SSH-based guest network configuration, so the guide now uses libvirt DHCP discovery with `virsh domifaddr`.
- The Talos configuration examples omitted `--install-disk`, which is required for the generated machine config to tell Talos where to install. The examples now use `--install-disk /dev/vda` for libvirt.
- The virtual IP patch targeted `eth1` with DHCP disabled and no static node addresses. The guide now patches `eth0` with DHCP enabled and a VIP, matching the documented vagrant-libvirt flow.
- The bootstrap flow applied every node before bootstrapping. The examples now apply the first control plane, bootstrap it, then apply the remaining control plane and worker nodes.
- The libvirt reusable box example packaged a qcow2 file under a provider-specific filename. vagrant-libvirt documents the version 1 box format as requiring the qcow2 image to be named `box.img`, so the example was corrected.
- The Talos version in the examples was updated from the old v1.7.0 release to v1.13.0, which is the latest stable GitHub release found during review.

## Review Notes
The repository environment did not have `vagrant`, `talosctl`, `kubectl`, or `ruby` installed, so I could not run a live Vagrant validation or Talos cluster creation. Extracted Bash snippets passed `bash -n`, and the Vagrant/libvirt flow was checked against official documentation.
