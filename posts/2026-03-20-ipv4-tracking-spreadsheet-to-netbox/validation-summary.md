# Validation Summary: How to Migrate from Spreadsheet-Based IPv4 Tracking to NetBox or phpIPAM

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- NetBox
- phpIPAM
- IPv4 address management (IPAM)
- CSV import workflows
- REST APIs
- Python (`requests`, `csv`, `ipaddress`)

## Sources Consulted
- NetBox bulk import documentation: https://netbox.readthedocs.io/en/stable/getting-started/populating-data/
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox IPAM overview: https://netbox.readthedocs.io/en/feature/features/ipam/
- NetBox Prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox IPAddress model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/
- NetBox change logging documentation: https://netbox.readthedocs.io/en/stable/features/change-logging/
- NetBox miscellaneous configuration (`ENFORCE_GLOBAL_UNIQUE`): https://netbox.readthedocs.io/en/stable/configuration/miscellaneous/
- phpIPAM API reference: https://www.phpipam.net/api/api_reference/
- phpIPAM API documentation: https://www.phpipam.net/api-documentation/
- phpIPAM feature list: https://phpipam.net/documents/features/

## Issues Found
- The sample CSV block included `# ip-inventory.csv` inside the fenced `csv` example. That is not valid CSV and would break `csv.DictReader`, so I removed the line.
- The NetBox prefix creation example used the old `site` field shape. Current NetBox documentation shows that `site` on prefixes was replaced by `scope` in v4.2, and the REST API example uses `scope_type` and `scope_id`, so I updated the payload accordingly and kept `vlan` as a related-object ID.
- The NetBox IP import example hardcoded `/24` for every address. I changed it to derive the prefix length from the CSV `subnet` column so the example works for mixed subnet sizes.
- The phpIPAM API example parsed CSV with `IFS=,` in Bash and hardcoded a single `subnetId` for every row. That is not reliable CSV parsing and would misplace addresses from multiple subnets, so I replaced it with a Python example that authenticates via the documented `/user/` endpoint, looks up each subnet by CIDR, and then creates the address with the documented `subnetId`, `ip`, `hostname`, and `description` parameters.
- The NetBox validation command checked a `.prefix` field on IP address objects and only examined the first 1000 results. NetBox models IP hierarchy automatically rather than exposing a writable `prefix` field on IP address objects in the shown API workflow, so I replaced that section with a paginated validation script that compares the CSV against imported addresses and checks for duplicates.
- The comparison table overstated a couple of cross-product capabilities. I narrowed `Duplicate detection` to `Built-in validation/tools` and `DNS/DHCP integration` to `Via API/integrations` so the statements stay accurate across both NetBox and phpIPAM.

## Review Notes
- NetBox examples in the post now align with current stable documentation, including the post-v4.2 prefix scope model.
- The examples still use placeholder IDs, URLs, and credentials; in a real deployment the referenced site, VLAN, and phpIPAM subnets must already exist or be created earlier in the migration workflow.
- The examples use `http://` placeholders for brevity. In practice, API tokens and Basic Auth credentials should be sent over HTTPS.
