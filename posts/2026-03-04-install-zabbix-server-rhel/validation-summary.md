# Validation Summary: How to Install Zabbix Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Zabbix Server 7.0 LTS
- Zabbix Agent 2
- MySQL
- Nginx
- PHP-FPM
- firewalld

## Sources Consulted
- Zabbix 7.0 installation from packages: https://www.zabbix.com/documentation/7.0/en/manual/installation/install_from_packages
- Zabbix 7.0 web interface installation: https://www.zabbix.com/documentation/7.0/en/manual/installation/frontend
- Zabbix 7.0 requirements and default ports: https://www.zabbix.com/documentation/7.0/en/manual/installation/requirements
- Zabbix official RHEL 9 package repository: https://repo.zabbix.com/zabbix/7.0/rhel/9/x86_64/
- Zabbix 7.0 RHEL package contents for `zabbix-nginx-conf`, `zabbix-web-deps`, `zabbix-server-mysql`, and `zabbix-sql-scripts` from the official repository.

## Issues Found
- The Nginx section replaced the packaged `/etc/nginx/conf.d/zabbix.conf` file with a minimal custom server block. That omitted the access-deny rules shipped by the official `zabbix-nginx-conf` package for sensitive frontend paths. I changed the commands to uncomment and update the packaged `listen` and `server_name` directives instead.
- The PHP timezone command searched for a commented `php_value[date.timezone]` line, but the packaged RHEL 9 Zabbix PHP-FPM pool does not include that line by default. I changed the command to update the setting when present or append it when absent.
- The firewall section described TCP port `10051` as the Zabbix agent port. Zabbix documents `10050` for agent/agent 2 and `10051` for server/proxy/trapper. I corrected the comment to identify `10051` as the Zabbix server/trapper port.

## Review Notes
The repository URL, Zabbix package names, MySQL schema import path, Zabbix server database password setting, service names, default web login, and basic verification commands were consistent with the Zabbix 7.0 RHEL packages reviewed. The guide uses a sample database password inline; a future hardening pass should recommend replacing it with a site-specific secret.
