# Validation Summary: How to Deploy Vagrant with Libvirt Provider on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM
- libvirt
- Vagrant
- vagrant-libvirt
- Vagrant networking
- Vagrant synced folders
- Vagrant provisioning

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/
- HashiCorp Vagrant install documentation: https://developer.hashicorp.com/vagrant/install
- HashiCorp Vagrant default provider documentation: https://developer.hashicorp.com/vagrant/docs/providers/default
- HashiCorp Vagrant private networks documentation: https://developer.hashicorp.com/vagrant/docs/networking/private_network
- HashiCorp Vagrant forwarded ports documentation: https://developer.hashicorp.com/vagrant/docs/networking/forwarded_ports
- HashiCorp Vagrant public networks documentation: https://developer.hashicorp.com/vagrant/docs/networking/public_network
- HashiCorp Vagrant NFS synced folders documentation: https://developer.hashicorp.com/vagrant/docs/synced-folders/nfs
- HashiCorp Vagrant Ansible provisioner documentation: https://developer.hashicorp.com/vagrant/docs/provisioning/ansible
- vagrant-libvirt quickstart documentation: https://vagrant-libvirt.github.io/vagrant-libvirt/
- vagrant-libvirt installation documentation: https://vagrant-libvirt.github.io/vagrant-libvirt/version/0.10.8/installation.html
- vagrant-libvirt configuration documentation: https://vagrant-libvirt.github.io/vagrant-libvirt/configuration.html

## Issues Found
- The RHEL 9 libvirt startup command used `systemctl enable --now libvirtd`. RHEL 9 documentation now describes starting the modular libvirt daemon sockets for qemu, network, nodedev, nwfilter, secret, storage, and interface drivers. Updated the command to enable and start those sockets.
- The setup verification command used `virsh list --all` while describing it as a KVM readiness check. Red Hat documents `virt-host-validate` for validating host virtualization readiness, so the command was changed accordingly.
- The private-network examples used `192.168.121.x`. vagrant-libvirt reserves `192.168.121.0/24` for its default management network, so the examples were changed to `10.20.30.x`, matching the non-overlapping subnet style used in vagrant-libvirt examples.
- The public-network example used generic `bridge: "eth0"` syntax. vagrant-libvirt documents public network options as `dev`, `mode`, and `type`, so the example was updated to use those provider-specific options.

## Review Notes
The remaining Vagrantfile snippets, Vagrant CLI commands, HashiCorp RPM repository commands, plugin installation command, synced-folder options, and provider-specific libvirt options match current official documentation. The exact public-network device name may vary by host, so users may need to replace `eth0` with the actual wired interface or bridge device on their RHEL system.
