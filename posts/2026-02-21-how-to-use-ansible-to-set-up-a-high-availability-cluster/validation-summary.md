# Validation Summary: How to Use Ansible to Set Up a High Availability Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Keepalived
- VRRP
- HAProxy
- UFW
- Jinja2 templates
- YAML playbooks and inventory

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible privilege escalation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Keepalived official man page: https://www.keepalived.org/manpage.html
- HAProxy configuration manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy health check documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/

## Issues Found
- The Keepalived health check script used `curl`, but the role only installed `keepalived`. Updated the package installation task to install both `keepalived` and `curl`, using the documented `ansible.builtin.apt` list form for the `name` parameter.
- The Keepalived configuration used a VRRP `authentication` block and `auth_pass` variable. The official Keepalived man page notes that VRRP authentication was removed from the VRRPv2 specification and should be avoided because it is non-compliant, so the authentication block and unused variable were removed.
- The failover test playbook stopped and restarted HAProxy without privilege escalation. Added `become: yes` at the play level so the service-management tasks run with the root privileges required by typical Linux service managers.

## Review Notes
- The HAProxy configuration syntax for `stats enable`, `stats uri`, `stats auth`, `http-request return`, backend health checks, and server `check inter fall rise` parameters matches current HAProxy documentation.
- The `community.general.ufw` module supports `proto: vrrp` in current documentation, but this depends on using a recent enough `community.general` collection.
- The examples assume the Ansible control node can reach the private VIP and that the configured interface name, subnet mask, and firewall policy match the target environment.
