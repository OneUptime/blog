# Validation Summary: How to Fix Ansible Host is not in the known hosts Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible
- OpenSSH
- SSH known_hosts files
- Ansible playbooks and modules
- Shell commands

## Sources Consulted
- Ansible Core configuration settings for HOST_KEY_CHECKING and ANSIBLE_HOST_KEY_CHECKING: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- Ansible ansible.builtin.known_hosts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/known_hosts_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- OpenSSH ssh_config manual for StrictHostKeyChecking, accept-new, and UserKnownHostsFile: https://man.openbsd.org/ssh_config
- OpenSSH ssh-keyscan manual for -H and host key verification caveats: https://man.openbsd.org/OpenBSD-7.2/ssh-keyscan.1
- OpenSSH ssh-keygen manual for -R known_hosts removal: https://man.openbsd.org/OpenBSD-7.3/ssh-keygen.1

## Issues Found
- The post recommended pre-populating known_hosts using `ssh-keyscan` for production without stating that scanned keys must be verified first. OpenSSH documents that using `ssh-keyscan` without verifying keys leaves users vulnerable to man-in-the-middle attacks. I added a verification note to the command example and security section.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current Ansible documentation lists the timezone module as `community.general.timezone`. I changed the module name to the current fully qualified collection name.

## Review Notes
- The short `known_hosts` module name is still usable, but the current Ansible documentation recommends the fully qualified `ansible.builtin.known_hosts` name for clarity.
- `StrictHostKeyChecking accept-new` is valid in current OpenSSH and correctly described as accepting new host keys while rejecting changed keys.
- The generic Ansible examples under "Common Use Cases" are syntactically plausible, but they are broad examples and may require installed collections such as `community.general` on systems using ansible-core only.
