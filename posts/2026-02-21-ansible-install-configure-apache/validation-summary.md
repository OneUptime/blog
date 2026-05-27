# Validation Summary: How to Use Ansible to Install and Configure Apache

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- `community.general.apache2_module`
- Apache HTTP Server / HTTPD
- Debian/Ubuntu Apache tools (`apache2ctl`, `a2enconf`, `a2ensite`)
- RHEL/CentOS HTTPD commands
- Apache SSL, module, MPM, reverse proxy, and virtual host configuration

## Sources Consulted
- Ansible `community.general.apache2_module` documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/apache2_module_module.html
- Ansible `ansible.builtin.apt` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.systemd_service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.command` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Apache `apachectl` documentation: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Apache `mod_proxy` documentation: https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache `mod_proxy_wstunnel` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_wstunnel.html
- Apache `mod_headers` documentation: https://httpd.apache.org/docs/2.4/mod/mod_headers.html
- Debian `a2enconf` manpage: https://manpages.debian.org/testing/apache2/a2enconf.8.en.html
- Debian `a2ensite` manpage: https://manpages.debian.org/bookworm/apache2/a2ensite.8.en.html

## Issues Found
- The prerequisite list omitted the `community.general` collection even though the examples use `community.general.apache2_module`, which is not part of `ansible-core`. Added it as a prerequisite.
- The module-management example used `community.general.apache2_module` only for Debian but did not make the RHEL behavior explicit. Added a RHEL module list and assertions against `httpd -M`, since the Ansible module depends on Debian/SUSE-style `a2enmod` and `a2dismod` tools and is documented as not working on Red Hat-based distributions.
- The MPM example disabled only `mpm_prefork` before enabling `mpm_event`. Added `mpm_worker` to the disabled MPM list so the event MPM can be enabled cleanly if worker was active.
- The `a2enconf` tasks could change Apache configuration without notifying a restart when the copied file itself was unchanged. Added restart notifications to both `a2enconf security` and `a2enconf ssl-params`.
- The SSL and reverse proxy playbooks used Debian-only paths and commands without `when` guards. Added Debian guards so mixed Debian/RHEL inventories do not fail on `/etc/apache2`, `a2enconf`, `a2ensite`, or `apache2ctl` tasks.
- The reverse proxy template task did not notify Apache reload when the virtual host file changed. Added a reload notification.
- The WebSocket reverse proxy example used a rewrite rule after a catch-all proxy mapping. Replaced it with ordered `ProxyPass` / `ProxyPassReverse` mappings for `/ws/` before the catch-all `/` mapping, matching Apache proxy documentation.
- The verification playbook used `apache2ctl` for both Debian and RHEL. Added command variables so Debian uses `apache2ctl` and RHEL uses `httpd` with the appropriate config-test argument.

## Review Notes
The remaining configuration examples are intentionally Debian-focused for Apache layout and helper commands. Future improvements could add equivalent RHEL virtual host and SSL configuration paths, but the current examples now avoid failing on RHEL hosts by guarding Debian-specific tasks.
