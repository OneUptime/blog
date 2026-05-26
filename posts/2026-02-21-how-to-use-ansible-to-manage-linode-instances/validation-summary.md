# Validation Summary: How to Use Ansible to Manage Linode Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Linode / Akamai Cloud
- `linode.cloud` Ansible collection
- Linode Instances
- Linode Cloud Firewalls
- Linode Volumes
- Linode StackScripts
- Linode NodeBalancers
- UFW
- Linux filesystem and mount management

## Sources Consulted
- Linode Docs: Use the Linode Ansible Collection to Deploy a Linode - https://www.linode.com/docs/guides/deploy-linodes-using-linode-ansible-collection/
- Linode Ansible Collection repository - https://github.com/linode/ansible_linode
- `linode.cloud.instance` module docs - https://github.com/linode/ansible_linode/blob/main/docs/modules/instance.md
- `linode.cloud.firewall` module docs - https://github.com/linode/ansible_linode/blob/main/docs/modules/firewall.md
- `linode.cloud.volume` module docs - https://github.com/linode/ansible_linode/blob/main/docs/modules/volume.md
- `linode.cloud.nodebalancer` module docs - https://github.com/linode/ansible_linode/blob/main/docs/modules/nodebalancer.md
- Linode Ansible Collection Python requirements - https://raw.githubusercontent.com/linode/ansible_linode/main/requirements.txt
- Linode API: Create a NodeBalancer - https://techdocs.akamai.com/linode-api/reference/post-node-balancer
- Linode API: Create a NodeBalancer config - https://techdocs.akamai.com/linode-api/reference/post-node-balancer-config
- Linode API: Create a firewall - https://techdocs.akamai.com/linode-api/reference/post-firewalls
- Ansible `community.general.ufw` module docs - https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.posix.mount` module docs - https://docs.ansible.com/ansible/latest/collections/ansible/posix/mount_module.html

## Issues Found
- The prerequisites installed only `linode_api4`, but the current `linode.cloud` collection publishes additional Python requirements. Changed the prerequisite text and install command to install from the collection's `requirements.txt`.
- The examples referenced `vault_root_password`, but the credentials file snippet did not define it. Added `vault_root_password` to the encrypted variables example.
- The web firewall example used an outbound rule labeled as allowing all outbound traffic, but it only allowed TCP ports and would still block non-TCP traffic because `outbound_policy` was `DROP`. Changed the web firewall to use `outbound_policy: ACCEPT`.
- The NodeBalancer section said direct Ansible module support varies and used raw API calls. The current `linode.cloud` collection includes `linode.cloud.nodebalancer`, so the section now uses that module.
- The NodeBalancer config example did not include backend nodes. Added example `nodes` entries because NodeBalancer configs are intended to route traffic to backend nodes.
- The resize example noted that resizing requires a reboot but did not allow the module to perform implicit reboots. Added `allow_implicit_reboots: true` to align the task with the described operation.

## Review Notes
- The post remains technically relevant and is a code-focused infrastructure automation guide.
- Several examples still use placeholder values such as API tokens, StackScript IDs, certificate paths, Linode IDs, and private IP variables. That is acceptable for a tutorial, but readers need to replace them with account-specific values.
- The `group` field for instances is still supported by the module, but the official docs note that group labeling is deprecated in favor of tags.
