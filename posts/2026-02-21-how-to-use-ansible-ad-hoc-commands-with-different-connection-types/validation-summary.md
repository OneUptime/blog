# Validation Summary: How to Use Ansible Ad Hoc Commands with Different Connection Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- Ansible connection plugins
- SSH and Paramiko SSH
- Local connections
- Docker container connections
- Windows WinRM
- Network device connections with network_cli, netconf, and httpapi
- Kubernetes pod connections with kubectl

## Sources Consulted
- Ansible ad hoc command guide: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible connection plugins overview: https://docs.ansible.com/projects/ansible/latest/plugins/connection.html
- ansible.builtin.ssh connection plugin: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ssh_connection.html
- ansible.builtin.local connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/local_connection.html
- ansible.builtin.paramiko_ssh connection plugin: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/paramiko_ssh_connection.html
- ansible.builtin.winrm connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/winrm_connection.html
- community.docker.docker connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_connection.html
- kubernetes.core.kubectl connection plugin: https://docs.ansible.com/ansible/latest/collections/kubernetes/core/kubectl_connection.html
- ansible.netcommon.network_cli connection plugin: https://docs.ansible.com/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- ansible.netcommon.netconf connection plugin: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_netconf_enabled.html
- ansible.netcommon.httpapi connection plugin: https://docs.ansible.com/ansible/latest/collections/ansible/netcommon/httpapi_connection.html
- Cisco IOS platform options: https://docs.ansible.com/ansible/latest/network/user_guide/platform_ios.html
- Arista EOS platform options: https://docs.ansible.com/ansible/latest/network/user_guide/platform_eos.html
- ansible.windows Windows modules documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/

## Issues Found
- The introduction said each connection type has its own module and configuration. Changed "module" to "plugin" because Ansible connection types are connection plugins; modules are the tasks executed over those connections.
- Docker examples used the older short connection name `docker`. Updated examples and inventory to `community.docker.docker`, the current documented collection plugin name.
- The dynamic Docker targeting example did not provide an inventory source for the discovered container name. Added `-i webapp,` so the ad hoc command can target that one container directly.
- Network examples used short collection names such as `ios_command`, `ios_config`, `network_cli`, and `netconf_get`. Updated them to current documented FQCNs such as `cisco.ios.ios_command`, `cisco.ios.ios_config`, `ansible.netcommon.network_cli`, and `ansible.netcommon.netconf_get`.
- The `httpapi` example incorrectly used `httpapi` as a module. Replaced it with an Arista EOS command example using `arista.eos.eos_command` over the `ansible.netcommon.httpapi` connection.
- Network inventory used legacy `ansible_network_os` values `ios` and `nxos`. Updated them to documented collection values `cisco.ios.ios` and `cisco.nxos.nxos`.
- Paramiko examples used `paramiko` as the connection plugin name and described it as generally slower than native SSH. Updated the plugin name to `paramiko_ssh` and aligned the explanation with current Ansible documentation around ControlPersist support.
- Kubernetes examples used the short `kubectl` connection name. Updated them to the documented `kubernetes.core.kubectl` connection plugin name.

## Review Notes
- The remaining short names for core modules and plugins, such as `ping`, `command`, `copy`, `ssh`, `local`, `winrm`, and Windows modules, are accepted by Ansible documentation, although FQCNs are generally recommended for long-form production examples.
- Several examples assume the relevant collections are installed, including `community.docker`, `kubernetes.core`, `ansible.netcommon`, `cisco.ios`, `cisco.nxos`, `arista.eos`, and `ansible.windows`.
