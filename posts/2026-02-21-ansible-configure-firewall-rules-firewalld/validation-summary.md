# Validation Summary: How to Use Ansible to Configure Firewall Rules with firewalld

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.posix.firewalld
- firewalld
- firewall-cmd
- RHEL, CentOS, and Fedora firewall configuration
- YAML playbooks

## Sources Consulted
- Ansible Community Documentation: ansible.posix.firewalld module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- firewalld rich language manual page - https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld service configuration manual page - https://firewalld.org/documentation/man-pages/firewalld.service.html
- firewalld manual page - https://firewalld.org/documentation/man-pages/firewalld
- firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Red Hat Enterprise Linux documentation: Using and configuring firewalld - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks

## Issues Found
- The prerequisites mentioned Ansible 2.9+ but did not mention the managed-node `python-firewall` or `python3-firewall` bindings required by the `ansible.posix.firewalld` module. Updated the prerequisite to use a supported Ansible version with a compatible collection and added the target-host Python binding requirement.
- The text said to always use `permanent: true` and `immediate: true` together. This is useful for persistent rules that must also apply at runtime, but permanent-only and runtime-only operations are valid. Reworded the sentence to avoid overstating the requirement.
- The custom service example copied `/etc/firewalld/services/myapp.xml` and then enabled the service before firewalld had reloaded the new service definition. Added a `meta: flush_handlers` task so the reload handler runs before enabling the custom service.

## Review Notes
All YAML examples parse successfully after the corrections. The firewalld rich rule examples, port/service parameters, zone/source assignments, and `firewall-cmd` verification commands match the consulted official documentation.
