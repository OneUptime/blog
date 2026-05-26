# Validation Summary: How to Set Up Local Testing Environments for Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Vagrant
- VirtualBox
- Docker
- Docker Compose
- LXD / LXC
- Ubuntu 22.04
- Bash

## Sources Consulted
- HashiCorp Vagrant install documentation: https://developer.hashicorp.com/vagrant/install
- HashiCorp Vagrant Ansible provisioner documentation: https://developer.hashicorp.com/vagrant/docs/provisioning/ansible
- Docker Compose Specification: https://compose-spec.github.io/compose-spec/spec.html
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- LXD instance creation documentation: https://documentation.ubuntu.com/lxd/stable-5.0/howto/instances_create/
- Local Docker CLI verification with Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- The macOS Vagrant installation command used `brew install vagrant`, which does not match HashiCorp's current official Homebrew instructions. Updated it to use `brew tap hashicorp/tap` and `brew install hashicorp/tap/hashicorp-vagrant`, and changed VirtualBox to Homebrew Cask syntax.
- The Vagrant Ansible provisioner was defined globally while the text said it runs after all VMs are up. In multi-machine Vagrant environments, HashiCorp's documented pattern is to attach the provisioner to the final machine when it should run once against all machines. Moved the provisioner into the `db` machine block.
- The Docker Compose systemd example did not keep the Ubuntu systemd container running in local verification. Added the Compose-supported host cgroup namespace and tmpfs mounts for `/run` and `/run/lock`; with those options, systemd stayed up and `ssh` was active.
- The LXD description implied VM-equivalent isolation. Updated the wording to clarify that LXD system containers provide a fuller OS userspace and systemd experience while sharing the host kernel.
- The helper script referenced `scripts/setup_lxd.sh`, but the post defines `scripts/setup_lxd_ssh.sh`. Updated the LXD branch to launch the three containers, call the defined SSH setup script, and generate `inventories/lxd/hosts` from the running container IP addresses.

## Review Notes
- The Docker approach requires privileged containers and host cgroup access for the systemd example, so it is appropriate for local testing but should not be treated as a production container pattern.
- Static IPs are used for Vagrant and Docker, while the LXD helper generates inventory from the dynamic addresses assigned by LXD.
