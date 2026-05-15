# Validation Summary: How to Monitor Docker Containers with Zabbix on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Docker Engine
- Zabbix Agent 2
- Zabbix Docker monitoring plugin
- Zabbix templates, UserParameters, and trigger expressions
- SELinux

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Zabbix Documentation: Zabbix agent 2 item keys - https://www.zabbix.com/documentation/current/en/manual/config/items/itemtypes/zabbix_agent/zabbix_agent2
- Zabbix Documentation: Docker plugin configuration parameters - https://www.zabbix.com/documentation/current/en/manual/appendix/config/zabbix_agent2_plugins/d_plugin
- Zabbix Documentation: Built-in Agent 2 plugins - https://www.zabbix.com/documentation/8.0/en/manual/concepts/agent2/builtin_plugins
- Zabbix Integrations: Docker by Zabbix agent 2 template - https://www.zabbix.com/integrations/docker
- Zabbix Documentation: User parameters - https://www.zabbix.com/documentation/8.0/en/manual/config/items/userparameters
- Zabbix Official Repository for RHEL 9 packages - https://repo.zabbix.com/zabbix/7.4/stable/rhel/9/x86_64/

## Issues Found
- The Docker installation command assumed `docker-ce` was already available from configured repositories. Docker's RHEL documentation requires installing `dnf-plugins-core`, adding Docker's RHEL repository, and installing the Docker Engine package set. Updated the prerequisites command block accordingly.
- The Zabbix installation command included `zabbix-agent2-plugin-docker`, but current Zabbix documentation lists Docker as a built-in Agent 2 plugin and the current RHEL 9 Zabbix repository does not provide a separate Docker plugin package. Updated the command to install `zabbix-agent2` from the Zabbix repository.
- The local test command used the old `docker.data_usage` key. Current Zabbix documentation lists the key as `docker.data.usage`. Updated the command.
- The SELinux section suggested `setsebool -P zabbix_can_network 1` for Docker socket access. That boolean controls network access and is not the appropriate fix for Unix socket denials against `/var/run/docker.sock`. Replaced it with AVC inspection and local policy generation commands.

## Review Notes
The Zabbix Docker template name, Agent 2 Docker socket access requirement, Docker plugin endpoint setting, container discovery/stat/info keys, UserParameter syntax, and example trigger expression style are consistent with the official documentation. The Zabbix repository example now targets RHEL 9 and should be adjusted for RHEL 8 or RHEL 10 hosts.
