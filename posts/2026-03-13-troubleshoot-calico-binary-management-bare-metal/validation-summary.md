# Validation Summary: How to Troubleshoot Calico with Binary Management on Bare Metal

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- CNI
- Bare metal Linux nodes
- Ansible
- systemd
- journalctl
- Python JSON tooling

## Sources Consulted
- Calico documentation: Binary install without package manager, https://docs.tigera.io/calico/latest/getting-started/bare-metal/installation/binary
- Calico documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: Install CNI plugin, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico documentation: Install calico/node, https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Calico documentation: Configuring calico/node, https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Ansible documentation: Validating tasks with check mode and diff mode, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible documentation: ansible.builtin.shell module, https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/shell_module.html
- Local command help for `systemctl`, `journalctl`, and `python3 -m json.tool`
- Local Docker execution of `calico/node:v3.32.0` to verify `calico-node` version flags

## Issues Found
- The binary verification command used `/usr/local/bin/calico-node --version`, but the current `calico-node` binary reports `flag provided but not defined: -version` for that option. Changed the command to `/usr/local/bin/calico-node -v`, which prints the Calico version information.
- The datastore connectivity note only mentioned the Kubernetes API server. Calico can use either the Kubernetes datastore or an etcd datastore, so the note now says to check connectivity to the Kubernetes API server or etcd datastore.

## Review Notes
- The Ansible ad-hoc commands, `ansible-playbook --check`, `journalctl -u ... -n 50 --no-pager`, `systemctl status --no-pager`, and `python3 -m json.tool` usage are technically valid.
- The post assumes a custom binary-managed Calico deployment on Kubernetes nodes. Official Calico documentation generally documents Kubernetes `calico/node` as a DaemonSet and bare-metal binary installation as a Felix-focused non-cluster-host flow, so operators should align service names and paths with their own deployment automation.
