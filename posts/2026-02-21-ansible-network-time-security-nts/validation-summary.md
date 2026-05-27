# Validation Summary: How to Use Ansible to Configure Network Time Security (NTS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Chrony
- Network Time Security (NTS)
- NTP
- TLS
- firewalld
- Linux time synchronization

## Sources Consulted
- RFC 8915: Network Time Security for the Network Time Protocol: https://www.rfc-editor.org/rfc/rfc8915
- Chrony 4.0 chrony.conf documentation: https://chrony-project.org/doc/4.0/chrony.conf.html
- Chrony 4.6 chrony.conf documentation: https://chrony-project.org/doc/4.6/chrony.conf.html
- Chrony chronyc documentation for `authdata`: https://chrony-project.org/doc/4.3/chronyc.html
- Chrony FAQ, "Using NTS?": https://chrony-project.org/faq
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.yum` module documentation: https://docs.ansible.com/ansible/7/collections/ansible/builtin/yum_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.version` test documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/version_test.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html

## Issues Found
- The client playbook used `/etc/chrony.conf` and the `chronyd` service name for all Linux distributions. On Debian-based systems, the default Chrony configuration path is `/etc/chrony/chrony.conf` and the service is commonly named `chrony`, so I changed these to OS-family-specific variables.
- The client playbook created the NTS cookie directory as user and group `chrony` on every platform. Debian-based Chrony packages commonly use `_chrony`, so I added an OS-family-specific `chrony_user` variable.
- The Chrony version assertion checked only the major version with chained regex filters. I changed it to extract the full version string and compare it with Ansible's `version` test against `4.0`.
- The internal NTS server playbook used RHEL-specific package management and paths but was described generically. I updated the description to say it is RHEL-based.
- The verification playbook counted any `NTS` line in `chronyc -N authdata` as authenticated. Chrony documentation says `KeyID`, `Type`, and `KLen` should be non-zero after successful key establishment, so I changed the check to require those non-zero fields.
- The troubleshooting section claimed Chrony falls back to unauthenticated NTP when TCP 4460 is blocked. For a source configured with the `nts` option, Chrony fails NTS key establishment instead of silently treating that same source as unauthenticated, so I corrected the wording.

## Review Notes
- The NTS protocol explanation, NTS-KE TCP port 4460, Chrony NTS directives (`nts`, `ntsdumpdir`, `ntsservercert`, `ntsserverkey`, `ntsprocesses`), and `chronyc -N authdata` usage were checked against the sources above.
- The `ansible.posix.firewalld` module is part of the `ansible.posix` collection, not `ansible-core`; environments using only `ansible-core` need that collection installed.
