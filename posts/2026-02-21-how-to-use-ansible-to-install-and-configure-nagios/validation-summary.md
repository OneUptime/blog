# Validation Summary: How to Use Ansible to Install and Configure Nagios

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Nagios Core
- Nagios Plugins
- NRPE
- Apache HTTP Server
- Ubuntu/Debian package management
- systemd

## Sources Consulted
- Nagios Core source installation documentation: https://library.nagios.com/docs/nagios-core/getting-started/Nagios-Core-Installing-Nagios-Core-From-Source
- Nagios Core GitHub releases and source tree: https://github.com/NagiosEnterprises/nagioscore
- Nagios Core object definition documentation: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/objectdefinitions.html
- Nagios Core macro documentation: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/macros.html
- Nagios Plugins release information: https://nagios-plugins.org/nagios-plugins-2-4-11-released/
- Nagios Plugins check_ping documentation: https://nagios-plugins.org/doc/man/check_ping.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible handler documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Apache htpasswd documentation: https://httpd.apache.org/docs/current/en/programs/htpasswd.html
- Ubuntu package metadata for nagios-nrpe-server, nagios-nrpe-plugin, monitoring-plugins-basic, and monitoring-plugins-standard

## Issues Found
- The post pinned Nagios Core 4.4.14 and Nagios Plugins 2.4.8. Updated the examples to Nagios Core 4.5.12 and Nagios Plugins 2.4.11 to match current upstream releases and official installation guidance.
- The Apache setup enabled only the CGI module. Updated the task to enable both `rewrite` and `cgi`, matching the Nagios Core source installation documentation.
- The custom command template overwrote `objects/commands.cfg`, which would remove default Nagios commands used by the stock templates. Changed it to write only the custom NRPE command to `objects/nrpe-commands.cfg` and add that file to `nagios.cfg`.
- The command template duplicated default `check_http`, `check_ssh`, and `check_ping` commands that Nagios installs with its sample configuration. Removed those duplicate definitions from the custom template.
- The handler validated Nagios configuration with `changed_when: false`, so its chained reload handler would not run after configuration changes. Changed it to report changed after successful validation so the reload handler is notified.
- The NRPE defaults used `check_mem`, but the Ubuntu monitoring plugin packages shown in the post do not provide a `check_mem` plugin. Replaced the memory check with `check_swap`, which is included in `monitoring-plugins-basic`.
- The NRPE task notified `Restart nrpe`, but the post did not define that handler. Added the missing handler snippet.

## Review Notes
The examples assume Debian/Ubuntu-style package names, Apache module tooling, service names, and plugin paths. They should be adapted before use on RHEL-family distributions or other platforms.
