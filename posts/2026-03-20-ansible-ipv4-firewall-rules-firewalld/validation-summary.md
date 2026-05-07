# Validation Summary: How to Use Ansible to Configure IPv4 Firewall Rules with firewalld

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- `ansible.posix.firewalld`
- `firewalld`
- `firewall-cmd`
- Linux firewall zones
- IPv4 rich rules and source bindings

## Sources Consulted
- Ansible Community Documentation: `ansible.posix.firewalld` module: https://docs.ansible.com/projects/ansible/12/collections/ansible/posix/firewalld_module.html
- firewalld manual page for `firewall-cmd`: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld rich language documentation: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- firewalld default zone documentation: https://firewalld.org/documentation/zone/default-zone.html
- firewalld connections, interfaces, and sources documentation: https://firewalld.org/documentation/zone/connections-interfaces-and-sources

## Issues Found
- The post reloaded firewalld before later `permanent: yes` examples, so those later interface, rich rule, source binding, and port-removal examples would not take effect immediately. I added `immediate: yes` to those later `ansible.posix.firewalld` tasks so the examples now match the post's runtime-application guidance.
- The default-zone example used `firewall-cmd --set-default-zone=dmz` with `changed_when: false`, which hid changes but still executed on every run. I changed it to query the current default zone first with `firewall-cmd --get-default-zone` and run the setter only when the zone is not already `dmz`, making the example idempotent.
- The post described the article as configuring IPv4 firewall rules, but the basic service and port examples are zone-level firewalld rules rather than IPv4-only matches. I clarified that explicit IPv4 matching is done with rich rules using `family='ipv4'` and with IPv4 source bindings.
- The post omitted a managed-node prerequisite from the Ansible module documentation. I added that the target hosts need the firewalld Python bindings installed (`python3-firewall` or `python-firewall`, depending on the distribution).

## Review Notes
- The Ansible module documentation notes that `ansible.posix.firewalld` requires `python-firewall` or `python3-firewall` on managed nodes.
- The module documentation also notes that it is not tested on Debian-based systems, so distro-specific package names and behavior should be checked if this guide is adapted beyond the RHEL/Fedora family.
- `firewall-cmd --set-default-zone` is documented as a runtime and permanent change.
