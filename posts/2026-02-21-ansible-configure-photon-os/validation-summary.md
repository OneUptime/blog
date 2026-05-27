# Validation Summary: How to Use Ansible to Configure Photon OS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Photon OS
- tdnf package management
- Docker
- systemd
- SSH hardening
- iptables firewall rules
- cron scheduling

## Sources Consulted
- Photon OS 5.0 documentation: https://vmware.github.io/photon/docs-v5/
- Photon OS introduction: https://vmware.github.io/photon/docs-v5/overview/introduction/
- Photon OS flavours: https://vmware.github.io/photon/docs-v5/overview/flavours/
- Photon OS package management with tdnf: https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/
- Photon OS minimal/full package differences: https://vmware.github.io/photon/docs-v5/administration-guide/photon-os-packages/differences-between-minimal-and-full-version/
- Photon OS containers documentation: https://vmware.github.io/photon/docs-v5/administration-guide/containers/
- Photon OS systemd troubleshooting documentation: https://vmware.github.io/photon/docs-v4/troubleshooting-guide/troubleshooting-with-systemd/
- Photon OS firewall documentation: https://vmware.github.io/photon/docs-v4/administration-guide/security-policy/default-firewall-settings/
- Photon OS Kubernetes firewall examples: https://vmware.github.io/photon/docs-v5/user-guide/kubernetes-on-photon-os/kubernetes-kubeadm-cluster-on-photon/configure-worker-node-on-kubernetes/
- Photon OS open-vm-tools/vmtoolsd documentation: https://vmware.github.io/photon/docs-v5/troubleshooting-guide/photon-os-general-troubleshooting/vmtoolsd/
- Ansible ansible.builtin.package module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html

## Issues Found
- Corrected the expansion of `tdnf` from "Tiny DNF" to "Tiny Dandified Yum" to match Photon OS documentation.
- Replaced the specific "~300 MB" minimal footprint claim with "Minimal package footprint" because current Photon OS documentation describes the minimal install by package set rather than that size.
- Updated the container-runtime claim from "Ships with Docker/containerd" to "Includes Docker and supports common container runtimes" to align with Photon OS documentation, which explicitly documents Docker and common container-format support.
- Updated the Photon OS variants list to include minimal, full/developer, OSTree, and real-time variants.
- Replaced `ansible.builtin.timezone` with `community.general.timezone`, which is the documented FQCN for the timezone module.
- Replaced the generic `ansible.builtin.package` example with `tdnf` commands because Ansible does not provide a dedicated tdnf package module, and the post already explains Photon OS package management through `tdnf`.
- Replaced UFW firewall tasks with iptables-based tasks and persistence to `/etc/systemd/scripts/ip4save`, matching Photon OS firewall documentation and examples.
- Made the iptables example check for existing rules before adding them to avoid duplicate firewall entries on rerun.
- Added creation of `/opt/scripts` before copying the compliance scan script there.
- Changed the scheduled cron user from `ansible` to `root` because the example does not create an `ansible` user.

## Review Notes
The playbook examples are technically aligned with the documented Photon OS and Ansible behavior after edits. A local `ansible-playbook --syntax-check` could not be run because `ansible-playbook` is not installed in the workspace.
