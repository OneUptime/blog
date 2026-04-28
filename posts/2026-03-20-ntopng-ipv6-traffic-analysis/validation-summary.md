# Validation Summary: How to Use ntopng for IPv6 Traffic Analysis

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ntopng (network traffic analysis tool)
- nProbe (NetFlow/IPFIX probe with ZMQ export)
- IPv6 traffic monitoring
- ntopng REST API v2
- Python (`requests` library)
- Bash / curl
- ZeroMQ flow export
- Ubuntu/Debian and RHEL/CentOS package managers

## Sources Consulted
- ntopng CLI options: https://www.ntop.org/guides/ntopng/cli_options/cli_options.html
- ntopng config example: https://www.ntop.org/guides/ntopng/cli_options/cli_options_example.html
- ntopng REST API v2 reference: https://www.ntop.org/guides/ntopng/api/rest/api_v2.html
- ntopng REST endpoint source: https://github.com/ntop/ntopng/tree/dev/scripts/lua/rest/v2/get
- nProbe CLI options: https://www.ntop.org/guides/nprobe/cli_options.html
- ntop package repository: https://packages.ntop.org/apt-stable/22.04/all/

## Issues Found

1. **Outdated `--dump-flows` modes.** The post listed `logstash`, `mysql`, and `nindex` as valid values. `mysql` and `nindex` were removed in favor of ClickHouse, and `logstash` was never a `--dump-flows` mode. Updated the comment to list the currently supported modes (`syslog`, `clickhouse`).

2. **Non-existent REST endpoint `/lua/rest/v2/get/host/top.lua`.** This endpoint does not exist in the ntopng REST v2 API. Replaced both the `curl` example and the Python `get_ipv6_top_hosts` function with the documented `/lua/rest/v2/get/host/active.lua` endpoint, using `sortColumn=traffic&sortOrder=desc` to obtain the top-by-traffic ordering the post intends.

3. **Non-existent REST endpoint `/lua/rest/v2/get/interface/l4/protocols.lua`.** This endpoint does not exist. The Python `get_ipv6_protocol_breakdown` function now uses `/lua/rest/v2/get/interface/data.lua` (a documented endpoint) and walks the `stats` map for IPv6-prefixed keys, which matches the pattern shown earlier in the post.

4. **Invalid nProbe flag `--ipv4-only no`.** nProbe has no `--ipv4-only` option; both IPv4 and IPv6 are captured by default, and `-W` is the documented flag to *disable* IPv6. Removed the invalid flag and added a brief comment noting that IPv6 is on by default.

5. **Incorrect nProbe template syntax `--template "@NTOPNG"`.** The documented form is `-T "@NTOPNG@"` (note the trailing `@` and the short flag). Updated the command accordingly.

## Review Notes

- The `sortColumn=column_bytes` parameter previously used for the host listing is not a documented column for `host/active.lua`; the fix replaces it with the documented `traffic` column. If the user is on an older ntopng release, the column names may differ — the v2 API has been stable since ntopng 5.x.
- The `--geoip-dir` option is still documented and valid in current ntopng releases, so it was left as-is.
- The `version=6` query parameter is correct for the `host/active.lua` endpoint (the `field;op` semicolon syntax applies only to the historical-flows/alerts query API).
- The web UI navigation hints in the "Key IPv6 Metrics" section reflect the labels in the ntopng community web interface and are general enough to remain accurate across recent versions.
- The package URL `https://packages.ntop.org/apt-stable/22.04/all/apt-ntop-stable.deb` was verified to be live and current.
