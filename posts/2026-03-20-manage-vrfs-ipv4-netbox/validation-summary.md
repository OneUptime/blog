# Validation Summary: How to Manage VRFs for IPv4 in NetBox

## Status
validated

## Post Type
Guide

## Technologies Covered
- NetBox
- NetBox REST API
- VRF
- IPv4
- IPAM
- MPLS VPN route targets

## Sources Consulted
- NetBox VRF documentation: https://netbox.readthedocs.io/en/stable/models/ipam/vrf/
- NetBox IP address documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- NetBox route target documentation: https://netbox.readthedocs.io/en/stable/models/ipam/routetarget/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox REST API filtering documentation: https://netbox.readthedocs.io/en/stable/reference/filtering/
- NetBox VRF model source: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/models/vrfs.py
- NetBox IPAM filterset source: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/filtersets.py
- NetBox VRF serializer source: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/api/serializers_/vrfs.py

## Issues Found
- Updated the API authentication examples from `Authorization: Token <TOKEN>` to `Authorization: Bearer <TOKEN>`. Current NetBox REST API documentation recommends v2 tokens with the `Bearer` scheme; `Token` is the legacy v1 format.
- Changed the VRF lookup example to query by the unique route distinguisher (`rd`) and extract the first result's ID with Python instead of grepping for `"id"`. VRF names are not unique in NetBox, so filtering by name can return multiple objects.
- Changed the global-table filter example from `?vrf=null` to `?vrf_id=null` to use the explicit VRF foreign-key filter supported by NetBox list endpoints.
- Replaced the hardcoded route target ID `1` with `<ROUTE_TARGET_ID>`. NetBox object IDs are assigned dynamically, so assuming `1` is not portable.
- Corrected the `enforce_unique` comment so it matches NetBox's current VRF model behavior and help text more closely.

## Review Notes
- NetBox accepts related objects in write requests by numeric ID, so the `vrf` field usage in the POST and PATCH examples is valid.
- The post does not pin a NetBox version, but the corrected API examples align with current stable NetBox documentation as reviewed on 2026-04-29.
