# Validation Summary: How to Use Ansible to Install and Configure Zabbix

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Zabbix Server, frontend, and Agent 2
- PostgreSQL
- Nginx
- PHP-FPM
- Ubuntu package installation

## Sources Consulted
- Zabbix 7.0 package installation documentation: https://www.zabbix.com/documentation/7.0/en/manual/installation/install_from_packages
- Zabbix 7.0 server configuration parameters: https://www.zabbix.com/documentation/7.0/en/manual/appendix/config/zabbix_server
- Zabbix 6.4 package installation documentation for comparison: https://www.zabbix.com/documentation/6.4/en/manual/installation/install_from_packages/debian_ubuntu
- Zabbix 6.4 server configuration parameters for comparison: https://www.zabbix.com/documentation/6.4/en/manual/appendix/config/zabbix_server
- Zabbix Agent 2 configuration parameters: https://www.zabbix.com/documentation/6.4/en/manual/appendix/config/zabbix_agent2
- Zabbix lifecycle and release policy: https://www.zabbix.com/life_cycle_and_release_policy
- Zabbix official 7.0 Ubuntu repository listing: https://repo.zabbix.com/zabbix/7.0/ubuntu/
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html

## Issues Found
- The post used Zabbix 6.4 as the default version. Zabbix 6.4 is no longer listed as a currently supported release in Zabbix's lifecycle policy, so the examples now default to Zabbix 7.0 LTS.
- The Zabbix repository package URLs used the older `zabbix-release_{{ version }}-1+ubuntu...` package naming. Updated them to the current `zabbix-release_latest_{{ version }}+ubuntu...` package naming used for the 7.0 LTS Ubuntu repository.
- The PostgreSQL schema check connected as the Zabbix database user without specifying `login_host`, while the import command uses `psql -h localhost`. Added `login_host: "{{ zabbix_db_host }}"` so the Ansible check uses the same password-authenticated connection path.
- The frontend role tried to manage a generic `php-fpm` systemd service. Ubuntu Zabbix package instructions restart versioned PHP-FPM services, so the post now defines `zabbix_php_fpm_service` and uses it in the systemd task.

## Review Notes
The examples remain Ubuntu-focused and assume the Zabbix packages support the target Ubuntu release selected by `ansible_distribution_version`. The PHP-FPM default now covers Ubuntu 22.04 and 24.04; other Ubuntu releases may need an explicit `zabbix_php_fpm_service` override.
