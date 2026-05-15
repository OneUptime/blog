# Validation Summary: How to Manage Firewalld Rules with Ansible on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible
- ansible.posix.firewalld
- firewalld
- firewall-cmd
- YAML

## Sources Consulted
- Ansible Community Documentation: ansible.posix.firewalld module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible Community Documentation: ansible.builtin.dnf module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html
- Ansible Community Documentation: ansible.builtin.systemd / systemd_service module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_module.html
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- Red Hat Enterprise Linux 9 documentation, Configuring firewalls and packet filters: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/

## Issues Found
- The custom-zone example created `internal-apps` as a permanent zone and notified a reload handler, but then immediately tried to assign an interface and services to that zone with `immediate: true`. The Ansible firewalld module documentation notes that newly created permanent zones require a firewalld reload before immediate operations can use them. Added a `meta: flush_handlers` task after zone creation so the reload happens before later zone operations.
- The default-zone task used `changed_when: false` even though `firewall-cmd --set-default-zone=public` can change both runtime and permanent configuration. Added a read task using `firewall-cmd --get-default-zone` and made the set task conditional so change reporting remains accurate.
- The verification comments described `--list-all-zones` as active zones and `--list-rich-rules` as all rich rules. firewalld documents `--list-all-zones` as listing all zones, while `--list-rich-rules` without `--zone` applies to the default zone. Updated the comments to match actual command behavior.

## Review Notes
The Ansible examples use `ansible.builtin.systemd`, which is currently a documented redirect/alias to `ansible.builtin.systemd_service`; it still works, but future examples could use `ansible.builtin.systemd_service` directly. The managed hosts also need the `ansible.posix` collection available on the controller and the firewalld Python bindings on the managed node; Ansible documents those bindings as usually provided by the OS firewalld package.
