# Validation Summary: How to Automate Logging Configuration Using the logging RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- Rsyslog
- YAML inventory and playbooks

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Configuring logging by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/risk_reduction_and_recovery_operations/configuring-logging-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Using the logging system role, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_using-the-logging-system-role_security-hardening
- Red Hat Enterprise Linux 10 documentation: Preparing a control node and managed nodes to use RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/automating_system_administration_by_using_rhel_system_roles/preparing-a-control-node-and-managed-nodes-to-use-rhel-system-roles
- Red Hat Customer Portal: Red Hat Enterprise Linux (RHEL) System Roles, https://access.redhat.com/articles/3050101

## Issues Found
- The playbook referenced the role as `rhel-system-roles.logging`. Current Red Hat documentation uses the fully qualified collection role name `redhat.rhel_system_roles.logging`, so the playbook was updated accordingly.
- The playbook did not include the `logging_inputs`, `logging_outputs`, and `logging_flows` variables that the logging role uses to define the logging configuration. Added a minimal local logging configuration based on Red Hat's documented role variable model.
- The installation note said the roles are installed to `/usr/share/ansible/roles/`. Current Red Hat documentation states that the RPM installs the collection under `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/`, so the installation note was updated while keeping the documented README location for the logging role.
- The documentation lookup commands pointed to `/usr/share/doc/rhel-system-roles/logging/README.md`, which does not match the documented installed role README path. Updated the command to read `/usr/share/ansible/roles/rhel-system-roles.logging/README.md`.
- The verification commands used placeholder values, `systemctl status <service>` and `cat <config-file>`, which would not run correctly if copied literally. Replaced them with concrete rsyslog validation and inspection commands: `rsyslogd -N 1`, `systemctl status rsyslog`, and `cat /etc/rsyslog.conf`.

## Review Notes
The post now shows a minimal working logging role playbook. Future improvements could add a syntax-check step with `ansible-playbook --syntax-check configure-logging.yml` and a more specific logging scenario such as filtering messages or forwarding logs to a remote server.
