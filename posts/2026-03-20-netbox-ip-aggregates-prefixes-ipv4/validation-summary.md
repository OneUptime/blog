# Validation Summary: How to Create IP Aggregates and Prefixes in NetBox for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NetBox (IPAM module)
- NetBox REST API
- curl (HTTP client)
- IPv4 addressing / RFC 1918 private address space
- Bash shell

## Sources Consulted
- NetBox official documentation: https://docs.netbox.dev/
- NetBox IPAM data model: https://docs.netbox.dev/en/stable/models/ipam/
- NetBox REST API reference: https://docs.netbox.dev/en/stable/integrations/rest-api/
- NetBox API schema for `/api/ipam/rirs/`, `/api/ipam/aggregates/`, `/api/ipam/prefixes/`, `/api/ipam/roles/`
- RFC 1918 — Address Allocation for Private Internets

## Issues Found
- **Incorrect foreign-key format for `role` on prefix create**: The original Step 3 example wrote `"role": {"name": "web-tier"}`. The NetBox REST API expects foreign keys to be passed as the related object's primary key (integer ID) on write operations. Updated to `"role": 1` and added a brief comment explaining that foreign-key fields take the related object's primary key.

## Review Notes
- The IPAM hierarchy (RIR → Aggregate → Prefix → IP Address) is accurate; NetBox ships with "RFC 1918" available as a private RIR (with `is_private=true`), which is consistent with how the post uses it.
- API endpoints (`/api/ipam/rirs/`, `/api/ipam/aggregates/`, `/api/ipam/prefixes/`, `/api/ipam/prefixes/<id>/available-prefixes/`, `/api/ipam/roles/`) are correct.
- Field names verified: RIR (`name`, `slug`, `is_private`, `description`); Aggregate (`prefix`, `rir`, `description`); Prefix (`prefix`, `status`, `role`, `description`, `is_pool`, `custom_fields`); Role (`name`, `slug`).
- `status` values such as `active`, `reserved`, `deprecated`, `container` are valid prefix statuses.
- Port `localhost:8080` is shown as the API base — this is appropriate for the official NetBox Docker compose setup; production deployments will typically use the host configured via the reverse proxy.
- The web-UI navigation paths (`IPAM → RIRs → Add`, `IPAM → Prefixes → + Add`) match current NetBox UI conventions.
