# Validation Summary: How to Use Ansible with Teleport for SSH Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Teleport
- OpenSSH
- SSH certificates
- Teleport Machine & Workload Identity
- Python dynamic inventory scripts

## Sources Consulted
- Teleport tsh CLI reference: https://goteleport.com/docs/reference/cli/tsh/
- Teleport tbot CLI reference: https://goteleport.com/docs/reference/cli/tbot/
- Teleport Machine & Workload Identity with Ansible guide: https://goteleport.com/docs/machine-workload-identity/access-guides/ansible/
- Teleport tsh client guide: https://goteleport.com/docs/connect-your-client/teleport-clients/tsh/
- Teleport TLS routing reference: https://goteleport.com/docs/reference/architecture/tls-routing/
- Teleport tctl CLI reference: https://goteleport.com/docs/reference/cli/tctl/
- Teleport installation guide: https://goteleport.com/docs/installation/
- Ansible ssh connection plugin documentation: https://docs.ansible.com/projects/ansible-core/2.15/collections/ansible/builtin/ssh_connection.html
- Ansible dynamic inventory documentation: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html

## Issues Found
- The `tsh` install command pinned Teleport 14.0.0, which is outdated and may be incompatible with current clusters. Updated the example to detect the cluster version from `/webapi/find` and download the matching Linux client archive from Teleport's official CDN.
- The Method 1 Ansible configuration set `ssh_executable` directly to `/usr/local/bin/tsh`. Ansible expects an SSH-compatible executable and would not automatically insert the `ssh` subcommand. Added a small `tsh-ssh` wrapper that executes `tsh ssh`.
- The Method 1 example used `scp_if_ssh`, while current Ansible documentation uses `transfer_method`. Updated the example to `transfer_method = piped` so file transfer uses the configured SSH wrapper.
- The Teleport-generated OpenSSH configuration example disabled strict host key checking. Since Teleport's generated config includes the appropriate known hosts settings, removed the unnecessary override.
- The direct ProxyCommand inventory omitted Teleport's SSH port. Added `ansible_port=3022`, matching Teleport's OpenSSH examples.
- The CI/CD machine identity example used an invalid `tsh proxy ssh --cert-file ... -o IdentityFile=...` command and referenced output filenames that do not match Teleport's current identity output. Updated it to use `tbot start identity --destination=file://...` and configure Ansible with the generated `ssh_config`.
- The security section stated that every Ansible session is recorded. Adjusted the wording to say sessions can be recorded and replayed, because recording depends on Teleport configuration.

## Review Notes
The dynamic inventory script follows Ansible's JSON inventory shape and uses `tsh ls --format=json`, which is consistent with Teleport's documented examples. In a production setup using OpenSSH config, appending the Teleport cluster name to inventory hostnames, as Teleport's official Ansible guide demonstrates, may be preferable.
