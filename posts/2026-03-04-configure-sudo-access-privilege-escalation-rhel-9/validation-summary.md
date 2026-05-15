# Validation Summary: How to Configure sudo Access and Privilege Escalation on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sudo
- sudoers
- visudo
- Linux user and group administration
- systemd service management commands
- Linux logging with `/var/log/secure` and `journalctl`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing sudo access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings
- sudo manual: https://www.sudo.ws/docs/man/sudo.man/
- sudoers manual: https://www.sudo.ws/docs/man/sudoers.man/
- sudoers timestamp manual: https://www.sudo.ws/docs/man/sudoers_timestamp.man/
- Local `sudo(8)`, `sudoers(5)`, and `visudo(8)` man pages and `sudo --help` / `visudo --help` output

## Issues Found
- The sudo flow diagram showed NOPASSWD execution before checking whether the requested command was allowed. I changed the diagram so command authorization is checked before password handling and execution.
- The "Test a command without running it" example used `sudo -v`, which validates or refreshes cached credentials but does not test a specific command. I changed it to `sudo -l /usr/bin/systemctl restart httpd`, matching the documented `sudo -l [command [arg ...]]` behavior.

## Review Notes
- The representative sudoers snippets were syntax-checked with `visudo -c -f -` and parsed successfully.
- The wildcard examples are syntactically valid, but sudoers wildcards in command arguments can match whitespace. In production, administrators should prefer exact command arguments or regular expressions for tighter command restrictions.
