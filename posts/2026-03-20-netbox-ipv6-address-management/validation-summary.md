# Validation Summary: How to Configure NetBox for IPv6 Address Management

## Status
validated

## Post Type
Tutorial / Guide (step-by-step walkthrough with code examples)

## Technologies Covered
- NetBox (IPAM and DCIM platform)
- pynetbox (Python NetBox API client)
- IPv6 addressing (aggregates, /48 site prefixes, /64 VLAN prefixes, /128 host addresses)
- NetBox REST API (custom fields, prefixes, IP addresses, available_prefixes endpoint)
- Django manage.py shell (ORM access via `ipam.models`)

## Sources Consulted
- [pynetbox IPAM documentation — available_prefixes DetailEndpoint](https://pynetbox.readthedocs.io/en/latest/IPAM.html)
- [NetBox issue #15277 — content_types/content_type rename to object_types/object_type](https://github.com/netbox-community/netbox/issues/15277)
- [NetBox v4.0 plugin migration guide — ContentType to ObjectType change](https://netboxlabs.com/docs/netbox/plugins/development/migration-v4/)
- [NetBox CustomField model documentation](https://netboxlabs.com/docs/netbox/customization/custom-fields/)

## Issues Found

1. **Step 4 — Incorrect `available_prefixes` endpoint usage.** The post called `nb.ipam.prefixes.available_prefixes.list(parent.id)` and `nb.ipam.prefixes.available_prefixes.create(parent.id, {...})`. In pynetbox, `available_prefixes` is a `DetailEndpoint` exposed on the prefix Record itself, not on the prefixes endpoint. Fixed to use `parent.available_prefixes.list()` and `parent.available_prefixes.create({...})`, matching the documented pynetbox usage.

2. **Step 5 — Same `available_prefixes` invocation error.** Replaced `nb.ipam.prefixes.available_prefixes.list(parent.id)` with `parent.available_prefixes.list()`. Also changed the iteration to `block.prefix` (attribute access on the returned Record) since pynetbox returns IPRecord objects rather than raw dicts.

3. **Step 6 — Outdated `content_types` field name.** NetBox 4.0 (May 2024) renamed the `content_types` ManyToMany field on `CustomField` to `object_types` as part of the broader ContentType→ObjectType refactor. Since this post is dated 2026 and would target a current NetBox release, both `nb.extras.custom_fields.create({...})` calls were updated from `"content_types"` to `"object_types"`.

## Review Notes
- The `available_prefixes` API is described in the conclusion as enabling allocation "without conflict checking" — the underlying NetBox API actually does perform conflict checking; the value is that allocation is *atomic*. The phrasing is slightly imprecise but not strictly wrong, so it was left as-is to preserve the author's voice.
- The pynetbox `.get()` calls in Step 2 (e.g. `nb.ipam.vlans.get(name=vlan_name, site="headquarters")`) and Step 3 (`nb.dcim.interfaces.get(device_id=device.id, name="Loopback0")`) will raise `ValueError` if more than one record matches. They are correct for unique results, which the example assumes.
- The `is_pool` field on Prefix is still valid in NetBox 4.x.
- The `parent` filter on `ip_addresses.filter(parent="...", family=6)` is a valid NetBox API filter.
- The Django shell example in Step 1 uses ORM-level model creation, which bypasses some NetBox business logic (e.g. signals); this is fine for bootstrap but the REST API path is generally preferable for production scripts.
