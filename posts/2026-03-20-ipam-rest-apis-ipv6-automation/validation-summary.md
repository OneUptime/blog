# Validation Summary: How to Use IPAM REST APIs for IPv6 Automation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IP address management (IPAM)
- NetBox REST API
- Python `requests`
- Terraform `e-breuninger/netbox` provider
- Ansible

## Sources Consulted
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox IP address model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- NetBox prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox v4.2 release notes: https://netbox.readthedocs.io/en/stable/release-notes/version-4.2/
- NetBox IPAM API views source: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/api/views.py
- NetBox IPAM serializers source: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/api/serializers_/ip.py
- NetBox API field serializer source: https://github.com/netbox-community/netbox/blob/main/netbox/netbox/api/fields.py
- Terraform provider overview: https://registry.terraform.io/providers/e-breuninger/netbox/latest/docs
- Terraform provider `netbox_available_ip_address` docs: https://github.com/e-breuninger/terraform-provider-netbox/blob/master/docs/resources/available_ip_address.md
- Terraform provider `netbox_prefix` data source docs: https://github.com/e-breuninger/terraform-provider-netbox/blob/master/docs/data-sources/prefix.md
- Terraform provider `netbox_available_ip_address` implementation: https://github.com/e-breuninger/terraform-provider-netbox/blob/master/netbox/resource_netbox_available_ip_address.go
- Ansible `ansible.builtin.uri` module docs: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `community.general.nmcli` module docs: https://docs.ansible.com/projects/ansible/latest/collections/community/general/nmcli_module.html
- Ansible `ansible.utils.ipaddr` filter docs: https://docs.ansible.com/ansible/latest/collections/ansible/utils/ipaddr_filter.html

## Issues Found
- The NetBox `available-ips` examples posted `description`, `dns_name`, and `status` directly to `/available-ips/`. Current NetBox allocates the address first and then validates metadata on the created IP object. I updated the Python and Ansible examples to allocate the IP and then PATCH the resulting `ip-addresses` record.
- The Python `create_prefix()` example used the old `site` field on prefixes. NetBox v4.2 replaced that field with `scope_type` and `scope_id`, so I updated the example to look up the site and send `dcim.site` plus `scope_id`.
- The Terraform snippet pinned `e-breuninger/netbox` to `~> 3.0`, which targets older NetBox versions. I updated it to the current `~> 5.0` provider line and added a minimal provider configuration block so the snippet is complete.
- The Ansible example used the legacy unqualified `ipaddr` filter and short `nmcli` module name. I updated them to `ansible.utils.ipaddr` and `community.general.nmcli` to match current Ansible documentation.
- The post description implied DNS record creation, but the NetBox example only writes the IP object's `dns_name` metadata. I corrected the description and conclusion to reflect that actual behavior.
- The API auth examples used legacy `Token` syntax. I updated them to the current v2 `Bearer` token format documented by NetBox.

## Review Notes
- The Terraform NetBox provider is version-sensitive. Current provider docs list tested support through NetBox 4.4.x, so readers should align the provider version with the NetBox version they are running.
- NetBox still supports legacy v1 API tokens as of April 30, 2026, but current REST API documentation recommends v2 tokens and notes that v1 support will be removed in a future release.
- The `ansible.utils.ipaddr` filter requires the `ansible.utils` collection and the `netaddr` Python package on the controller.
