# Validation Summary: How to Use Ansible to Manage Palo Alto Firewalls

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Palo Alto Networks PAN-OS
- Palo Alto Networks `paloaltonetworks.panos` Ansible collection
- PAN-OS XML/API authentication
- Ansible Vault
- YAML playbooks
- Panorama

## Sources Consulted
- Palo Alto Networks Ansible Collection documentation: https://paloaltonetworks.github.io/pan-os-ansible/
- `paloaltonetworks.panos.panos_security_rule` module documentation: https://paloaltonetworks.github.io/pan-os-ansible/modules/panos_security_rule_module.html
- `paloaltonetworks.panos.panos_nat_rule2` module documentation: https://paloaltonetworks.github.io/pan-os-ansible/modules/panos_nat_rule2_module.html
- `paloaltonetworks.panos.panos_export` module documentation: https://paloaltonetworks.github.io/pan-os-ansible/modules/panos_export_module.html
- `paloaltonetworks.panos.panos_address_object` module documentation: https://paloaltonetworks.github.io/pan-os-ansible/modules/panos_address_object_module.html
- `paloaltonetworks.panos.panos_address_group` module documentation: https://paloaltonetworks.github.io/pan-os-ansible/modules/panos_address_group_module.html
- `paloaltonetworks.panos.panos_commit_firewall` module documentation: https://paloaltonetworks.github.io/pan-os-ansible/modules/panos_commit_firewall_module.html
- `paloaltonetworks.panos.panos_type_cmd` module documentation: https://paloaltonetworks.github.io/pan-os-ansible/modules/panos_type_cmd_module.html
- Palo Alto Networks PAN-OS NAT documentation: https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-networking-admin/nat

## Issues Found
- The prerequisites listed Ansible 2.10 or later, but the current `paloaltonetworks.panos` collection documentation lists Python 3.10 or higher and ansible-core 2.16 or higher as environment requirements. Updated the prerequisite accordingly.
- The NAT example used legacy `panos_nat_rule` parameter names such as `rule_name`, `source_zone`, `destination_zone`, `source_ip`, `destination_ip`, and `snat_type`. Updated the example to use `panos_nat_rule2` with current parameters such as `name`, `from_zones`, `to_zones`, `source_addresses`, `destination_addresses`, and `source_translation_type`.
- The backup example disabled fact gathering but referenced `ansible_date_time.date`, which would be undefined. It also copied `export_result.stdout`, but the `panos_export` module writes exports to the configured `filename`; `stdout` is documented for directory listings. Updated the task to write the exported configuration directly to the desired backup path using a date lookup.
- The production tips recommended `commit: false` on individual module calls. The current module docs mark `commit` as deprecated and recommend dedicated commit modules. Updated the tip to avoid the deprecated option and use commit modules explicitly.

## Review Notes
- The post remains accurate as a practical PAN-OS automation tutorial after the fixes. The examples assume the referenced zones, interfaces, rules, and backup directory already exist in the target environment.
