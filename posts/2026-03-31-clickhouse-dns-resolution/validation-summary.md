# Validation Summary: How to Configure ClickHouse DNS Resolution Settings

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- ClickHouse (DNS cache, `system.dns_cache`, `system.clusters`, SYSTEM commands, `config.xml` server settings)
- DNS / resolv.conf (ndots, search, timeout, attempts)
- Kubernetes headless Services and pod DNS (`*.svc.cluster.local`)
- `dig` CLI
- `clickhouse-client` CLI

## Sources Consulted
- ClickHouse Server Configuration Parameters: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse `system.dns_cache` table: https://clickhouse.com/docs/en/operations/system-tables/dns_cache
- ClickHouse `system.clusters` table: https://clickhouse.com/docs/en/operations/system-tables/clusters
- ClickHouse SYSTEM statements (DROP DNS CACHE): https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse "Other" functions (hostName, FQDN): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- resolv.conf(5) semantics for `ndots` / `search` / `timeout` / `attempts`

## Issues Found
1. **Incorrect DNS cache "TTL" claim.** The post stated "The default cache TTL is one minute," which contradicted its own later (correct) statement that the default `dns_cache_update_period` is 15 seconds. ClickHouse's internal DNS cache is refreshed periodically, not TTL-evicted. Rewrote the sentence to: cached entries are refreshed every 15 seconds in the background.
2. **Non-existent SQL function `resolveIpAddressToHostname(ip)`.** ClickHouse has no function by that name, and `system.clusters` has no `ip` column. Replaced the debug query with the documented columns `host_name` and `host_address` from `system.clusters`, which already expose the DNS-resolved address used by ClickHouse.
3. **Incorrect explanation of `ndots:2`.** The prior wording ("prevents unnecessary FQDN lookups for short hostnames with two dots") had the semantics backwards. Per resolv.conf(5), `ndots:N` means names with N or more dots are tried as absolute first, skipping the search list. Rewrote the sentence to reflect that.

## Review Notes
- `system.dns_cache`, `SYSTEM DROP DNS CACHE`, `dns_cache_update_period`, `dns_cache_max_entries`, and `disable_internal_dns_cache` are all real and current as of recent ClickHouse versions. The documented defaults cited (15 seconds, 10000 entries) match the configuration parameters exposed by the server.
- The Kubernetes headless-Service DNS form (`<pod>.<svc>.<ns>.svc.cluster.local`) is correct for StatefulSet pods.
- The post does not specify a ClickHouse version; `dns_cache_max_entries` is a relatively recent server setting, so on older ClickHouse versions only `dns_cache_update_period` / `disable_internal_dns_cache` may be available. A future revision could note this.
- `FQDN()` (available since 20.1) could be mentioned alongside `hostName()` for completeness, but its absence is not an error.
