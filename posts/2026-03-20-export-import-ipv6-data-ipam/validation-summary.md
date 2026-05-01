# Validation Summary: How to Export and Import IPv6 Address Data in IPAM

## Status
validated

## Post Type
Guide

## Technologies Covered
- NetBox
- pynetbox
- phpIPAM
- Python
- Python `ipaddress`
- Python `requests`
- Bash
- CSV
- JSON
- IPv6
- IPAM

## Sources Consulted
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox Prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox VLAN documentation: https://netbox.readthedocs.io/en/stable/models/ipam/vlan/
- pynetbox documentation: https://pynetbox.readthedocs.io/en/stable/
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- NetBox official source for current prefix serializer fields: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/api/serializers_/ip.py
- NetBox official source for current prefix/VLAN filter fields: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/filtersets.py
- phpIPAM official source showing API subnet/address transformation to dotted notation: https://github.com/phpipam/phpipam/blob/master/api/controllers/Common.php

## Issues Found
- The NetBox export example used `prefix.prefix.prefixlen`, but `pynetbox` exposes the prefix field as the API's CIDR string. I changed this to derive the prefix length from the CIDR string so the example matches current `pynetbox` behavior.
- The prefix export/import examples used the old NetBox `site` field. Current NetBox uses `scope_type` and `scope_id`, and the Prefix model documentation notes that `scope` replaced `site` in NetBox v4.2. I updated the CSV fields and the import logic to export and re-apply scope metadata correctly.
- The CSV column named `vlan_id` was actually exporting the VLAN's `vid`, not the NetBox object ID, and importing by `vid` alone can be ambiguous because VLANs are scoped. I renamed the field to `vlan_vid`, added `vlan_group`, and updated the import logic to disambiguate grouped VLANs.
- The original prefix export/import flow dropped VRF information, which can cause incorrect duplicate detection and failed migrations when the same prefix exists in multiple VRFs. I added `vrf_rd` export/import handling and updated duplicate checks to compare both prefix and VRF.
- The phpIPAM migration example used static token authentication over `http://`, but phpIPAM's API documentation requires SSL for static authentication. I changed the phpIPAM URL to `https://` and added `raise_for_status()` to fail cleanly on API errors.
- The validation shell script passed a literal `$NETBOX_TOKEN` string into Python because the here-document was quoted. I changed the Python snippet to read `NETBOX_TOKEN` from the environment and added `raise_for_status()` for the validation request.
- The validation script said it was checking a random sample, but it actually requested the first page of results. I corrected the wording to match the code.
- The conclusion said to normalize both IPv6 addresses and prefixes with `ipaddress.ip_network()`. That is incorrect for host addresses because it discards host bits. I updated the conclusion to use `ipaddress.ip_network()` for prefixes and `ipaddress.ip_interface()` when normalizing host addresses with prefix lengths.

## Review Notes
- The examples still assume that related objects such as VRFs, scopes, VLAN groups, and tags already exist in the target NetBox instance; the scripts resolve and attach them, but they do not create those dependencies.
- The validation script checks one page of API results (`limit=100`). A full production validation for very large datasets would need pagination or repeated requests.
