# Validation Summary: How to Generate IPv6 Address Allocation Reports

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- NetBox
- pynetbox
- Python 3
- CSV reporting
- HTML reporting

## Sources Consulted
- NetBox Prefix model documentation - https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox v4.2 release notes - https://netbox.readthedocs.io/en/feature/release-notes/version-4.2/
- NetBox REST API filtering reference - https://netbox.readthedocs.io/en/stable/reference/filtering/
- NetBox REST API overview - https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox IPAddress model documentation - https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- pynetbox endpoint documentation - https://pynetbox.readthedocs.io/en/stable/endpoint.html
- pynetbox IPAM documentation - https://pynetbox.readthedocs.io/en/stable/IPAM.html
- Official NetBox source, `netbox/ipam/filtersets.py` - https://github.com/netbox-community/netbox/blob/master/netbox/ipam/filtersets.py
- Official pynetbox source, `pynetbox/core/response.py` - https://github.com/netbox-community/pynetbox/blob/master/pynetbox/core/response.py

## Issues Found
- The report generator and CSV export treated `p.prefix` as a parsed network object and used `.prefixlen`. In current `pynetbox`, scalar fields from the API remain scalar values, so this would fail for prefix strings. I changed both snippets to parse the prefix with `ipaddress.ip_network(...).prefixlen`.
- The report generator filtered existing child prefixes with `prefix_length=64`. In current NetBox, `prefix_length` is used for `available-prefixes` creation, while prefix filtering uses `mask_length`. I changed the filter to `mask_length=64`.
- The snippets used `p.site` on prefix records. Current NetBox documentation and release notes show that the `site` field on `ipam.Prefix` was replaced by `scope` in NetBox v4.2. I updated the Python, CSV, and HTML examples to use `p.scope` and adjusted the visible labels from Site to Scope.
- The generated timestamp used `datetime.now()` but labeled the output as `UTC`. That prints local time, not UTC. I changed it to `datetime.now(timezone.utc)`.
- The `/48` reclamation logic only checked for child `/64` prefixes, which could misclassify a prefix as unused even when it had other child prefixes, IP ranges, or IP addresses. I updated the logic to check for child prefixes, IP ranges, and IP addresses before flagging a prefix as potentially unused.
- The CSV export only counted used IPs for prefixes `/64` or longer, which could undercount valid allocations in larger IPv6 prefixes. I changed it to count child IP addresses for any prefix.
- The conclusion referred specifically to `/48` prefixes with no child `/64` allocations. After correcting the report logic to look for child allocations more generally, I updated that sentence to match the corrected behavior.

## Review Notes
- The corrected examples target current NetBox behavior, including the NetBox v4.2+ `scope` field on prefixes. Older NetBox deployments may still use `site`, but that is no longer current documentation.
- NetBox's static docs do not enumerate every filter parameter on each endpoint. Where the docs were not explicit, I confirmed filter names such as `mask_length` and `parent` against the current official NetBox source and validated that `pynetbox` supports passing those filters through `filter()` and `count()`.
