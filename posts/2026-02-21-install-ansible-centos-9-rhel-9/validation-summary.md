# Validation Summary: How to Install Ansible on CentOS 9 and RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ansible
- CentOS Stream 9
- Red Hat Enterprise Linux 9
- DNF and EPEL
- Python pip and venv
- SSH key authentication
- Ansible inventory and ansible.cfg
- firewalld
- SELinux

## Sources Consulted
- Ansible Community Documentation: Installing Ansible on specific operating systems: https://docs.ansible.com/projects/ansible/latest/installation_guide/installation_distros.html
- Ansible Community Documentation: Installing Ansible with pip and confirming installation: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible Community Documentation: Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: ansible.builtin.dnf module: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible Community Documentation: ansible.builtin.systemd_service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible Community Documentation: ansible.builtin.ping module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Red Hat Documentation: Installing and using Python on RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_installing-and-using-python_installing-and-using-dynamic-programming-languages
- Red Hat Blog: How to install EPEL on RHEL and CentOS Stream: https://www.redhat.com/en/blog/install-epel-linux
- Fedora Packages: python3-virtualenv in EPEL 9: https://packages.fedoraproject.org/pkgs/python-virtualenv/python3-virtualenv/

## Issues Found
- The original EPEL instructions used `sudo dnf install epel-release -y` before distinguishing CentOS Stream from RHEL. This is not a reliable RHEL 9 setup path before EPEL is enabled. I changed the section to provide separate CentOS Stream 9 and RHEL 9 commands.
- The original RHEL command used `sudo dnf config-manager --set-enabled crb`. On RHEL 9, the documented repository id is `codeready-builder-for-rhel-9-$(arch)-rpms` and it is enabled with `subscription-manager repos --enable`. I replaced the command accordingly.
- The CentOS Stream 9 setup omitted EPEL Next, which is recommended for CentOS Stream 9 EPEL usage. I added `epel-next-release-latest-9.noarch.rpm` to the CentOS Stream 9 install command.
- The virtual environment section said to install the `venv` module with `python3-virtualenv`. RHEL documentation shows `python3 -m venv` as the standard virtual environment workflow, while `python3-virtualenv` is the separate `virtualenv` tool. I removed that package installation step.
- The sample playbook installed `htop`, which is not consistently available from default RHEL 9 repositories on managed nodes. I changed it to `curl` to keep the test playbook more likely to work on default CentOS Stream 9 and RHEL 9 systems.

## Review Notes
- The `ansible.builtin.systemd` module name is currently retained as an alias for `ansible.builtin.systemd_service`; the example remains functional, though future updates could use `ansible.builtin.systemd_service` directly.
- The pip method is technically valid, but Red Hat warns against system-wide root pip installs because they can conflict with supported system packages. The post already recommends using a virtual environment, which is the safer path.
