# Validation Summary: How to Allocate IPv6 Addresses to Virtual Machines

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SLAAC
- DHCPv6
- Kea DHCPv6
- NetBox IPAM
- pynetbox
- Terraform
- libvirt Terraform provider
- cloud-init
- Python

## Sources Consulted
- RFC 4862, Stateless Address Autoconfiguration in IPv6: https://www.ietf.org/rfc/rfc4862
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 7217, Stable and Opaque IIDs with SLAAC: https://datatracker.ietf.org/doc/html/rfc7217
- RFC 8981, Temporary Address Extensions for SLAAC: https://datatracker.ietf.org/doc/html/rfc8981
- Kea DHCPv6 server and host reservation documentation: https://kea.readthedocs.io/en/kea-2.7.5/arm/dhcp6-srv.html
- NetBox IP address model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- NetBox virtual machine model documentation: https://netbox.readthedocs.io/en/stable/models/virtualization/virtualmachine/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- pynetbox endpoint and response documentation: https://pynetbox.readthedocs.io/en/stable/endpoint.html and https://pynetbox.readthedocs.io/en/stable/response.html
- Terraform NetBox provider docs and resource references: https://github.com/e-breuninger/terraform-provider-netbox/tree/master/docs/resources
- Terraform libvirt provider docs and examples: https://github.com/dmacvicar/terraform-provider-libvirt/tree/main/docs/resources and https://github.com/dmacvicar/terraform-provider-libvirt/tree/main/examples
- cloud-init network configuration and NoCloud documentation: https://docs.cloud-init.io/en/latest/topics/network-config.html, https://docs.cloud-init.io/en/latest/reference/network-config-format-v2.html, and https://docs.cloud-init.io/en/24.2/reference/datasources/nocloud.html
- cloud-init hostname configuration examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/set_hostname.html

## Issues Found
- The post treated SLAAC as inherently MAC-derived and predictable. I corrected the explanation to distinguish generic SLAAC from the specific modified EUI-64 case and noted that router advertisements are required.
- The SLAAC Python example was broken in two ways: it used an invalid IPv6 prefix literal (`2001:db8:vms::/64`) and attempted to parse the EUI-64 interface ID as an invalid IPv6 string. I replaced the prefix with a valid documentation prefix and fixed the interface-ID-to-integer conversion.
- The static IPAM strategy incorrectly claimed NetBox allocates a `/128`. I changed this to “next available IPv6 address from a prefix,” which matches NetBox’s IP address model and allocation behavior.
- The Kea DHCPv6 example claimed to reserve by DUID but actually used `hw-address`, and it placed `reservations` at the wrong level. I rewrote it as a valid `subnet6` reservation example using DUIDs, valid IPv6 literals, and a config-test command before restart.
- The NetBox `pynetbox` example used record access patterns that do not match current `pynetbox` docs (`available["address"]`) and set `primary_ip6` without assigning the IP to a VM interface first. I updated it to use `Record` attributes, assign the IP to a `virtualization.vminterface`, validate the interface/VM relationship, and then set the VM’s primary IPv6.
- The Terraform example pinned an old NetBox provider series without any NetBox version context and used outdated libvirt provider syntax. I removed the stale NetBox version pin, added the libvirt provider explicitly, and updated the libvirt resources to current documented patterns using `libvirt_cloudinit_disk`, `libvirt_volume`, and the current `libvirt_domain` schema.
- The cloud-init example was technically incorrect because it attempted to configure networking through user-data. Cloud-init’s docs state user-data cannot change instance networking. I converted the example to a proper NoCloud `network-config` template, removed the incorrect top-level `network:` wrapper, and replaced deprecated `gateway6` usage with a default route.
- The bulk NetBox allocation script used outdated `pynetbox` record indexing. I updated it to use attribute access and added a prefix existence check.

## Review Notes
- The NetBox Terraform provider version should be matched to the deployed NetBox release; the original hard-coded `~> 3.0` pin was too version-specific and outdated for a generic guide.
- The libvirt example now assumes a bootable disk already exists for each VM via `var.vm_disk_names`; this keeps the snippet focused on IPv6 allocation while remaining consistent with the current provider model.
- Local verification covered the corrected Python syntax, the corrected SLAAC output, and JSON syntax for the Kea reservation example. `terraform validate` was not run because Terraform is not installed in this workspace.
