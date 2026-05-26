# Validation Summary: How to Install a Specific Version of Ansible

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ansible community package
- ansible-core
- Python virtual environments and pip
- pip-tools
- apt and apt-mark
- dnf and dnf versionlock
- Git source installs
- Ansible Galaxy collections
- direnv
- ansible-lint and Molecule

## Sources Consulted
- Ansible installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible release and maintenance table: https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html
- Ansible distribution installation guide: https://docs.ansible.com/projects/ansible/latest/installation_guide/installation_distros.html
- Ansible collection installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- pip index documentation: https://pip.pypa.io/en/stable/cli/pip_index/
- DNF command reference: https://dnf.readthedocs.io/en/stable/command_ref.html
- Fedora package listing for ansible/EPEL versions: https://packages.fedoraproject.org/pkgs/ansible/ansible/
- Local CLI help/output for `pip`, `apt-cache`, `apt-mark`, and PyPI version listings.
- GitHub tag lookup for `ansible/ansible` tag `v2.16.4`.

## Issues Found
- The introduction referred to playbooks written for "Ansible 2.14". In current Ansible versioning, 2.14 refers to `ansible-core`, while the community package uses versions such as 7.x, 8.x, and 9.x. Changed this to "ansible-core 2.14" for precision.
- The verification section described `ansible --version` as checking the installed Ansible version. Official Ansible docs state that this command reports the associated `ansible-core` version, while `ansible-community --version` reports the community package version. Updated the comments and added `ansible-community --version`.
- The apt example used `ansible=9.2.0-1ppa~jammy`, which is not a reliable current example for Ubuntu repositories/PPA. Replaced it with the actual Ubuntu 24.04 Noble package version example `ansible=9.2.0+dfsg-0ubuntu1`.
- The dnf example used `ansible-9.2.0-1.el9`, but Fedora's current package listing shows EPEL 9 at `7.7.0-1.el9` and EPEL 8 at `9.2.0-1.el8`. Updated the example to `ansible-9.2.0-1.el8`.
- Clarified that `dnf versionlock add ansible` uses the versionlock plugin, because it is a DNF plugin command rather than a base command on all installations.

## Review Notes
The post is technically relevant and its core guidance is sound. `pip index versions` is documented by pip but still emitted an experimental-command warning in local CLI output, so future revisions may prefer noting that warning or using PyPI pages/API for fully stable workflows. Ansible 8.x, 9.x, and 10.x are now end-of-life as of the review date, but they remain valid examples for installing historical pinned versions.
