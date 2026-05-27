# Validation Summary: How to Use Ansible to Install EPEL Repository on RHEL/CentOS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- EPEL
- RHEL
- CentOS / CentOS Stream
- DNF / YUM repository configuration
- RPM GPG keys

## Sources Consulted
- Ansible `ansible.builtin.dnf` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible `ansible.builtin.yum_repository` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/yum_repository_module.html
- Ansible `ansible.builtin.rpm_key` module documentation: https://docs.ansible.com/projects/ansible/8/collections/ansible/builtin/rpm_key_module.html
- Red Hat blog, "How to install EPEL on RHEL and CentOS Stream": https://www.redhat.com/en/blog/install-epel-linux
- DNF Configuration Reference: https://dnf.readthedocs.io/en/latest/conf_ref.html
- Fedora Packages, `epel-release`: https://packages.fedoraproject.org/pkgs/epel-release/epel-release/
- Fedora Packages, `certbot`: https://packages.fedoraproject.org/pkgs/certbot/certbot/
- Red Hat RHEL 9 package documentation showing `jq` in RHEL repositories: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_changes-to-packages_considerations-in-adopting-rhel-9
- Fedora EPEL RPM and GPG key URLs were checked directly with `curl -I -L`.

## Issues Found
- The introduction incorrectly listed `jq` as an EPEL example package. `jq` is available from RHEL repositories in current RHEL 9 package documentation, so the example list was changed to EPEL-hosted packages such as `htop`, `certbot`, `fail2ban`, and `ShellCheck`.
- The CentOS Stream guidance did not mention `epel-next-release` for CentOS Stream 9. The quick-install text and Ansible example now install both `epel-release` and `epel-next-release` for CentOS 9.
- The cross-version role claimed RHEL 7 support while using `ansible.builtin.dnf`, which requires `python3-dnf` and is appropriate for the EL8/EL9 scope shown in the examples. The claim was narrowed to RHEL/CentOS-compatible 8 and 9.
- The CRB/CodeReady Builder examples only handled EL9 and hard-coded the RHEL 9 x86_64 repository ID. The role now handles EL8 PowerTools, EL9 CRB, and builds the RHEL CodeReady Builder repository ID from the detected major version and architecture.
- Several package-install task labels claimed every listed package came from EPEL. Some listed packages can come from base/AppStream repositories, so the wording was changed to "after enabling EPEL" or neutral task names.
- The repository priority example installed `yum-plugin-priorities`, which is not the right guidance for the DNF-based EL8/EL9 scope. The section now describes DNF repository priorities and sets the `priority=` option directly.

## Review Notes
The YAML snippets were parsed locally for syntax. The examples were not executed against live RHEL/CentOS hosts, so repository availability can still vary by subscription, architecture, CentOS Stream version, and mirror state.
