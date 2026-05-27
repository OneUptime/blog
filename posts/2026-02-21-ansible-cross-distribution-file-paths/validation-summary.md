# Validation Summary: How to Use Ansible to Handle Cross-Distribution File Paths

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules: include_vars, template, command, shell, set_fact, setup, debug, package, timezone, hostname, lineinfile, service, uri, fail, cron
- community.general.ufw
- Apache HTTP Server configuration on Debian/Ubuntu, RHEL/CentOS, and SUSE
- Linux configuration file paths for Nginx, PHP-FPM, MySQL, cron, rsyslog, and SSL material

## Sources Consulted
- Ansible include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible hostname module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Apache HTTP Server distribution default layout: https://cwiki.apache.org/confluence/display/HTTPD/DistrosDefaultLayout
- Red Hat Enterprise Linux 8 Apache HTTP Server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deploying_different_types_of_servers/setting-apache-http-server_deploying-different-types-of-servers
- SUSE Linux Enterprise Server 15 Apache HTTP Server documentation: https://documentation.suse.com/sles/15-SP7/html/SLES-all/cha-apache2.html

## Issues Found
- The Apache template derived `ServerRoot` with `{{ paths.apache.main_config | dirname | dirname }}`, which evaluates incorrectly for Debian/Ubuntu (`/etc` instead of `/etc/apache2`) and SUSE-style paths. Added explicit `paths.apache.server_root` values and updated the template to use them.
- The Apache examples appended `/error_log` and `/access_log` to `paths.apache.log_dir`, but Debian/Ubuntu defaults use `/var/log/apache2/error.log` and `/var/log/apache2/access.log`. Added explicit `error_log` and `access_log` variables for Debian and Red Hat path mappings, then updated the log command and template to use them.
- The RHEL Apache module example wrote new `LoadModule` files directly, which can duplicate packaged module-loading directives. Updated it to use `ansible.builtin.lineinfile` against the packaged module configuration files so existing directives are uncommented or replaced idempotently.
- The introduction described PHP's Debian path as a "config directory" while comparing it to the RHEL `php.ini` file. Reworded this to refer to the main ini file location.
- The "Common Use Cases" text referred to "this module" even though the post describes a variable-file pattern, not an Ansible module. Reworded those references to "this pattern."

## Review Notes
- Ansible was not installed in the local environment, so snippets were reviewed against official documentation rather than executed with `ansible-playbook --syntax-check`.
- Several paths in the common path table can vary by package version, enabled distribution repository, or installed service variant. The post now avoids deriving paths where the distributions differ in filename as well as directory.
