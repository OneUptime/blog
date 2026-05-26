# Validation Summary: How to Use Ansible to Configure OpenSSL

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: apt, dnf, package, copy, template, find, shell, command, debug, include_vars
- community.crypto modules: openssl_privatekey, openssl_csr, x509_certificate, openssl_dhparam
- OpenSSL configuration files and CLI commands
- TLS certificates, cipher strings, and certificate expiration checks

## Sources Consulted
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.dnf module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/builtin/dnf_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- community.crypto openssl_csr module documentation: https://ansible-collections.github.io/community.crypto/branch/main/openssl_csr_module.html
- community.crypto x509_certificate module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_module.html
- community.crypto self-signed certificate guide: https://ansible.readthedocs.io/projects/ansible/9/collections/community/crypto/docsite/guide_selfsigned.html
- OpenSSL config manual: https://docs.openssl.org/3.6/man5/config/
- OpenSSL SSL_CONF_cmd manual: https://docs.openssl.org/3.3/man3/SSL_CONF_cmd/
- OpenSSL x509 command manual: https://docs.openssl.org/4.0/man1/openssl-x509/

## Issues Found
- The OpenSSL configuration template placed `openssl_conf = default_conf` inside an explicit `[default]` section. OpenSSL reads `openssl_conf` from the unnamed default section, so the SSL configuration would not be activated as intended. Removed the `[default]` header.
- The RHEL/CentOS install example used `ansible.builtin.yum`. Current Ansible documentation redirects `yum` to `dnf`, and the older yum backend was removed from ansible-core 2.17. Updated the example to use `ansible.builtin.dnf`.
- The certificate-expiry check would run `openssl x509 -checkend` on every matched `.pem` file, including private keys or invalid PEM files, and then report those failures as expiring certificates. Added a guard so only files that first parse as certificates are checked for expiration, and skipped results are not reported.
- The shell examples interpolated file paths without shell quoting. Added Ansible's `quote` filter around certificate paths.
- The role directory structure omitted the `vars/` files required by the `include_vars: "{{ ansible_os_family }}.yml"` task and the `openssl_packages` variable. Added `vars/Debian.yml` and `vars/RedHat.yml` to the shown role structure.
- The production tip described community.crypto modules as "built-in modules." Reworded this to "collection modules."

## Review Notes
The examples are generally accurate after the fixes. Future improvements could include replacing `state: latest` with pinned package versions for production examples and using a service-specific TLS configuration path where applications do not honor the system OpenSSL defaults.
