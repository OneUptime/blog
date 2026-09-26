# Validation Summary: How to Turn NetBox into the Source of Truth for Ansible and Nornir Inventories

## Status

validated

## Post Type

Technical guide with Ansible inventory configuration, CLI inspection commands, and a Python inventory exporter.

## Technologies Covered

- NetBox REST API, device records, filters, authentication, and pagination
- Ansible and the netbox.netbox inventory collection
- Cisco IOS and Arista EOS network collections and network_cli
- Nornir SimpleInventory and Netmiko platform identifiers
- Python, Requests, PyYAML, ipaddress, pathlib, and urllib.parse

## Sources Consulted

- NetBox REST API, authentication, and pagination: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox filtering: https://netbox.readthedocs.io/en/stable/reference/filtering/
- NetBox device names and primary address preference: https://netbox.readthedocs.io/en/stable/models/dcim/device/
- Ansible NetBox inventory plugin reference (collection 3.23.0): https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/nb_inventory_inventory.html
- Official inventory plugin implementation, including raw-record composition, token templating, host naming, and virtual chassis handling: https://raw.githubusercontent.com/netbox-community/ansible_modules/v3.23.0/plugins/inventory/nb_inventory.py
- Ansible inventory CLI: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible EOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_eos.html
- Nornir inventory documentation: https://nornir.readthedocs.io/en/latest/tutorial/inventory.html
- Official Netmiko device-type dispatch table: https://raw.githubusercontent.com/ktbyers/netmiko/develop/netmiko/ssh_dispatcher.py
- Requests sessions and certificate verification: https://requests.readthedocs.io/en/latest/user/advanced/
- Requests response and request APIs: https://requests.readthedocs.io/en/latest/api/
- Python IP address interfaces: https://docs.python.org/3/library/ipaddress.html
- Python URL parsing and joining: https://docs.python.org/3/library/urllib.parse.html
- Python filesystem paths: https://docs.python.org/3/library/pathlib.html
- PyYAML safe serialization: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found

1. **Address-family selection differed between the supplied consumers.** The exporter explicitly preferred IPv4, while the Ansible plugin inherited NetBox's primary address preference, normally IPv6. Added an explicit IPv4-first `ansible_host` composition with IPv6 fallback and explained the default behavior. Both examples now implement the stated address policy.
2. **Direct inventory did not enforce the full naming contract.** `strict: true` does not detect globally duplicated names or reject unnamed devices. Clarified that selected names must be validated before direct inventory use; repeated names can merge and unnamed records can receive generated UUIDs. This prevents treating strict composition as complete source-data validation.
3. **Virtual chassis could produce different target sets even without concurrent changes.** The plugin skips non-master members when a master exists, whereas the exporter includes all selected devices. Documented this difference and the requirement to tag the intended chassis management target consistently.
4. **The authentication prerequisite was underspecified.** Clarified that v2 tokens require NetBox 4.5 or later and that `NETBOX_TOKEN` must contain the complete `nbt_<key>.<token>` value.

## Review Notes

- Confirmed that composition receives the raw device record; `platform.slug` is valid even with the plugin's default plural host-variable presentation. The platform mappings, token dictionary, query filters, group names, and inventory CLI flags are supported.
- Confirmed that the exporter follows pagination before writing output, strips prefix lengths while preserving the host address, checks HTTPS pagination origin, disables redirects, and emits the three SimpleInventory YAML mappings. Credentials remain separate from generated device inventory.
- Executed the extracted exporter with mocked HTTP responses in temporary directories. Verified two-page export, dual-stack IPv4 preference, IPv6-only fallback, and all three output files. Verified rejection of duplicate names, empty names, missing primary IPs, unsupported platforms, empty inventory, and a pagination URL on another origin, without creating output files.
- Parsed the Python and YAML snippets and evaluated the Ansible composition expressions with Jinja2. These checks passed. No live NetBox instance, Ansible inventory execution, or device connection was available; this was documentation/source review plus isolated exporter verification, not an end-to-end deployment test.
- Current NetBox documentation marks v1 tokens deprecated starting in 4.6, with removal planned for 5.0. The examples use v2 authentication.
- A multi-page API read is not a database transaction snapshot. The generated files freeze the retrieved target set, but deployments must still implement the stated approval, freshness, and digest checks. A failed export must stop the job rather than permit reuse of files from an earlier run.
- Source URLs embedded in the post resolve to the intended documentation. No sections were added or reorganized in the post.
