# Validation Summary: How to Install Ansible on Windows Using WSL2

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ansible
- Windows Subsystem for Linux 2 (WSL2)
- Ubuntu / apt
- Python virtual environments and pip
- OpenSSH
- Ansible inventory, playbooks, and ansible.cfg
- Windows Terminal and VS Code Remote - WSL

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible OS-specific installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/installation_distros.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible default callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible community.general.yaml callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/yaml_callback.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- Microsoft WSL install documentation: https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft WSL basic commands documentation: https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Microsoft WSL advanced configuration documentation: https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Microsoft WSL troubleshooting documentation: https://learn.microsoft.com/en-us/windows/wsl/troubleshooting
- OpenBSD ssh-keygen manual: https://man.openbsd.org/ssh-keygen.1
- Debian ssh-copy-id manual: https://manpages.debian.org/unstable/openssh-client/ssh-copy-id.1.en.html

## Issues Found
- The SSH key generation command wrote to `~/.ssh/ansible_wsl` without first ensuring that `~/.ssh` exists. On a fresh WSL Ubuntu account this directory may not exist, causing `ssh-keygen` to fail. Added `mkdir -p ~/.ssh` before `ssh-keygen`.
- The sample `ansible.cfg` used `stdout_callback = yaml`. The old `community.general.yaml` callback has been removed in current `community.general`; Ansible's built-in default callback supports YAML-style result formatting through `callback_result_format = yaml`. Updated the config to use `stdout_callback = default` and `callback_result_format = yaml`.

## Review Notes
- The WSL installation commands, WSL version checks, `.wslconfig` memory and processor settings, Ansible PPA installation commands, virtual environment installation flow, inventory syntax, and playbook syntax are consistent with current official documentation.
- Disabling `host_key_checking` is valid Ansible configuration, but it reduces SSH host verification security. For production use, keeping host key checking enabled and managing `known_hosts` explicitly would be preferable.
- The custom DNS workaround is technically valid, but newer WSL environments may also support DNS tunneling; users should treat manual `resolv.conf` changes as a troubleshooting step rather than a default configuration.
