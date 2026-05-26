# Validation Summary: How to Install kubectl with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Kubernetes
- kubectl
- kubeconfig
- Homebrew
- Debian/Ubuntu apt repositories
- RHEL/CentOS/Fedora yum/dnf repositories
- Krew kubectl plugin manager
- Shell completion for bash and zsh

## Sources Consulted
- Kubernetes documentation: Install and Set Up kubectl on Linux - https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes documentation: Install and Set Up kubectl on macOS - https://kubernetes.io/docs/tasks/tools/install-kubectl-macos/
- Kubernetes kubectl reference: kubectl version - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes version skew policy - https://kubernetes.io/releases/version-skew-policy/
- Ansible documentation: ansible.builtin.apt_key - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible documentation: ansible.builtin.get_url - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Krew documentation: Installing - https://krew.sigs.k8s.io/docs/user-guide/setup/install/

## Issues Found
- The article said the direct binary method downloads kubectl from Google. The example uses `dl.k8s.io`, so this was changed to "the Kubernetes release site."
- Several examples used `kubectl version --client --short`. The current official kubectl version reference lists `--client` and `--output`, but not `--short`, and recent kubectl versions reject `--short`. These commands were changed to `kubectl version --client`.
- The Debian package-manager example used `ansible.builtin.apt_key` with `/etc/apt/keyrings`. Ansible documents `apt_key` as deprecated because it depends on the deprecated `apt-key` utility, and Kubernetes documents the current keyring-based repository setup. The example now creates `/etc/apt/keyrings`, downloads the Release key, and dearmors it with `gpg`.
- The kubeconfig example referenced CA certificate paths in variables but did not deploy those CA files to the paths used by the generated kubeconfig. A task was added to copy each cluster CA certificate into `~/.kube`.
- The Krew playbook referenced `kubectl_os`, `kubectl_arch`, and `user_shell` without defining them. A setup task was added to define those facts before downloading Krew or updating the shell rc file.
- The upgrade playbook referenced `kubectl_os` and `kubectl_arch` without defining them. A setup task was added before the download task.

## Review Notes
- The Kubernetes package repository examples are version-specific to the v1.29 stable repository because the post installs kubectl 1.29.2. Users upgrading to another minor version must update the repository minor version, which matches Kubernetes' current package repository guidance.
- The local environment did not have `ansible-playbook` or `yq` installed, so live syntax checks were not run.
