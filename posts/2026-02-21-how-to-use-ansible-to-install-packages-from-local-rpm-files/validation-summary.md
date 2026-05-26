# Validation Summary: How to Use Ansible to Install Packages from Local .rpm Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.dnf
- ansible.builtin.copy
- ansible.builtin.get_url
- ansible.builtin.rpm_key
- ansible.builtin.package_facts
- ansible.builtin.yum_repository
- RPM
- DNF
- systemd

## Sources Consulted
- Ansible ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible ansible.builtin.get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible ansible.builtin.rpm_key module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/rpm_key_module.html
- Ansible ansible.builtin.package_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_facts_module.html
- Ansible ansible.builtin.yum_repository module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- DNF Configuration Reference: https://dnf.readthedocs.io/en/latest/conf_ref.html
- RPM query mode documentation: https://ftp.rpm.org/max-rpm/s1-rpm-commands-query-mode.html

## Issues Found
- The direct URL installation section said there is "no caching" and that the download happens every time Ansible checks package state. The Ansible dnf documentation confirms URLs are accepted as package names, but does not guarantee that exact repeated-download behavior. Changed the text to say there is no Ansible-managed caching or checksum verification and that the RPM may need to be fetched again.
- The GPG verification section implied that simply omitting `disable_gpg_check` always verifies a local RPM file. Ansible's dnf option does control whether GPG checking is disabled, but DNF has separate local package signature-checking behavior through `localpkg_gpgcheck`, which defaults to false in DNF's reference documentation. Updated the text to explain that local RPM signature verification requires local package signature checking to be enabled.
- The tips section said importing GPG keys avoids interactive prompts. In Ansible module usage, missing keys or failed signatures are better described as verification failures, not interactive prompts. Updated the wording accordingly.

## Review Notes
The examples use `ansible.builtin.systemd`, which current Ansible documentation identifies as a backward-compatible alias for `ansible.builtin.systemd_service`. This is still valid, but future posts could use `ansible.builtin.systemd_service` for the current canonical module name.
