# Validation Summary: How to Add APT Keys with the Ansible apt_key Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.apt_key
- ansible.builtin.apt_repository
- APT repository configuration
- GPG/OpenPGP keyrings
- Debian/Ubuntu package repository signing

## Sources Consulted
- Ansible `ansible.builtin.apt_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible `ansible.builtin.apt_repository` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/apt_repository_module.html
- Debian `apt-key(8)` manpage: https://manpages.debian.org/testing/apt/apt-key.8.en.html
- Debian `sources.list(5)` manpage: https://manpages.debian.org/testing/apt/sources.list.5.en.html
- Kubernetes kubeadm installation documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes `pkgs.k8s.io` repository announcement: https://kubernetes.io/blog/2023/08/15/pkgs-k8s-io-introduction/
- Docker Engine Ubuntu installation documentation: https://docs.docker.com/engine/install/ubuntu/
- Grafana Debian/Ubuntu installation documentation: https://grafana.com/docs/grafana/latest/installation/debian/
- HashiCorp package installation documentation: https://developer.hashicorp.com/vault/downloads/

## Issues Found
- The Kubernetes example incorrectly described `Release.key` as already dearmored. Official Kubernetes documentation pipes this key through `gpg --dearmor`, and a direct check of the URL shows it is an ASCII-armored `PGP PUBLIC KEY BLOCK`. Updated the text and task name accordingly.
- The shell conditional used `file ... | grep -q 'PGP public key'` to decide when to copy the key directly. That matches ASCII-armored keys such as Kubernetes `Release.key`, so it would have copied an armored key into a `.gpg` file. Updated the conditional to dearmor `PGP public key block` files and copy only other key formats.
- The pitfall saying APT always expects binary keyring files was too broad. Debian `apt-key(8)` documents that ASCII-armored keys are supported with apt 1.4 and later when using the `.asc` extension. Updated the guidance to match key format to extension and dearmor armored keys when saving them as `.gpg`.

## Review Notes
- The post correctly warns that `apt_key` is deprecated and that `signed-by` constrains repository verification to specific keys. Current Ansible documentation also notes that `apt-key` has been removed in modern Debian versions and points to `ansible.builtin.deb822_repository` as the forward-looking replacement for `apt_repository` plus key management.
- The examples use `/usr/share/keyrings`, which works with `signed-by` when readable by the `_apt` user. Debian's current `sources.list(5)` guidance recommends `/etc/apt/keyrings` for keyrings managed by the system operator and `/usr/share/keyrings` for keyrings managed by packages, so future revisions could align examples with `/etc/apt/keyrings`.
