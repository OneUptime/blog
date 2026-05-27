# Validation Summary: How to Use Ansible to Configure Syslog Forwarding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, roles, inventory, and built-in modules
- rsyslog client forwarding and server receiving
- syslog-ng client forwarding
- Syslog over TCP and UDP
- Linux firewall rules with iptables
- logrotate

## Sources Consulted
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible inventory pattern documentation: https://docs.ansible.com/projects/ansible-core/devel/inventory_guide/intro_patterns.html
- rsyslog `omfwd` forwarding module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog `imtcp` input module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog `imudp` input module documentation: https://docs.rsyslog.com/doc/configuration/modules/imudp.html
- rsyslog `omfile` output module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfile.html
- rsyslog configuration formats and RainerScript documentation: https://docs.rsyslog.com/doc/configuration/conf_formats.html
- syslog-ng network destination documentation: https://syslog-ng.github.io/admin-guide/070_Destinations/150_Network/000_Network_destination_options.html
- syslog-ng tcp/udp to network destination migration documentation: https://syslog-ng.github.io/admin-guide/070_Destinations/320_tcp_tcp6_udp_udp6/000_Convert_tcp_udp_to_network_destination

## Issues Found
- The introduction claimed every Linux distribution ships with a syslog variant. This was too broad for modern systems that may rely on systemd-journald unless syslog integration is installed, so it was narrowed to "many Linux systems" and "most Linux distributions".
- The compliance paragraph said PCI DSS and HIPAA mandate centralized log retention. That was too absolute, especially for HIPAA, so it was changed to say centralized logging helps prove audit review, retention, and access control.
- The rsyslog client used legacy `@`/`@@` forwarding and legacy `$ActionQueue...` statements. Current rsyslog documentation recommends explicit `action(type="omfwd" ...)` RainerScript with action queue parameters, so the template was updated.
- The rsyslog client said disk-assisted queuing ensures logs are not lost. Queuing reduces loss risk but cannot guarantee zero loss in every failure mode, so the wording was softened.
- The rsyslog server role notified `Restart rsyslog server` without showing a matching handler. A handler snippet was added.
- The rsyslog server firewall task opened only TCP even when `syslog_protocol` could be UDP or both. It was split into conditional TCP and UDP iptables tasks.
- The rsyslog server template always loaded TCP input even when UDP-only forwarding was selected. TCP input is now conditional, matching UDP and both modes.
- The rsyslog server template used legacy `$template` and `?Template` dynamic-file syntax. It was replaced with a modern list `template(...)` object and `action(type="omfile" dynaFile="RemoteLogs")`; hostname and program path segments now use secure path replacement.
- The syslog-ng client used obsolete `tcp()` and `udp()` destination drivers. The template now uses the current `network()` destination with `transport("tcp")` or `transport("udp")`.
- The syslog-ng disk buffer used option names that current documentation has replaced (`mem-buf-size` and `disk-buf-size`). These were updated to `flow-control-window-bytes` and `capacity-bytes`.
- The verification playbook searched for `syslog` or `logger.log`, but the rsyslog server template writes the test tag to `ansible-verify.log`. The grep path was corrected.
- The debug playbook used `ansible.builtin.command` with a shell pipe. Since `command` does not process shell metacharacters, that task now uses `ansible.builtin.shell`.
- The logrotate postrotate command used a Debian/Ubuntu-specific rsyslog helper path. It was changed to send rsyslog a HUP through systemd, which is less distribution-specific on systemd-based hosts.

## Review Notes
Ansible was not installed in the local environment, so local `ansible-doc` and `ansible-playbook --syntax-check` validation could not be run. The examples were reviewed against official Ansible, rsyslog, and syslog-ng documentation instead. The role still assumes Debian-style `syslog` and `adm` users/groups for `/var/log/remote`; a production role for mixed Debian/RHEL fleets should make those owner/group values distribution-specific.
