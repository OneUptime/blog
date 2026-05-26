# Validation Summary: How to Use Ansible to Manage Firewall Zones

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.posix.firewalld
- firewalld
- firewall-cmd
- Linux firewall zones
- YAML

## Sources Consulted
- Ansible Community Documentation: ansible.posix.firewalld module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- firewalld manual page: firewall-cmd: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld manual page: firewalld.zones: https://firewalld.org/documentation/man-pages/firewalld.zones
- firewalld zone documentation: predefined zones: https://firewalld.org/documentation/zone/predefined-zones.html
- firewalld zone documentation: default zone: https://firewalld.org/documentation/zone/default-zone.html
- firewalld concepts documentation: https://firewalld.org/documentation/concepts.html

## Issues Found
- The basic setup playbook used `ansible.posix.firewalld` with only `zone` and `state: enabled` to prepare the default zone. The module documentation states zone creation/deletion uses `state: present` or `state: absent`, and the default zone is managed with `firewall-cmd --set-default-zone`. Changed the snippet to check the current default zone and run `firewall-cmd --set-default-zone` only when needed.
- The custom zone playbook used a raw `firewall-cmd --new-zone` task with `failed_when: false` and an `ALREADY_ENABLED` check that does not match firewalld's zone-name conflict behavior. Replaced zone creation with `ansible.posix.firewalld` using `state: present` and `permanent: true`, and made the reload conditional on zone creation or target changes before immediate rule operations.
- The custom zone playbook included descriptions in the data model but did not apply them. Added a `firewall-cmd --set-description` task so the shown configuration is actually used.
- The role defaults defined `firewall_base_rich_rules`, but the role tasks never applied them. Added an `ansible.posix.firewalld` task to apply the base rich rules.
- The role defaulted `firewall_role` to `base`, but the role-specific loops indexed `firewall_role_configs[firewall_role]`, which can fail when `base` is not a configured role. Changed the loops to use `firewall_role_configs.get(firewall_role, {})`.
- The practical tip referred to testing with `--runtime`, but `firewall-cmd` runtime changes are made by omitting `--permanent`; there is no `--runtime` flag. Updated the wording for both Ansible and `firewall-cmd`.
- The zone overview implied every interface is explicitly assigned to a zone. firewalld uses the default zone when no explicit connection, interface, or source binding exists, so the explanation was corrected.
- The block zone summary said `icmp-prohibited`; firewalld documents IPv4 `icmp-host-prohibited` and IPv6 `icmp6-adm-prohibited`. The diagram was generalized to avoid the incorrect ICMP type.
- The introduction described firewalld support as built into Ansible. The examples use `ansible.posix.firewalld`, so the wording now refers to Ansible's ansible.posix collection.

## Review Notes
The examples assume the relevant firewalld service names exist on the managed hosts. firewalld requires services passed to `service:` or `--add-service` to be present in `firewall-cmd --get-services`; custom service definitions may be needed on some distributions for names such as `prometheus-node-exporter`.
