# Validation Summary: How to Use NetBox REST API to Automate IPv4 Address Allocation

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- NetBox (IPAM/DCIM platform)
- NetBox REST API
- pynetbox (official Python client)
- Python 3
- curl
- IPv4 / CIDR prefixes

## Sources Consulted
- NetBox v4.0 release notes — https://netboxlabs.com/docs/netbox/release-notes/version-4.0
- NetBox REST API authentication docs — https://netboxlabs.com/docs/netbox/integrations/rest-api/
- NetBox REST API filtering reference — https://netboxlabs.com/docs/netbox/reference/filtering/
- NetBox IPAddressFilterSet source — https://github.com/netbox-community/netbox/blob/master/netbox/ipam/filtersets.py
- NetBox issue #15292 (removal of obsolete `device_role`) — https://github.com/netbox-community/netbox/issues/15292
- pynetbox IPAM docs — https://pynetbox.readthedocs.io/en/latest/IPAM.html
- pynetbox `models/ipam.py` source — https://github.com/netbox-community/pynetbox/blob/master/pynetbox/models/ipam.py
- pynetbox `core/response.py` (Record dict-access) — https://github.com/netbox-community/pynetbox/blob/master/pynetbox/core/response.py

## Issues Found
1. **`device_role` field on Device create — incorrect for NetBox 4.x.** The `provision_server` example used `device_role=device_role.id` when creating a device. The `device_role` field was renamed to `role` on the Device model in NetBox 3.6 and the legacy `device_role` REST API serializer field was removed entirely in NetBox 4.0 (issue #15292). The example was edited to use `role=device_role.id`, which works on current NetBox 4.x.

A pre-existing edit in the working tree (the API token UI path "Click your username (top-right) → API Tokens → + Add Token") was verified against current NetBox docs and is correct for NetBox 4.x.

## Review Notes
- `available[0]["address"]` works because pynetbox's `Record` class implements `__getitem__` via `dict(self)[k]`, but the documented idiom is attribute access (`available[0].address`). Left as-is since it is functionally correct and the author's style.
- `prefix.available_ips.list()` is paginated/capped (default ~50 results) and is not race-safe under concurrent provisioning. The race-safe alternative is `prefix.available_ips.create({...})`, which atomically allocates the next IP server-side. Not changed since the post is a tutorial illustrating the listing approach.
- Filter `?parent=10.100.1.0/24` on `/api/ipam/ip-addresses/` is valid — confirmed via `IPAddressFilterSet.parent` (a `MultiValueCharFilter` calling `search_by_parent`).
- Status slug strings (`status="active"`) are accepted on write by pynetbox/NetBox even though the API returns a `{value, label}` object on read.
- `assigned_object_type="dcim.interface"` and `assigned_object_id` are the correct field names for assigning an IP to an interface.
- `nb.dcim.device_types.get(slug="generic-server")` is correct; the post assumes a device type with that slug already exists in NetBox (worth noting for readers, but not a technical error).
