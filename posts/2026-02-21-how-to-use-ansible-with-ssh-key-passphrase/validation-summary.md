# Validation Summary: How to Use Ansible with SSH Key Passphrase

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- OpenSSH ssh-agent, ssh-add, ssh-keygen, and ssh_config
- SSH bastion hosts and ProxyJump
- macOS SSH keychain integration
- GitHub Actions

## Sources Consulted
- Ansible ansible.builtin.ssh connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible ansible.builtin.git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- OpenBSD/OpenSSH ssh-agent(1) manual: https://man.openbsd.org/ssh-agent
- OpenBSD/OpenSSH ssh-add(1) manual: https://man.openbsd.org/ssh-add
- OpenBSD/OpenSSH ssh-keygen(1) manual: https://man.openbsd.org/ssh-keygen
- OpenBSD/OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- GitHub Docs on Apple's ssh-add keychain option: https://docs.github.com/en/authentication/troubleshooting-ssh/error-ssh-add-illegal-option----apple-use-keychain
- webfactory/ssh-agent README: https://github.com/webfactory/ssh-agent

## Issues Found
- The bastion host section implied that `ProxyJump` requires agent forwarding for the jump from the bastion to the target. Updated it to explain that `ProxyJump` lets the local SSH client authenticate to the target through the bastion using the local agent, and that `ForwardAgent=yes` should be reserved for cases where a remote command must initiate another SSH connection.
- The CI shell example attempted to pipe a passphrase into `ssh-add`, but OpenSSH reads passphrases from the user's tty or an askpass helper, not from standard input. Replaced it with an `SSH_ASKPASS` helper pattern and exported the passphrase so the helper can read it.
- The GitHub Actions example said `webfactory/ssh-agent@v0.9.0` handles passphrase-protected keys. The action's README says keys used with the action must be usable without reading a passphrase from input. Updated the comment to state that the action expects keys without passphrases.

## Review Notes
- The Ansible connection settings, inventory variables, and module parameters shown in the post are valid according to current Ansible documentation.
- The macOS `--apple-use-keychain` flag is specific to Apple's `ssh-add`; GitHub's documentation notes that older macOS versions used `-K` before Monterey.
- `pipelining = true` is technically valid, but Ansible documents that it can conflict with privilege escalation when sudo requires a tty.
