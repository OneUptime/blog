# Validation Summary: How to Create IP Trie Dictionaries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL, dictionaries)
- IP_TRIE dictionary layout
- CIDR notation
- `dictGet`, `IPv4StringToNum`, `IPv6StringToNum` functions
- `system.dictionaries` system table
- `SYSTEM RELOAD DICTIONARY` command
- MaxMind GeoLite2 CSV

## Sources Consulted
- ClickHouse official documentation, Dictionary layouts overview: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts
- ClickHouse official documentation, ip_trie layout: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/layouts/ip-trie
- ClickHouse docs for CREATE DICTIONARY: https://clickhouse.com/docs/sql-reference/dictionaries
- ClickHouse docs for `IPv4StringToNum` / `IPv6StringToNum` functions (return `UInt32` and `FixedString(16)` respectively — match IP_TRIE's expected key input).

## Issues Found
- The prose said "Use `dictGetOrDefault` to look up a client IP address" while the code sample directly below it used `dictGet` (no default value was supplied). Updated the prose to read "Use `dictGet`" so the narrative matches the code. No other technical corrections were required.

## Review Notes
- The `tuple(IPv4StringToNum(...))` / `tuple(IPv6StringToNum(...))` wrapper is the historical form accepted by IP_TRIE dictionaries (where the key is a composite / tuple internally). Modern ClickHouse documentation now also shows passing the IP value directly (e.g. `dictGet(dict, attr, toIPv4('1.2.3.4'))`), but the tuple form still works and is the form most widely seen in the wild. No change needed.
- The MaxMind `GeoLite2-City-Blocks-IPv4.csv` file's native schema (`network,geoname_id,...`) does not match the illustrative `ip_to_geo(prefix, country, asn, org)` schema used in the post — a reader importing the raw MaxMind CSV would need to either adapt the table schema or transform the data. This is a reasonable simplification for a tutorial and is not technically wrong, but could be expanded in a future revision.
- Consider adding the `ACCESS_TO_KEY_FROM_ATTRIBUTES` note for readers who want to retrieve the matched CIDR prefix alongside the attributes — not needed for the examples as written, but a common follow-up question.
- When querying IPv6 addresses against a dictionary populated only with IPv4 CIDRs, readers should use IPv4-mapped form (e.g. `::ffff:1.2.3.4`) or keep the dictionary populated with IPv6 CIDRs. The blog keeps IPv4 and IPv6 examples separate which implicitly assumes each dictionary contains the appropriate prefixes.
