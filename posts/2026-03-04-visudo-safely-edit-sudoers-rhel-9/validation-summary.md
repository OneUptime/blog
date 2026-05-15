# Validation Summary: How to Use visudo Safely to Edit Sudoers Configuration on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- sudo
- visudo
- sudoers configuration
- polkit/pkexec recovery path

## Sources Consulted
- Local `visudo(8)` manual page for sudo 1.9.15p5.
- Local `sudoers(5)` manual page for sudoers syntax, aliases, defaults, editor handling, include directories, and strict checking.
- Official Sudo Project `visudo(8)` manual: https://www.sudo.ws/docs/man/1.9.14/visudo.man/
- Official Sudo Project `sudoers(5)` manual: https://www.sudo.ws/docs/man/sudoers.man/
- Red Hat Enterprise Linux 9 documentation, "Managing sudo access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings

## Issues Found
- The post stated that `visudo` uses vi by default. The sudo documentation describes editor selection as policy/configuration-driven through the `editor` and `env_editor` sudoers settings, with environment variables considered depending on policy. I changed the wording to say `visudo` uses the configured editor and is often vi on RHEL.
- The post described `visudo -c -f /etc/sudoers.d/webadmins` as checking the file as a standalone policy. That is broadly true for alternate-file parsing, but the `visudo(8)` manual warns that checking an individual include file is not sufficient because the policy is evaluated in its entirety. I clarified that the command can miss problems that only appear when the full policy is evaluated and that `sudo visudo -c` should be used for the full policy.

## Review Notes
- I validated the sudoers examples with `visudo -c -f` using temporary files. The valid rule, alias, Defaults, and automation examples parsed successfully; the intentionally broken examples failed as expected.
- `pkexec visudo` is a plausible recovery path when polkit is installed and policy allows authentication, but availability and authorization vary by system.
