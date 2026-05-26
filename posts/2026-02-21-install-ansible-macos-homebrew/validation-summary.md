# Validation Summary: How to Install Ansible on macOS with Homebrew

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ansible
- ansible-core
- Ansible collections and ansible-galaxy
- macOS
- Homebrew
- OpenSSH and SSH configuration
- Python virtual environments and pip

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible release and maintenance matrix: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- Ansible collections installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible default callback plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible SSH connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible FAQ for macOS control nodes: https://docs.ansible.com/projects/ansible/latest/reference_appendices/faq.html
- Homebrew installation documentation: https://docs.brew.sh/Installation.html
- Homebrew ansible formula: https://formulae.brew.sh/formula/ansible
- Homebrew ssh-copy-id formula: https://formulae.brew.sh/formula/ssh-copy-id
- GitHub documentation for Apple's ssh-add keychain option: https://docs.github.com/en/authentication/troubleshooting-ssh/error-ssh-add-illegal-option----apple-use-keychain
- PyPI ansible package page: https://pypi.org/project/ansible/

## Issues Found
- The post said `brew install ansible` installs only ansible-core and built-in modules. Homebrew's `ansible` formula installs the full Ansible community package, which includes ansible-core plus a curated set of collections. Updated the installation and collections sections accordingly.
- The example `ansible --version` output showed ansible-core 2.16 and Python 3.12, which is outdated for the current Homebrew formula. Updated the example to ansible-core 2.20 and Python 3.14.
- The sample `ansible.cfg` used `stdout_callback = yaml`. The `community.general.yaml` callback has been removed in recent community.general releases, and ansible-core now supports YAML output through the default callback. Updated the config to `stdout_callback = default` and `callback_result_format = yaml`.
- The SSH key setup assumed `ssh-copy-id` is always available on macOS. Added a short Homebrew installation command for Macs where it is not installed.
- The Homebrew Python troubleshooting section implied `interpreter_python` controls the Python interpreter used to run Ansible on the control node. It actually controls Python selection on managed nodes for module execution. Rewrote the section to distinguish PATH/venv selection for the control node from `interpreter_python` for managed nodes.
- The pip example used `pip install ansible==2.16.0`, but `2.16.0` is an ansible-core version, not a valid modern `ansible` community package version. Updated it to `python -m pip install ansible==13.7.0`, the current stable Ansible community package as of this review.

## Review Notes
The main workflow and commands are technically sound after the fixes. The post disables host key checking in example configuration, which is common in quick-start tutorials but weakens SSH security; future revisions could recommend `accept-new` or explicit known-host management for production use.
