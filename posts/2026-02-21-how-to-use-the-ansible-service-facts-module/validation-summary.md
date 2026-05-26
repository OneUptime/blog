# Validation Summary: How to Use the Ansible service_facts Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.service_facts
- ansible.builtin.systemd_service
- ansible.posix.firewalld
- ansible.builtin.iptables
- Jinja2 filters in Ansible playbooks
- Linux service managers: systemd, SysV init, upstart, OpenRC, AIX SRC

## Sources Consulted
- Ansible service_facts module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible firewalld module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible iptables module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/iptables_module.html
- Jinja template designer documentation for filters and tests: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The post said each service entry includes whether the service is enabled at boot. The official `service_facts` documentation states that `status` is returned only for systemd, Red Hat/SUSE-flavored sysvinit/upstart, and OpenBSD services, so the wording was changed to "when that status is available."
- The post described `service_facts` as working with "other service managers" without naming the currently documented supported init systems. The wording was updated to list the supported systems from the official documentation: systemd, SysV init, upstart, OpenRC, and AIX SRC.
- The Nginx example said it only configured Nginx if it was installed and running, but the `when` condition only checked that `nginx.service` existed. The condition now also checks that the service state is `running`.
- The PostgreSQL example said it checked whether the service was running and enabled, but the code only checked the running state. The debug and failure examples now check both `state: running` and `status: enabled`.
- The examples used `ansible.builtin.systemd`. The official documentation says this is now an alias of `ansible.builtin.systemd_service`, so the examples were updated to the current FQCN.
- The firewall example used `ansible.builtin.firewalld`, but the current firewalld module is `ansible.posix.firewalld`. The FQCN was corrected.

## Review Notes
The `service_facts` output can include services known to systemd even when they are not installed, often with `status: not-found`. The post's presence checks are acceptable for introductory examples, but production playbooks may want to reject `status: not-found` explicitly when distinguishing installed services from systemd-known units.
