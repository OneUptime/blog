# Validation Summary: How to Use Ansible to Manage SQL Server on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and modules
- Microsoft SQL Server 2022 on Linux
- Ubuntu and RHEL package repositories
- SQL Server command-line tools (`sqlcmd`, `bcp`)
- `mssql-conf` server configuration
- SQL Server backup, login, user, and role management
- Linux kernel and service tuning with systemd and sysctl

## Sources Consulted
- Microsoft Learn: Installation guidance for SQL Server on Linux - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-setup
- Microsoft Learn: Ubuntu quickstart for SQL Server on Linux - https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-ubuntu
- Microsoft Learn: Configure repositories for SQL Server on Linux - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-change-repo
- Microsoft Learn: Configure SQL Server settings on Linux with `mssql-conf` - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-configure-mssql-conf
- Microsoft Learn: Install `sqlcmd` and `bcp` on Linux - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-setup-tools
- Microsoft Learn: SQL Server 2022 on Linux release notes and supported platforms - https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-release-notes-2022
- Microsoft Learn: SQL Server on Linux performance best practices - https://learn.microsoft.com/en-us/sql/linux/configure/performance-best-practices-operating-system
- Microsoft Learn: ODBC Driver connection encryption troubleshooting - https://learn.microsoft.com/en-gb/sql/connect/odbc/connection-troubleshooting
- Ansible documentation: `ansible.builtin.apt_key` module notes - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_key_module.html
- Ansible documentation: `ansible.builtin.dnf` module notes - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible 2.10 documentation: `ansible.builtin` collection - https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/index.html

## Issues Found
- The prerequisite listed Ansible 2.9+, but the examples use `ansible.builtin` FQCN syntax and `ansible.posix.sysctl`. Changed this to Ansible 2.10+ with the `ansible.posix` collection installed.
- The supported target OS line said Ubuntu 20.04+ and RHEL 8+, which incorrectly implies newer releases such as Ubuntu 24.04 are valid for SQL Server 2022. Changed it to Ubuntu 20.04 or 22.04, or RHEL 8 or 9 for SQL Server 2022.
- The Ubuntu installation example used deprecated `apt_key`. Replaced it with a keyring file downloaded by `ansible.builtin.get_url` and `signed-by` repository entries.
- The unattended `mssql-conf setup` command omitted `-n`. Added `-n` so the command uses environment variables non-interactively as documented by Microsoft.
- The SQL Server tools playbook could fail as a standalone playbook because it did not install the Microsoft signing key before adding the repository. Added the keyring setup there as well.
- The configuration playbook created data, log, and backup directories after running `mssql-conf` file-location commands. Moved directory creation before the configuration commands, matching Microsoft guidance.
- The TCP port task used a `changed_when` expression based on output text that is not documented and could prevent the restart handler from running after a real change. Changed it to always notify restart like the other `mssql-conf` tasks.
- The database role assignment command would error on repeated runs when a user was already a member of a role. Added a `sys.database_role_members` existence check before `ALTER ROLE ... ADD MEMBER`.
- The backup playbook referenced `mssql_databases` without defining it in the snippet. Added a local `mssql_databases` variable matching the earlier example databases.
- The RHEL section mentioned CentOS and YUM, but current SQL Server 2022 Linux support is for RHEL and current Ansible uses DNF on supported RHEL versions. Renamed the section and changed the package task to `ansible.builtin.dnf`.
- The memory tip said SQL Server consumes all available memory by default. Corrected it to the documented Linux default of 80% of physical memory.
- The `sqlcmd -C` tip attributed encryption defaults to SQL Server 2022. Corrected it to ODBC Driver 18, which enables encryption by default.
- The trace flag tip recommended trace flag 3979 broadly. Narrowed it to Microsoft's documented FUA-capable storage conditions and noted that most other Linux configurations should use the default trace flag 3982 behavior.

## Review Notes
The examples are now technically aligned with current Microsoft and Ansible documentation. Some tasks still use `changed_when: true` for simplicity, so the examples favor clarity over fully idempotent change reporting.
