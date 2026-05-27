# Validation Summary: How to Use Ansible to Configure firewalld

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ansible
- ansible.posix.firewalld module
- firewalld
- firewall-cmd
- firewalld rich rules
- firewalld custom service XML files
- RHEL, CentOS, and Fedora firewall configuration

## Sources Consulted
- Ansible Community Documentation: ansible.posix.firewalld module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- firewalld rich language manual page - https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld zone manual page - https://firewalld.org/documentation/man-pages/firewalld.zone
- firewall-cmd manual page - https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The tutorial used a custom `management` zone but did not create configured zones before assigning interfaces, services, ports, and rich rules. I added an `ansible.posix.firewalld` zone creation task and a reload step before immediate zone changes, matching the Ansible module documentation for zone transactions.
- The default zone task used `firewall-cmd --set-default-zone` with a `changed_when` check for `ZONE_ALREADY_SET`, which is not a reliable idempotence check. I changed it to read the current default zone first and only run the command when the configured zone differs.
- The zone diagram referred to a `trusted` zone with full access while the working variables defined a `management` zone with SSH and monitoring access. I aligned the diagram with the configuration.
- The custom service template included the file path as a literal `#` line inside an XML/Jinja2 template, which would render invalid XML. I changed it to a Jinja2 comment.
- The port forwarding rich rule always rendered `to-addr=""` when no destination address was provided. Since firewalld treats `to-addr` as an optional address attribute, I changed the snippet to emit `to-addr` only when `item.dest_addr` is defined.

## Review Notes
The examples rely on the `ansible.posix` collection and the `python-firewall` or `python3-firewall` bindings on managed hosts, as documented by the Ansible module. The post is technically valid after the fixes.
