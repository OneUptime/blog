# Validation Summary: How to Automate IPv6 Address Assignment with IPAM APIs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPAM
- NetBox REST API
- pynetbox
- Ansible `netbox.netbox` collection
- Ansible `ansible.utils.ipaddr` filter
- Terraform `e-breuninger/netbox` provider
- Bash automation with `curl`

## Sources Consulted
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox API & Integration overview: https://netbox.readthedocs.io/en/stable/features/api-integration/
- NetBox IP address model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- NetBox IPAM overview: https://netbox.readthedocs.io/en/feature/features/ipam/
- NetBox v2.1 release notes for `/available-ips/`: https://netbox.readthedocs.io/en/stable/release-notes/version-2.1/
- pynetbox IPAM documentation: https://pynetbox.readthedocs.io/en/stable/IPAM.html
- pynetbox endpoint documentation: https://pynetbox.readthedocs.io/en/stable/endpoint.html
- pynetbox response documentation: https://pynetbox.readthedocs.io/en/stable/response.html
- `netbox.netbox.netbox_ip_address` module docs: https://docs.ansible.com/projects/ansible/latest/collections/netbox/netbox/netbox_ip_address_module.html
- `ansible.utils.ipaddr` filter docs: https://docs.ansible.com/ansible/latest/collections/ansible/utils/ipaddr_filter.html
- Terraform provider docs overview: https://raw.githubusercontent.com/e-breuninger/terraform-provider-netbox/master/docs/index.md
- Terraform `netbox_available_ip_address` resource docs: https://raw.githubusercontent.com/e-breuninger/terraform-provider-netbox/master/docs/resources/available_ip_address.md
- Terraform `netbox_prefix` data source docs: https://raw.githubusercontent.com/e-breuninger/terraform-provider-netbox/master/docs/data-sources/prefix.md
- pynetbox auth header implementation: https://raw.githubusercontent.com/netbox-community/pynetbox/master/pynetbox/core/query.py
- NetBox Ansible collection README: https://github.com/netbox-community/ansible_modules

## Issues Found
- The Python example used the wrong `pynetbox` call pattern for `available-ips`, treated the returned object like a dictionary, and incorrectly claimed the allocation would be a `/128`. I changed it to `prefix_obj.available_ips.create(payload)`, read `available.address`, and corrected the explanation to match NetBox’s CIDR-based IP address model.
- The Ansible section referenced a `netbox.netbox.netbox_available_ip` module that is not present in current collection docs and used an undocumented `parent` parameter. I replaced it with the documented `netbox.netbox.netbox_ip_address` module, moved the prefix into `data.prefix`, and added `state: new` so the play allocates a fresh address.
- The Ansible inventory example used an unqualified `ipaddr` filter. I updated it to `ansible.utils.ipaddr('address')` to match current Ansible documentation.
- The Terraform example pinned an outdated provider major line without any NetBox version context and used `ignore_changes = [prefix_id]` with a misleading “prevent accidental address change” comment. I removed the stale version pin, removed the lifecycle block, and added a compatibility note so readers pin the provider to their NetBox release.
- The CI/CD script called an undefined `get_prefix_id` helper and used legacy `Authorization: Token` headers. I added a prefix lookup against `/api/ipam/prefixes/`, switched the curl examples to current bearer-token auth, and kept the documented `/available-ips/` POST allocation flow.
- The decommission snippet claimed to mark an address “available” while actually setting its status to `deprecated`, and its lookup example omitted the CIDR mask NetBox stores with IP addresses. I renamed the helper to `deprecate_ipv6_address`, used record-level `update(...)`, and corrected the example address to include `/64`.
- The conclusion overstated concurrency/atomicity behavior that is not explicitly documented in the public NetBox docs I checked. I reworded it to recommend requesting the next available IP directly from the IPAM system rather than implementing custom search logic.

## Review Notes
- The Terraform provider’s compatibility matrix is tied to specific NetBox versions. Confirm provider support for your NetBox release before running `terraform init`.
- In environments with overlapping prefixes across VRFs, the Python example may need an additional VRF filter to guarantee a unique prefix lookup.
