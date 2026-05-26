# Validation Summary: How to Configure Molecule with Vagrant Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- Molecule Vagrant driver / molecule-plugins
- Vagrant
- VirtualBox
- libvirt / vagrant-libvirt
- YAML configuration

## Sources Consulted
- Ansible Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- molecule-plugins package metadata: https://pypi.org/project/molecule-plugins/
- Molecule Vagrant plugin documentation/source: https://github.com/ansible-community/molecule-vagrant and molecule-plugins 25.8.12 wheel source
- HashiCorp Vagrant install documentation: https://developer.hashicorp.com/vagrant/install
- HashiCorp Vagrant synced folders documentation: https://developer.hashicorp.com/vagrant/docs/synced-folders/basic_usage
- vagrant-libvirt configuration documentation: https://vagrant-libvirt.github.io/vagrant-libvirt/configuration.html
- HashiCorp Vagrant Cloud API for bento/ubuntu-22.04 box version availability: https://vagrantcloud.com/api/v2/vagrant/bento/ubuntu-22.04

## Issues Found
- The Vagrant install commands did not match current HashiCorp instructions for Homebrew and Debian/Ubuntu repositories. Updated the macOS command to use the HashiCorp tap and updated the apt repository line to include the architecture and current Ubuntu codename fallback.
- Several examples used `driver.provider.options`, but the Molecule Vagrant plugin passes provider options from each platform's `provider_options`. Moved `linked_clone` and `driver: kvm` to the relevant platform `provider_options`.
- The multi-VM example used `provisioner.inventory.hosts` to define groups for Molecule-created platforms. Current Molecule documentation says platform groups should be set with each platform's `groups` key, while `inventory.hosts` is for extra unmanaged inventory using standard YAML inventory shape. Added platform `groups` and removed the incorrect inventory host definitions.
- The synced-folder example put `synced_folder` under `provider_raw_config_args`. The Molecule Vagrant plugin maps `instance_raw_config_args` to `config.vm` calls and `provider_raw_config_args` to provider-specific blocks, so the example would generate the wrong Vagrantfile. Changed it to `instance_raw_config_args` with `vm.synced_folder`.

## Review Notes
The post is technically relevant and now matches current Molecule and Vagrant driver behavior for the reviewed examples. The local environment did not have Molecule, Vagrant, or Ansible installed, so verification used official documentation, package metadata, and the current molecule-plugins wheel source rather than local CLI help.
